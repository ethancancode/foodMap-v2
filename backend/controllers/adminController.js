import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Food from '../models/Food.js';
import Order from '../models/Order.js';
import { Subscription } from '../models/Subscription.js';

export async function getAdminStats(req, res, next) {
  try {
    const [
      totalUsers,
      totalResidents,
      totalVendors,
      totalDeliveryPartners,
      totalOrders,
      completedOrders,
      cancelledOrders,
      activeFoodListings,
      marketplaceListings,
      activeSubscriptions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'resident' }),
      Vendor.countDocuments(),
      User.countDocuments({ role: 'delivery_partner' }),
      Order.countDocuments(),
      Order.countDocuments({ status: { $in: ['DELIVERED', 'COMPLETED'] } }),
      Order.countDocuments({ status: { $in: ['CANCELLED', 'REJECTED'] } }),
      Food.countDocuments({ available: true }),
      Food.countDocuments({ isMarketplace: true }),
      Subscription.countDocuments({ status: 'ACTIVE' }),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalResidents,
        totalVendors,
        totalDeliveryPartners,
        totalOrders,
        completedOrders,
        cancelledOrders,
        activeFoodListings,
        marketplaceListings,
        activeSubscriptions,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUsers(req, res, next) {
  try {
    const { role, search } = req.query;
    const filter = {};
    if (role && role !== 'all') {
      filter.role = role;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    const users = await User.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: users.length, data: users, users });
  } catch (err) {
    next(err);
  }
}

export async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      id,
      { isActive: Boolean(isActive) },
      { returnDocument: 'after' }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, data: user, user });
  } catch (err) {
    next(err);
  }
}

export async function getAdminVendors(req, res, next) {
  try {
    const { verificationStatus } = req.query;
    const filter = {};
    if (verificationStatus && verificationStatus !== 'all') {
      filter.verificationStatus = verificationStatus;
    }
    const vendors = await Vendor.find(filter).populate('user').sort({ createdAt: -1 });
    res.json({ success: true, count: vendors.length, data: vendors, vendors });
  } catch (err) {
    next(err);
  }
}

export async function updateVendorVerification(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'VERIFIED', 'REJECTED', 'PENDING'
    if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid verification status' });
    }
    const vendor = await Vendor.findByIdAndUpdate(
      id,
      { verificationStatus: status },
      { returnDocument: 'after' }
    ).populate('user');

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (req.io) {
      req.io.emit('vendor:statusUpdated', {
        vendorId: vendor._id,
        verificationStatus: vendor.verificationStatus,
        vendor,
      });
    }

    res.json({ success: true, message: `Vendor verification updated to ${status}`, data: vendor, vendor });
  } catch (err) {
    next(err);
  }
}

export async function getAdminFoods(req, res, next) {
  try {
    const { isMarketplace, category } = req.query;
    const filter = {};
    if (isMarketplace !== undefined) {
      filter.isMarketplace = isMarketplace === 'true' || isMarketplace === true;
    }
    if (category && category !== 'all') {
      filter.category = category;
    }
    const foods = await Food.find(filter).populate('vendor').sort({ createdAt: -1 });
    res.json({ success: true, count: foods.length, data: foods, foods });
  } catch (err) {
    next(err);
  }
}

export async function moderateFood(req, res, next) {
  try {
    const { id } = req.params;
    const { available, deleteFood: shouldDelete } = req.body;

    if (shouldDelete) {
      await Food.findByIdAndDelete(id);
      if (req.io) {
        req.io.emit('food:deleted', { foodId: id });
      }
      return res.json({ success: true, message: 'Listing removed by administrator', foodId: id });
    }

    const food = await Food.findByIdAndUpdate(
      id,
      { available: Boolean(available) },
      { returnDocument: 'after' }
    ).populate('vendor');

    if (!food) {
      return res.status(404).json({ success: false, message: 'Food not found' });
    }

    if (req.io) {
      req.io.emit('food:availabilityUpdated', {
        foodId: food._id,
        available: food.available,
        status: food.available ? 'AVAILABLE' : 'UNAVAILABLE',
      });
    }

    res.json({ success: true, message: 'Food moderation updated', data: food, food });
  } catch (err) {
    next(err);
  }
}

export async function getAdminOrders(req, res, next) {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    const orders = await Order.find(filter)
      .populate('resident', 'name phone email avatar')
      .populate('vendor', 'businessName pickupAddress')
      .populate('deliveryPartner', 'name phone')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, count: orders.length, data: orders, orders });
  } catch (err) {
    next(err);
  }
}
