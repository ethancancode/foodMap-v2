import mongoose from 'mongoose';
import Resident from '../models/Resident.js';
import User from '../models/User.js';

export async function getProfile(req, res, next) {
  try {
    const targetUserId = req.params.id || req.user?._id;
    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid User ID format' });
    }

    const Review = (await import('../models/Review.js')).default;
    const Vendor = (await import('../models/Vendor.js')).default;

    let resident = await Resident.findOne({
      $or: [{ _id: targetUserId }, { user: targetUserId }]
    })
      .populate('user', 'name phone email avatar location occupation gender')
      .populate({
        path: 'vouchedVendors',
        select: 'businessName category rating totalReviews coverImage user pickupAddress location',
        populate: { path: 'user', select: 'name phone avatar' }
      });

    const targetUser = resident?.user || await User.findById(targetUserId).select('name phone email avatar location occupation gender');

    if (!resident && targetUser) {
      if (req.user && (String(req.user._id) === String(targetUserId) || (req.user.resident && String(req.user.resident._id || req.user.resident) === String(targetUserId)))) {
        resident = await Resident.create({ user: req.user._id });
        resident = await Resident.findById(resident._id).populate('user');
      }
    }

    // Find all vendors where this user submitted a positive review (4 or 5 stars) OR matching user's name
    const reviewFilter = {
      rating: { $gte: 4 },
      $or: [
        { user: targetUserId },
        ...(resident?.user?._id ? [{ user: resident.user._id }] : []),
        ...(targetUser?.name ? [{ userName: targetUser.name }] : [])
      ]
    };
    const positiveReviews = await Review.find(reviewFilter).select('vendor');
    const reviewedVendorIds = positiveReviews.map(r => String(r.vendor)).filter(Boolean);

    // Collect all explicit vouched vendor IDs
    const existingVouched = (resident?.vouchedVendors || []).map(v => v._id ? String(v._id) : String(v));
    const allVendorIds = [...new Set([...existingVouched, ...reviewedVendorIds])];

    // Fetch and populate all vouched vendors
    let finalVouchedVendors = [];
    if (allVendorIds.length > 0) {
      finalVouchedVendors = await Vendor.find({ _id: { $in: allVendorIds } })
        .select('businessName category rating totalReviews coverImage user pickupAddress location')
        .populate('user', 'name phone avatar');

      // Also persist back to resident document if resident exists
      if (resident && resident._id) {
        await Resident.findByIdAndUpdate(resident._id, {
          $addToSet: { vouchedVendors: { $each: allVendorIds } }
        });
      }
    }

    const residentData = resident ? resident.toObject() : { user: targetUser };
    residentData.vouchedVendors = finalVouchedVendors;

    res.json({ success: true, resident: residentData });
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req, res, next) {
  try {
    const resident = await Resident.findOneAndUpdate(
      { user: req.user._id },
      { preferences: req.body },
      { returnDocument: 'after', upsert: true }
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
      { returnDocument: 'after', upsert: true }
    );
    res.json({ success: true, resident });
  } catch (err) {
    next(err);
  }
}
