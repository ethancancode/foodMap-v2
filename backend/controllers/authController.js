import * as authService from '../services/authService.js';
import User from '../models/User.js';

export async function requestOTP(req, res, next) {
  try {
    const { phone, role, name } = req.body;
    const result = await authService.requestOTP({ phone, role, name });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function verifyOTP(req, res, next) {
  try {
    const { phone, otp, name } = req.body;
    const { user, token } = await authService.verifyOTP({ phone, otp, name });
    res.json({
      success: true,
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
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = req.user;
    res.json({
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
      { new: true }
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
