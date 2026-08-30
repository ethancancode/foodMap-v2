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
      vendor = await Vendor.create({
        user: req.user._id,
        businessName: `${req.user.name || 'My'}'s Kitchen`,
      });
    }
    res.json({ success: true, data: vendor, vendor });
  } catch (err) {
    next(err);
  }
}
