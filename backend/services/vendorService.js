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
  const vendor = await Vendor.findById(id).populate('user');
  const foods = await Food.find({ vendor: id });
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
