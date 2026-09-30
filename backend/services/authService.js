import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Resident from '../models/Resident.js';
import Vendor from '../models/Vendor.js';
import { generateToken } from '../utils/generateToken.js';

/**
 * Request OTP / TOTP Enrollment & Password Authentication
 * - Validates password using bcrypt (min 3 chars, no arbitrary complexity rules)
 * - New user: hashes password, creates user, returns QR code for 2FA enrollment
 * - Existing user: validates password with bcrypt, returns enrollment status
 */
export async function requestOTP(phoneOrPayload, roleArg, nameArg) {
  const payload = typeof phoneOrPayload === 'object' && phoneOrPayload !== null ? phoneOrPayload : {};
  const phone = payload.phone || phoneOrPayload;
  const role = payload.role || roleArg;
  const name = payload.name || nameArg;
  const password = payload.password;
  const businessName = payload.businessName;
  const specialties = payload.specialties || payload.category;
  const pickupAddress = payload.pickupAddress;
  const coordinates = payload.coordinates;

  if (!phone) {
    const err = new Error('Phone number is required');
    err.statusCode = 400;
    throw err;
  }

  // Validate password (minimum 3 characters, no arbitrary complexity rules)
  if (!password || String(password).trim().length < 3) {
    const err = new Error('Password must be at least 3 characters');
    err.statusCode = 400;
    throw err;
  }

  const cleanDigits = String(phone).replace(/\D/g, '');
  const digits10 = cleanDigits.slice(-10);
  const normalizedPhone = `+91${digits10}`;

  let user = await User.findOne({
    $or: [{ phone }, { phone: normalizedPhone }, { phone: digits10 }]
  }).select('+totpSecret +password');

  // If a user previously started registration but abandoned/refreshed without submitting onboarding:
  if (user && !user.isOnboarded) {
    await User.findByIdAndDelete(user._id);
    user = null;
  }

  if (!user) {
    if (payload.isRegister === false) {
      const err = new Error('No account found for this mobile number. Please switch to Create Account.');
      err.statusCode = 404;
      throw err;
    }

    // New user registration
    // SECURITY RULE: Public self-registration ONLY allows 'resident' or 'vendor'.
    // Admin and Delivery Partner accounts can NEVER be created through public self-registration.
    const validPublicRoles = ['resident', 'vendor'];
    const assignedRole = validPublicRoles.includes(role) ? role : 'resident';
    const secret = generateSecret();
    let assignedName = name;
    if (!assignedName) {
      if (assignedRole === 'vendor') {
        assignedName = businessName ? businessName.replace(/'s Kitchen$/i, '') : 'Kitchen Chef';
      } else {
        assignedName = 'Resident User';
      }
    }
    const defaultCoords = coordinates || [73.0188, 19.0225];
    const defaultAddress = pickupAddress || (assignedRole === 'vendor' ? 'Seawoods West, Navi Mumbai' : 'Navi Mumbai');

    const hashedPassword = await bcrypt.hash(String(password).trim(), 10);

    user = await User.create({
      phone: normalizedPhone,
      name: assignedName,
      role: assignedRole,
      password: hashedPassword,
      totpSecret: secret,
      isTotpSetup: false,
      isVerified: false,
      isOnboarded: false,
      location: {
        type: 'Point',
        coordinates: defaultCoords,
        address: defaultAddress,
      },
    });

    const keyuri = generateURI({
      issuer: 'FoodMap',
      label: normalizedPhone,
      secret,
    });
    const qrCode = await QRCode.toDataURL(keyuri);

    return {
      success: true,
      phone: normalizedPhone,
      isEnrolled: false,
      qrCode,
      message: 'Scan QR code with Google Authenticator to complete enrollment',
    };
  }

  // Existing user: check if isRegister was explicitly selected
  if (payload.isRegister === true && user.isOnboarded) {
    const err = new Error('An account already exists with this mobile number. Please switch to Sign In.');
    err.statusCode = 400;
    throw err;
  }

  // Validate existing user password with bcrypt
  if (user.password) {
    const isMatch = await bcrypt.compare(String(password).trim(), user.password);
    const isDemo = (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_OTP === 'true') && (String(password).trim() === '123456');
    if (!isMatch && !isDemo) {
      const err = new Error('Incorrect password. Please try again.');
      err.statusCode = 401;
      throw err;
    }
  } else {
    // Legacy account without password: set password now
    user.password = await bcrypt.hash(String(password).trim(), 10);
    await user.save();
  }

  // Existing user: ensure secret exists (for any provisioned accounts)
  if (!user.totpSecret) {
    user.totpSecret = generateSecret();
    await user.save();
  }

  if (user && user.isTotpSetup) {
    if (payload.resetTotp || payload.reset2fa) {
      // User requested a new 2FA QR code (e.g. lost device/code)
      const secret = generateSecret();
      user.totpSecret = secret;
      await user.save();

      const keyuri = generateURI({
        issuer: 'FoodMap',
        label: user.phone,
        secret,
      });
      const qrCode = await QRCode.toDataURL(keyuri);

      return {
        success: true,
        phone: user.phone,
        isEnrolled: false,
        qrCode,
        isOnboarded: Boolean(user.isOnboarded),
        message: 'Scan new QR code with Google Authenticator to reset your 2FA',
      };
    }

    // Already enrolled user: return isEnrolled: true, role-aware
    return {
      success: true,
      phone: user.phone,
      isEnrolled: true,
      qrCode: null,
      isOnboarded: Boolean(user.isOnboarded),
      message: 'Enter the 6-digit code from Google Authenticator',
    };
  }

  // User created previously but not completed enrollment -> Preserve existing secret
  let secret = user.totpSecret;
  if (!secret) {
    secret = generateSecret();
    user.totpSecret = secret;
    await user.save();
  }

  const keyuri = generateURI({
    issuer: 'FoodMap',
    label: user.phone,
    secret,
  });
  const qrCode = await QRCode.toDataURL(keyuri);

  return {
    success: true,
    phone: user.phone,
    isEnrolled: false,
    qrCode,
    message: 'Scan QR code with Google Authenticator to complete enrollment',
  };
}

/**
 * Verify TOTP Code
 * - Validates 6-digit code server-side against stored secret
 * - Marks isTotpSetup = true on first successful verification
 * - Preserves existing user role from trusted DB record (role security)
 * - Returns JWT token and sanitized user
 */
export async function verifyOTP(phoneOrPayload, otpArg, roleArg, nameArg) {
  const payload = typeof phoneOrPayload === 'object' && phoneOrPayload !== null ? phoneOrPayload : {};
  const phone = payload.phone || phoneOrPayload;
  const otp = payload.otp || otpArg;
  const name = payload.name || nameArg;
  const businessName = payload.businessName;
  const specialties = payload.specialties || payload.category;
  const pickupAddress = payload.pickupAddress;
  const coordinates = payload.coordinates;

  if (!phone || !otp) {
    const err = new Error('Phone number and 6-digit code are required');
    err.statusCode = 400;
    throw err;
  }

  // Validate format (must be 6 digits)
  const cleanOtp = String(otp).trim();
  if (!/^\d{6}$/.test(cleanOtp)) {
    const err = new Error('Verification code must be exactly 6 digits');
    err.statusCode = 400;
    throw err;
  }

  const cleanDigits = String(phone).replace(/\D/g, '');
  const digits10 = cleanDigits.slice(-10);
  const normalizedPhone = `+91${digits10}`;

  const user = await User.findOne({
    $or: [{ phone }, { phone: normalizedPhone }, { phone: digits10 }]
  }).select('+totpSecret +password');

  if (!user) {
    const err = new Error('No account found for this phone number. Please register first');
    err.statusCode = 400;
    throw err;
  }

  if (payload.password && user.password) {
    const isMatch = await bcrypt.compare(String(payload.password).trim(), user.password);
    const isDemo = (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_OTP === 'true') && (String(payload.password).trim() === '123456');
    if (!isMatch && !isDemo) {
      const err = new Error('Incorrect password. Please try again.');
      err.statusCode = 401;
      throw err;
    }
  }

  if (!user.totpSecret) {
    user.totpSecret = generateSecret();
    await user.save();
  }

  const isDemoOtp = (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_OTP === 'true') && cleanOtp === '123456';
  const verifyResult = verifySync({
    token: cleanOtp,
    secret: user.totpSecret,
    window: 1,
  });

  if (!verifyResult?.valid && !isDemoOtp) {
    const err = new Error('Invalid verification code. Please check your Google Authenticator app and try again');
    err.statusCode = 400;
    throw err;
  }

  // Check if this is first-time enrollment (user has never completed onboarding)
  const isNewUser = !user.isOnboarded;

  if (user.isOnboarded) {
    // Returning onboarded user (resident or vendor)
    user.isTotpSetup = true;
    user.isVerified = true;
    if (name) user.name = name;
    await user.save();
  } else {
    // Brand new user (resident or vendor):
    // Authenticated via OTP, but needs to complete profile setup before account is finalized
    user.isVerified = true;
    if (name && !user.name) user.name = name;
    await user.save();
  }

  let vendor = null;
  let resident = null;
  if (user.role === 'vendor') {
    vendor = await Vendor.findOne({ user: user._id });
  } else if (user.role === 'resident') {
    resident = await Resident.findOne({ user: user._id });
  }

  const token = generateToken(user);

  return {
    success: true,
    isNewUser,
    user: {
      _id: user._id,
      id: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      location: user.location,
      isTotpSetup: user.isTotpSetup,
      isOnboarded: Boolean(user.isOnboarded),
      vendor,
      resident,
    },
    vendor,
    resident,
    token,
  };
}

/**
 * Complete Resident Onboarding
 * - Creates/updates Resident profile with custom delivery address, flat/building, diet preferences, and GPS coords.
 * - Finalizes user record (isOnboarded = true, isTotpSetup = true).
 */
export async function completeResidentOnboarding(userId, payload = {}) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found. Please verify your phone number first.');
    err.statusCode = 404;
    throw err;
  }

  const residentName = (payload.name || payload.residentName || '').trim();
  if (!residentName || residentName.length < 2) {
    const err = new Error('Please provide your full name (at least 2 characters)');
    err.statusCode = 400;
    throw err;
  }

  const gender = (payload.gender || '').trim();
  if (!gender) {
    const err = new Error('Please select your gender');
    err.statusCode = 400;
    throw err;
  }

  const occupation = (payload.occupation || '').trim();
  if (!occupation) {
    const err = new Error('Please select your occupation');
    err.statusCode = 400;
    throw err;
  }

  const dietaryPreference = ['veg', 'non-veg', 'all'].includes(payload.dietaryPreference || payload.diet)
    ? (payload.dietaryPreference || payload.diet)
    : 'all';

  const radarDistanceLimit = Number(payload.radarDistanceLimit) || 500;

  if (Array.isArray(payload.coordinates) && payload.coordinates.length === 2) {
    user.location = {
      type: 'Point',
      coordinates: payload.coordinates,
      address: payload.address || '',
    };
    user.markModified('location');
  }

  user.name = residentName;
  user.gender = gender;
  user.occupation = occupation;
  if (payload.avatar !== undefined) {
    user.avatar = payload.avatar || '';
  }
  user.isTotpSetup = true;
  user.isVerified = true;
  user.isOnboarded = true;

  await user.save();

  let resident = await Resident.findOne({ user: user._id });
  if (!resident) {
    resident = await Resident.create({
      user: user._id,
      gender,
      occupation,
      preferences: {
        radarDistanceLimit,
        dietaryPreference,
        notificationsEnabled: true,
      },
    });
  } else {
    resident.gender = gender || resident.gender;
    resident.occupation = occupation || resident.occupation;
    resident.preferences = {
      ...resident.preferences,
      radarDistanceLimit,
      dietaryPreference,
    };
    await resident.save();
  }

  const token = generateToken(user);

  return {
    user: {
      _id: user._id,
      id: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      gender: user.gender,
      occupation: user.occupation,
      avatar: user.avatar,
      location: user.location,
      isTotpSetup: user.isTotpSetup,
      isOnboarded: user.isOnboarded,
      resident,
    },
    resident,
    token,
  };
}

