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
  let phone;
  let role;
  let name;

  if (typeof phoneOrPayload === 'object' && phoneOrPayload !== null) {
    phone = phoneOrPayload.phone;
    role = phoneOrPayload.role;
    name = phoneOrPayload.name;
  } else {
    phone = phoneOrPayload;
    role = roleArg;
    name = nameArg;
  }

  if (!phone) {
    const err = new Error('Phone number is required');
    err.statusCode = 400;
    throw err;
  }

  let user = await User.findOne({ phone }).select('+totpSecret');

  if (!user) {
    // New user registration
    const secret = generateSecret();
    const assignedRole = role === 'vendor' ? 'vendor' : 'resident';
    const assignedName = name || (assignedRole === 'vendor' ? 'Kitchen Vendor' : 'Resident User');

    user = await User.create({
      phone,
      name: assignedName,
      role: assignedRole,
      totpSecret: secret,
      isTotpSetup: false,
      isVerified: false,
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
  let phone;
  let otp;
  let name;

  if (typeof phoneOrPayload === 'object' && phoneOrPayload !== null) {
    phone = phoneOrPayload.phone;
    otp = phoneOrPayload.otp;
    name = phoneOrPayload.name;
  } else {
    phone = phoneOrPayload;
    otp = otpArg;
    name = nameArg;
  }

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

  if (!verifyResult?.valid) {
    const err = new Error('Invalid verification code. Please check your Google Authenticator app and try again');
    err.statusCode = 400;
    throw err;
  }

  // Mark setup completed and verified
  user.isTotpSetup = true;
  user.isVerified = true;
  if (name && !user.name) {
    user.name = name;
  }
  await user.save();

  // Ensure role profile document exists
  if (user.role === 'vendor') {
    let vendor = await Vendor.findOne({ user: user._id });
    if (!vendor) {
      vendor = await Vendor.create({
        user: user._id,
        businessName: `${user.name}'s Kitchen`,
        location: user.location,
      });
    }
  } else {
    let resident = await Resident.findOne({ user: user._id });
    if (!resident) {
      resident = await Resident.create({
        user: user._id,
        location: user.location,
      });
    }
  }

  const token = generateToken(user);

  return {
    success: true,
    user: {
      _id: user._id,
      id: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      location: user.location,
      isTotpSetup: user.isTotpSetup,
    },
    token,
  };
}
