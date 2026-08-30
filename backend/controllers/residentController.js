import Resident from '../models/Resident.js';
import User from '../models/User.js';

export async function getProfile(req, res, next) {
  try {
    let resident = await Resident.findOne({ user: req.user._id })
      .populate('user', 'name phone email avatar location')
      .populate('vouchedVendors');

    if (!resident) {
      resident = await Resident.create({ user: req.user._id });
      resident = await Resident.findById(resident._id).populate('user');
    }

    res.json({ success: true, resident });
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req, res, next) {
  try {
    const resident = await Resident.findOneAndUpdate(
      { user: req.user._id },
      { preferences: req.body },
      { new: true, upsert: true }
    );
    res.json({ success: true, resident });
  } catch (err) {
    next(err);
  }
}

export async function vouchVendor(req, res, next) {
  try {
    const { vendorId } = req.body;
    const resident = await Resident.findOneAndUpdate(
      { user: req.user._id },
      { $addToSet: { vouchedVendors: vendorId } },
      { new: true, upsert: true }
    );
    res.json({ success: true, resident });
  } catch (err) {
    next(err);
  }
}