/**
 * Complete Vendor Onboarding
 * - ONLY creates the real Vendor profile once the vendor submits actual details.
 * - Finalizes user record (isOnboarded = true, isTotpSetup = true).
 */
export async function completeVendorOnboarding(userId, payload = {}) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found. Please verify your phone number first.');
    err.statusCode = 404;
    throw err;
  }

  const chefName = (payload.name || payload.chefName || '').trim();
  const businessName = (payload.businessName || payload.kitchenName || '').trim() || (chefName ? `${chefName}'s Kitchen` : 'My Kitchen');
  const specialties = (payload.category || payload.specialties || '').trim() || 'Home Cook • Homemade Specialties';
  const pickupAddress = (payload.pickupAddress || '').trim();
  const coordinates = Array.isArray(payload.coordinates) && payload.coordinates.length === 2
    ? payload.coordinates
    : [73.0188, 19.0225];

  if (chefName) {
    user.name = chefName;
  }
  if (payload.avatar !== undefined) {
    user.avatar = payload.avatar || '';
  }
  user.location = {
    type: 'Point',
    coordinates,
    address: pickupAddress,
  };
  user.isTotpSetup = true;
  user.isVerified = true;
  user.isOnboarded = true;
  user.markModified('location');
  await user.save();

  // Create or update real Vendor document with their submitted details
  let vendor = await Vendor.findOne({ user: user._id });
  const coverImage = payload.coverImage !== undefined ? (payload.coverImage || '') : '';
  if (!vendor) {
    vendor = await Vendor.create({
      user: user._id,
      businessName,
      category: specialties,
      bio: payload.bio || '',
      experience: payload.experience || '',
      coverImage,
      location: {
        type: 'Point',
        coordinates,
        pickupAddress,
      },
    });
  } else {
    vendor.businessName = businessName;
    vendor.category = specialties;
    if (payload.coverImage !== undefined) {
      vendor.coverImage = payload.coverImage || '';
    }
    if (payload.bio !== undefined) {
      vendor.bio = payload.bio || '';
    }
    if (payload.experience !== undefined) {
      vendor.experience = payload.experience || '';
    }
    vendor.location = {
      type: 'Point',
      coordinates,
      pickupAddress,
    };
    vendor.markModified('location');
    await vendor.save();
  }

  const token = generateToken(user);

  return {
    user: {
      _id: user._id,
      id: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      location: user.location,
      isTotpSetup: user.isTotpSetup,
      isOnboarded: user.isOnboarded,
      vendor,
    },
    vendor,
    token,
  };
}

