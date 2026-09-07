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

  // If a vendor previously started registration but abandoned/refreshed without submitting onboarding:
  if (user && user.role === 'vendor' && !user.isOnboarded) {
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
      isOnboarded: assignedRole === 'resident',
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

  if (user.isTotpSetup) {
    // Already enrolled user: NEVER send a new secret or QR code
    return {
      success: true,
      phone,
      isEnrolled: true,
      qrCode: null,
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

  const verifyResult = verifySync({
    token: cleanOtp,
    secret: user.totpSecret,
    window: 1,
  });

  // [TEMPORARY DEV BYPASS] REMEMBER TO REMOVE BEFORE PRODUCTION
  const isDevBypass = process.env.NODE_ENV !== 'production' && cleanOtp === '123456';

  if (!verifyResult?.valid && !isDevBypass) {
    const err = new Error('Invalid verification code. Please check your Google Authenticator app and try again');
    err.statusCode = 400;
    throw err;
  }

  // Check if this is first-time enrollment (new user or un-onboarded vendor)
  const isNewUser = !user.isTotpSetup || !user.isOnboarded;

  if (user.role === 'resident') {
    user.isTotpSetup = true;
    user.isVerified = true;
    user.isOnboarded = true;
    if (name) user.name = name;
    await user.save();

    let resident = await Resident.findOne({ user: user._id });
    if (!resident) {
      resident = await Resident.create({
        user: user._id,
        location: user.location,
      });
    }
  } else {
    // Vendor flow
    if (user.isOnboarded) {
      // Returning onboarded vendor
      user.isTotpSetup = true;
      user.isVerified = true;
      await user.save();
    } else {
      // Brand new vendor:
      // DO NOT finalize account yet!
      // DO NOT set isTotpSetup = true or isOnboarded = true!
      // DO NOT create dummy Vendor profile with default data!
      user.isVerified = true;
      await user.save();
    }
  }

  let vendor = null;
  if (user.role === 'vendor') {
    vendor = await Vendor.findOne({ user: user._id });
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
    },
    vendor,
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
