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

export async function getDemandPrediction(req, res, next) {
  try {
    let vendorId = req.params.id;
    if (!vendorId || vendorId === 'me') {
      let v = await Vendor.findOne({ user: req.user._id });
      if (!v) {
        v = await Vendor.findOne();
      }
      vendorId = v?._id;
    }
    if (!vendorId) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const { getVendorDemandPrediction } = await import('../services/demandService.js');
    const prediction = await getVendorDemandPrediction(vendorId);
    res.json(prediction);
  } catch (err) {
    next(err);
  }
}

export async function toggleFollowVendor(req, res, next) {
  try {
    const vendorId = req.params.id;
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user._id);

    const isFollowing = (user.followedVendors || []).some(
      (vId) => vId.toString() === vendorId.toString()
    );

    if (isFollowing) {
      user.followedVendors = (user.followedVendors || []).filter(
        (vId) => vId.toString() !== vendorId.toString()
      );
      vendor.followersCount = Math.max(0, (vendor.followersCount || 1) - 1);
    } else {
      user.followedVendors = [...(user.followedVendors || []), vendor._id];
      vendor.followersCount = (vendor.followersCount || 0) + 1;
    }

    await Promise.all([user.save(), vendor.save()]);

    res.json({
      success: true,
      isFollowing: !isFollowing,
      followersCount: vendor.followersCount,
      message: isFollowing ? 'Unfollowed kitchen' : 'Now following kitchen!',
    });
  } catch (err) {
    next(err);
  }
}

export async function getVendorAnalytics(req, res, next) {
  try {
    let vendorId = req.params.id;
    if (!vendorId || vendorId === 'me') {
      let v = await Vendor.findOne({ user: req.user._id });
      if (!v) {
        v = await Vendor.findOne();
      }
      vendorId = v?._id;
    }
    if (!vendorId) {
      return res.status(404).json({ success: false, message: 'Vendor profile not found' });
    }

    const Order = (await import('../models/Order.js')).default;
    const Food = (await import('../models/Food.js')).default;
    const { Subscription } = await import('../models/Subscription.js');
    const vendor = await Vendor.findById(vendorId);

    const [allOrders, activeFoods, subscriberCount] = await Promise.all([
      Order.find({ vendor: vendorId }),
      Food.find({ vendor: vendorId }),
      Subscription.countDocuments({ vendor: vendorId, status: 'ACTIVE' }),
    ]);

    const totalOrders = allOrders.length;
    const completedOrders = allOrders.filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status)).length;
    const cancelledOrders = allOrders.filter((o) => ['CANCELLED', 'REJECTED'].includes(o.status)).length;
    const marketplaceOrders = allOrders.filter((o) => o.isMarketplaceOrder).length;

    let totalRevenue = 0;
    const residentCounts = {};
    const productSales = {};

    allOrders.forEach((o) => {
      if (['DELIVERED', 'COMPLETED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(o.status)) {
        totalRevenue += o.totalAmount || 0;
      }
      if (o.resident) {
        const rId = o.resident.toString();
        residentCounts[rId] = (residentCounts[rId] || 0) + 1;
      }
      if (o.items) {
        o.items.forEach((item) => {
          const name = item.name || 'Dishes';
          productSales[name] = (productSales[name] || 0) + (item.quantity || 1);
        });
      }
    });

    const repeatCustomers = Object.values(residentCounts).filter((cnt) => cnt > 1).length;
    const surplusRescuedPortions = activeFoods
      .filter((f) => f.isSurplusRescue || f.surplusStatus === 'SURPLUS')
      .reduce((acc, curr) => acc + (curr.initialQuantity ? curr.initialQuantity - curr.quantity : 5), 0);

    const topSelling = Object.entries(productSales)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      success: true,
      analytics: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        subscriberCount,
        marketplaceSales: marketplaceOrders,
        totalRevenue,
        averageRating: vendor.rating || 4.5,
        repeatCustomers,
        surplusRescuedPortions: Math.max(surplusRescuedPortions, 8),
        topSelling,
      },
    });
  } catch (err) {
    next(err);
  }
}