export async function completeGenericOnboarding(userId, payload = {}) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }
  user.name = (payload.name || user.name || 'User').trim();
  user.isTotpSetup = true;
  user.isVerified = true;
  user.isOnboarded = true;
  if (payload.location) {
    user.location = payload.location;
  }
  await user.save();
  const token = generateToken(user);
  return {
    user: {
      _id: user._id,
      id: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      location: user.location,
      isTotpSetup: user.isTotpSetup,
      isOnboarded: user.isOnboarded,
    },
    token,
  };
}

/**
 * Direct Login with Phone & Password (using bcrypt)
 */
export async function loginWithPassword(phone, password) {
  if (!phone || !password) {
    const err = new Error('Phone number and password are required');
    err.statusCode = 400;
    throw err;
  }

  if (String(password).trim().length < 3) {
    const err = new Error('Password must be at least 3 characters');
    err.statusCode = 400;
    throw err;
  }

  const cleanDigits = String(phone).replace(/\D/g, '');
  const digits10 = cleanDigits.slice(-10);
  const normalizedPhone = `+91${digits10}`;

  const user = await User.findOne({
    $or: [{ phone }, { phone: normalizedPhone }, { phone: digits10 }]
  }).select('+totpSecret +password');

  if (!user) {
    const err = new Error('No account found for this phone number. Please register first');
    err.statusCode = 404;
    throw err;
  }

  if (user.password) {
    const isMatch = await bcrypt.compare(String(password).trim(), user.password);
    const isDemo = (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_OTP === 'true') && (String(password).trim() === '123456');
    if (!isMatch && !isDemo) {
      const err = new Error('Incorrect password. Please try again.');
      err.statusCode = 401;
      throw err;
    }
  } else {
    user.password = await bcrypt.hash(String(password).trim(), 10);
    await user.save();
  }

  let vendor = null;
  let resident = null;
  if (user.role === 'vendor') {
    vendor = await Vendor.findOne({ user: user._id });
  } else if (user.role === 'resident') {
    resident = await Resident.findOne({ user: user._id });
  }

  const token = generateToken(user);

  return {
    success: true,
    token,
    user: {
      _id: user._id,
      id: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      location: user.location,
      isTotpSetup: user.isTotpSetup,
      isOnboarded: Boolean(user.isOnboarded),
      vendor,
      resident,
    },
    vendor,
    resident,
  };
}


