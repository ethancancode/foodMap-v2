import mongoose from 'mongoose';
import Vendor from '../models/Vendor.js';
import Food from '../models/Food.js';

export async function getAllVendors(filters = {}) {
  const query = {};
  if (filters.status) {
    query.status = filters.status;
  }
  const vendors = await Vendor.find(query).populate('user', 'name phone email avatar');
  return vendors;
}

export async function getVendorById(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return { vendor: null, foods: [] };
  }
  const vendor = await Vendor.findOne({ $or: [{ _id: id }, { user: id }] }).populate('user');
  if (!vendor) {
    return { vendor: null, foods: [] };
  }
  const foods = await Food.find({ vendor: vendor._id });
  return { vendor, foods };
}

export async function updateVendorProfile(vendorIdOrUserId, data) {
  let query = [];
  if (mongoose.Types.ObjectId.isValid(vendorIdOrUserId)) {
    query.push({ _id: vendorIdOrUserId });
    query.push({ user: vendorIdOrUserId });
  } else {
    query.push({ user: vendorIdOrUserId });
  }

  let vendor = await Vendor.findOne({ $or: query });

  const pickupAddress = data.pickupAddress || data.location?.pickupAddress;
  const coordinates = data.coordinates || data.location?.coordinates;

  if (!vendor) {
    vendor = await Vendor.create({
      user: vendorIdOrUserId,
      businessName: data.businessName || "My Kitchen",
      category: data.category || "Home Cook",
      bio: data.bio || '',
      experience: data.experience || '',
      location: {
        type: 'Point',
        coordinates: coordinates || [73.0188, 19.0225],
        pickupAddress: pickupAddress || '',
      },
      ...data,
    });
  } else {
    if (data.businessName) vendor.businessName = data.businessName;
    if (data.category) vendor.category = data.category;
    if (data.bio !== undefined) vendor.bio = data.bio;
    if (data.experience !== undefined) vendor.experience = data.experience;
    if (data.status) vendor.status = data.status;
    if (data.coverImage !== undefined) vendor.coverImage = data.coverImage;

    if (pickupAddress || coordinates) {
      if (!vendor.location) {
        vendor.location = {
          type: 'Point',
          coordinates: coordinates || [73.0188, 19.0225],
          pickupAddress: pickupAddress || '',
        };
      } else {
        if (pickupAddress) vendor.location.pickupAddress = pickupAddress;
        if (coordinates) vendor.location.coordinates = coordinates;
      }
      vendor.markModified('location');
    }

    await vendor.save();
  }

  return vendor;
}

export async function addVendorReview(vendorIdOrUserId, { userId, userName, rating, comment, orderId, dishName }) {
  let query = [];
  if (mongoose.Types.ObjectId.isValid(vendorIdOrUserId)) {
    query.push({ _id: vendorIdOrUserId });
    query.push({ user: vendorIdOrUserId });
  } else {
    query.push({ user: vendorIdOrUserId });
  }

  let vendor = await Vendor.findOne({ $or: query });
  if (!vendor) {
    throw new Error('Vendor not found');
  }

  const Review = (await import('../models/Review.js')).default;
  const Order = (await import('../models/Order.js')).default;
  const numRating = Number(rating) || 5;

  // Prevent duplicate review if an orderId is provided
  if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
    const existingOrderReview = await Review.findOne({ order: orderId });
    if (existingOrderReview) {
      return { vendor, review: existingOrderReview, alreadyReviewed: true };
    }
  }

  let resolvedDishName = dishName || '';
  if (!resolvedDishName && orderId && mongoose.Types.ObjectId.isValid(orderId)) {
    const orderDoc = await Order.findById(orderId);
    if (orderDoc) {
      resolvedDishName = orderDoc.foodName || orderDoc.itemSummary || orderDoc.items?.[0]?.name || '';
    }
  }

  // Create Review record
  const review = await Review.create({
    vendor: vendor._id,
    user: userId && mongoose.Types.ObjectId.isValid(userId) ? userId : undefined,
    userName: userName || 'Resident',
    rating: numRating,
    comment: comment || '',
    dishName: resolvedDishName,
    order: orderId && mongoose.Types.ObjectId.isValid(orderId) ? orderId : undefined,
  });

  // If orderId provided, mark Order as reviewed
  if (orderId && mongoose.Types.ObjectId.isValid(orderId)) {
    await Order.findByIdAndUpdate(orderId, {
      isReviewed: true,
      rating: numRating,
      reviewComment: comment || '',
    });
  }

  // Automatically add vendor to resident's vouchedVendors when rating is positive (4 or 5 stars)
  if (userId && mongoose.Types.ObjectId.isValid(userId) && numRating >= 4) {
    try {
      const Resident = (await import('../models/Resident.js')).default;
      await Resident.findOneAndUpdate(
        { user: userId },
        { $addToSet: { vouchedVendors: vendor._id } },
        { upsert: true }
      );
    } catch (vErr) {
      console.warn('[VendorService] Could not auto-vouch vendor:', vErr.message);
    }
  }

  // Calculate new cumulative rating
  const prevRating = vendor.rating || 0;
  const prevCount = vendor.totalReviews || 0;
  const newCount = prevCount + 1;
  const newRating = Number((((prevRating * prevCount) + numRating) / newCount).toFixed(1));

  vendor.rating = newRating;
  vendor.totalReviews = newCount;
  await vendor.save();

  return { vendor, review, alreadyReviewed: false };
}

export async function getVendorReviews(vendorIdOrUserId) {
  if (!vendorIdOrUserId || !mongoose.Types.ObjectId.isValid(vendorIdOrUserId)) {
    return [];
  }
  const vendor = await Vendor.findOne({
    $or: [{ _id: vendorIdOrUserId }, { user: vendorIdOrUserId }]
  });
  if (!vendor) return [];
  const Review = (await import('../models/Review.js')).default;
  return Review.find({ vendor: vendor._id })
    .populate('order', 'foodName itemSummary items')
    .sort({ createdAt: -1 })
    .limit(50);
}

