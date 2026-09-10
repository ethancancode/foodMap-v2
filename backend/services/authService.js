import { generateSecret, generateURI, verifySync } from 'otplib';
import QRCode from 'qrcode';
import User from '../models/User.js';
import Resident from '../models/Resident.js';
import Vendor from '../models/Vendor.js';
import { generateToken } from '../utils/generateToken.js';

/**
 * Request OTP / TOTP Enrollment
 * - New user: creates user, generates secret once, returns QR code
 * - Pending user (unenrolled): reuses existing secret, returns QR code
 * - Enrolled user: returns isEnrolled: true, NO QR code
 */
export async function requestOTP(phoneOrPayload, roleArg, nameArg) {
  const payload = typeof phoneOrPayload === 'object' && phoneOrPayload !== null ? phoneOrPayload : {};
  const phone = payload.phone || phoneOrPayload;
  const role = payload.role || roleArg;
  const name = payload.name || nameArg;
  const businessName = payload.businessName;
  const specialties = payload.specialties || payload.category;
  const pickupAddress = payload.pickupAddress;
  const coordinates = payload.coordinates;

  if (!phone) {
    const err = new Error('Phone number is required');
    err.statusCode = 400;
    throw err;
  }

  let user = await User.findOne({ phone }).select('+totpSecret');

  // If a user (vendor or resident) previously started registration but abandoned/refreshed without submitting onboarding:
  if (user && !user.isOnboarded) {
    await User.findByIdAndDelete(user._id);
    user = null;
  }

  if (!user) {
    // New user registration
    const secret = generateSecret();
    const assignedRole = role === 'vendor' ? 'vendor' : 'resident';
    const assignedName = name || (assignedRole === 'vendor' ? (businessName ? businessName.replace(/'s Kitchen$/i, '') : 'Kitchen Chef') : 'Resident User');
    const defaultCoords = coordinates || [73.0188, 19.0225];
    const defaultAddress = pickupAddress || (assignedRole === 'vendor' ? 'Seawoods West, Navi Mumbai' : 'Navi Mumbai');

    user = await User.create({
      phone,
      name: assignedName,
      role: assignedRole,
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
      label: phone,
      secret,
    });
    const qrCode = await QRCode.toDataURL(keyuri);

    return {
      success: true,
      phone,
      isEnrolled: false,
      qrCode,
      message: 'Scan QR code with Google Authenticator to complete enrollment',
    };
  }

  if (user && user.role !== role) {
    const existingTitle = user.role === 'vendor' ? 'a Vendor' : 'a Resident';
    const err = new Error(`You have ${existingTitle} account registered to this number.`);
    err.statusCode = 400;
    throw err;
  }

  if (user && user.isTotpSetup) {
    if (payload.resetTotp || payload.reset2fa) {
      // User requested a new 2FA QR code (e.g. lost device/code)
      const secret = generateSecret();
      user.totpSecret = secret;
      // Note: Keep isTotpSetup true (or preserve isOnboarded) so an existing user is not treated as un-onboarded
      await user.save();

      const keyuri = generateURI({
        issuer: 'FoodMap',
        label: phone,
        secret,
      });
      const qrCode = await QRCode.toDataURL(keyuri);

      return {
        success: true,
        phone,
        isEnrolled: false,
        qrCode,
        isOnboarded: Boolean(user.isOnboarded),
        message: 'Scan new QR code with Google Authenticator to reset your 2FA',
      };
    }

    // Already enrolled user: NEVER send a new secret or QR code unless reset requested
    return {
      success: true,
      phone,
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
    label: phone,
    secret,
  });
  const qrCode = await QRCode.toDataURL(keyuri);

  return {
    success: true,
    phone,
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

  const user = await User.findOne({ phone }).select('+totpSecret');

  if (!user || !user.totpSecret) {
    const err = new Error('No account found for this phone number. Please register first');
    err.statusCode = 400;
    throw err;
  }

  const role = payload.role || roleArg;
  if (role && user.role !== role) {
    const existingTitle = user.role === 'vendor' ? 'a Vendor' : 'a Resident';
    const err = new Error(`You have ${existingTitle} account registered to this number.`);
    err.statusCode = 400;
    throw err;
  }

  const verifyResult = verifySync({
    token: cleanOtp,
    secret: user.totpSecret,
    window: 1,
  });

  if (!verifyResult?.valid) {
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
