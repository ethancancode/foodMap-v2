import * as vendorService from '../services/vendorService.js';
import Vendor from '../models/Vendor.js';

export async function getVendors(req, res, next) {
  try {
    const vendors = await vendorService.getAllVendors(req.query);
    res.json({ success: true, count: vendors.length, data: vendors, vendors });
  } catch (err) {
    next(err);
  }
}

export async function getVendorById(req, res, next) {
  try {
    const data = await vendorService.getVendorById(req.params.id);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
}

export async function updateVendor(req, res, next) {
  try {
    const vendor = await vendorService.updateVendorProfile(req.user._id, req.body);
    
    // Broadcast status change via Socket.IO
    if (req.io && req.body.status) {
      req.io.emit('vendor:statusUpdated', {
        vendorId: vendor._id,
        status: req.body.status,
        vendor,
      });
    }

    res.json({ success: true, data: vendor, vendor });
  } catch (err) {
    next(err);
  }
}

export async function getMyVendorProfile(req, res, next) {
  try {
    let vendor = await Vendor.findOne({ user: req.user._id }).populate('user');
    if (!vendor) {
      if (req.user.role === 'vendor' && req.user.isOnboarded) {
        vendor = await Vendor.create({
          user: req.user._id,
          businessName: `${req.user.name || 'My'}'s Kitchen`,
        });
      } else {
        return res.status(404).json({ success: false, message: 'Vendor profile not found for this account' });
      }
    }
    res.json({ success: true, data: vendor, vendor });
  } catch (err) {
    next(err);
  }
}


export async function submitReview(req, res, next) {
  try {
    const vendorId = req.params.id;
    const { rating, comment, orderId, dishName, userId: bodyUserId, userName: bodyUserName } = req.body;
    const userId = req.user ? req.user._id : (bodyUserId || null);
    const userName = req.user ? (req.user.name || 'Resident') : (bodyUserName || 'Resident');

    const result = await vendorService.addVendorReview(vendorId, {
      userId,
      userName,
      rating,
      comment,
      orderId,
      dishName,
    });

    // Broadcast updated vendor stats to all clients & vendor socket rooms
    if (req.io) {
      req.io.emit('vendor:statusUpdated', {
        vendorId: result.vendor._id,
        vendor: result.vendor,
        rating: result.vendor.rating,
        totalReviews: result.vendor.totalReviews,
      });
      req.io.emit('vendor:reviewAdded', {
        vendorId: result.vendor._id,
        review: result.review,
        vendor: result.vendor,
      });
    }

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function getReviews(req, res, next) {
  try {
    const reviews = await vendorService.getVendorReviews(req.params.id);
    res.json({ success: true, count: reviews.length, data: reviews, reviews });
  } catch (err) {
    next(err);
  }
}

