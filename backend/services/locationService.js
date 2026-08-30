import Vendor from '../models/Vendor.js';
import User from '../models/User.js';
import { calculateDistanceInMeters, formatDistance } from '../utils/distanceCalculator.js';

export async function getNearbyVendors(lng, lat, maxDistance = 5000) {
  const vendors = await Vendor.find({
    status: { $ne: 'OFFLINE' },
  }).populate('user', 'name phone avatar');

  return vendors.map((vendor) => {
    const coords = vendor.location?.coordinates || [72.9355, 19.1492];
    const distanceMeters = calculateDistanceInMeters(lat, lng, coords[1], coords[0]);
    return {
      ...vendor.toObject(),
      distanceMeters,
      distanceText: formatDistance(distanceMeters),
    };
  });
}

export async function updateUserLocation(userId, lng, lat, address) {
  return await User.findByIdAndUpdate(
    userId,
    {
      location: {
        type: 'Point',
        coordinates: [lng, lat],
        address: address || 'Bhandup West, Mumbai',
      },
    },
    { new: true }
  );
}
