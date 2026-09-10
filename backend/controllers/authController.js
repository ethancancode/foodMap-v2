import * as authService from '../services/authService.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Resident from '../models/Resident.js';

export async function requestOTP(req, res, next) {
  try {
    const result = await authService.requestOTP(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function verifyOTP(req, res, next) {
  try {
    const { user, token, isNewUser, vendor } = await authService.verifyOTP(req.body);
    res.json({
      success: true,
      isNewUser: Boolean(isNewUser),
      message: 'Verified successfully',
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
        vendor: user.vendor || vendor,
      },
      vendor: user.vendor || vendor,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = req.user;
    if (!user.isOnboarded) {
      // User started onboarding previously, but refreshed/closed without submitting!
      // Delete the incomplete un-onboarded user so the account is NEVER made.
      await User.findByIdAndDelete(user._id);
      return res.status(401).json({
        success: false,
        message: 'Onboarding was not completed. Account was discarded.',
      });
    }

    let vendor = null;
    let resident = null;
    if (user.role === 'vendor') {
      vendor = await Vendor.findOne({ user: user._id });
    } else if (user.role === 'resident') {
      resident = await Resident.findOne({ user: user._id }).populate({
        path: 'vouchedVendors',
        select: 'businessName category rating totalReviews coverImage user pickupAddress location',
        populate: { path: 'user', select: 'name phone avatar' }
      });
    }

    res.json({
      success: true,
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
        isOnboarded: Boolean(user.isOnboarded),
        vendor,
        resident,
      },
      vendor,
      resident,
    });
  } catch (err) {
    next(err);
  }
}

export async function completeOnboarding(req, res, next) {
  try {
    const isResident = req.user.role === 'resident' || req.body.role === 'resident';
    const result = isResident
      ? await authService.completeResidentOnboarding(req.user._id, req.body)
      : await authService.completeVendorOnboarding(req.user._id, req.body);

    res.json({
      success: true,
      message: isResident ? 'Resident onboarding completed successfully' : 'Kitchen onboarding completed successfully',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { name, avatar, location, email } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { name, avatar, location, email },
      { returnDocument: 'after' }
    );
    res.json({
      success: true,
      user: {
        _id: updated._id,
        id: updated._id,
        phone: updated.phone,
        name: updated.name,
        role: updated.role,
        avatar: updated.avatar,
        location: updated.location,
        isTotpSetup: updated.isTotpSetup,
      },
    });
  } catch (err) {
    next(err);
  }
}
