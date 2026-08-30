import * as locationService from '../services/locationService.js';

export async function getNearby(req, res, next) {
  try {
    const lng = parseFloat(req.query.lng) || 72.9342;
    const lat = parseFloat(req.query.lat) || 19.1485;
    const distance = parseInt(req.query.distance) || 5000;

    const nearbyVendors = await locationService.getNearbyVendors(lng, lat, distance);
    res.json({ success: true, count: nearbyVendors.length, data: nearbyVendors });
  } catch (err) {
    next(err);
  }
}

export async function updateLocation(req, res, next) {
  try {
    const { lng, lat, address } = req.body;
    const updatedUser = await locationService.updateUserLocation(req.user._id, lng, lat, address);
    
    if (req.io) {
      req.io.emit('location:updated', {
        userId: req.user._id,
        role: req.user.role,
        location: updatedUser.location,
      });
    }

    res.json({ success: true, data: updatedUser });
  } catch (err) {
    next(err);
  }
}
