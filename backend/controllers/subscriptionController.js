import { SubscriptionPlan, Subscription } from '../models/Subscription.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';

export async function getSubscriptionPlans(req, res, next) {
  try {
    const { vendor, mealCategory, cuisine } = req.query;
    const filter = { isActive: true };
    if (vendor) filter.vendor = vendor;
    if (mealCategory && mealCategory !== 'all') filter.mealCategory = mealCategory;
    if (cuisine && cuisine !== 'all') filter.cuisine = cuisine;

    const plans = await SubscriptionPlan.find(filter)
      .populate('vendor', 'businessName category rating totalReviews pickupAddress location verificationStatus')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: plans.length, data: plans, plans });
  } catch (err) {
    next(err);
  }
}

export async function getPlanById(req, res, next) {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id)
      .populate('vendor', 'businessName category rating totalReviews pickupAddress location verificationStatus');

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found' });
    }
    res.json({ success: true, data: plan, plan });
  } catch (err) {
    next(err);
  }
}

export async function createSubscriptionPlan(req, res, next) {
  try {
    let vendor = await Vendor.findOne({ user: req.user._id });
    if (!vendor) {
      vendor = await Vendor.create({
        user: req.user._id,
        businessName: `${req.user.name || 'My'}'s Kitchen`,
      });
    }

    const {
      name,
      description,
      price,
      duration,
      mealsPerDay,
      availableDays,
      mealCategory,
      cuisine,
      maxSubscribers,
      subscriberPriorityAllocation,
    } = req.body;

    const plan = await SubscriptionPlan.create({
      vendor: vendor._id,
      name,
      description: description || 'Nutritious daily home-cooked meal plan.',
      price: Number(price) || 2999,
      duration: duration || 'monthly',
      mealsPerDay: Number(mealsPerDay) || 1,
      availableDays: availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      mealCategory: mealCategory || 'Lunch',
      cuisine: cuisine || 'Home-style Indian',
      maxSubscribers: Number(maxSubscribers) || 30,
      subscriberPriorityAllocation: Number(subscriberPriorityAllocation) || 20,
    });

    if (req.io) {
      req.io.emit('subscription:created', plan);
    }

    res.status(201).json({ success: true, message: 'Subscription plan created', data: plan, plan });
  } catch (err) {
    next(err);
  }
}

export async function subscribeToPlan(req, res, next) {
  try {
    const { planId, deliveryAddress } = req.body;
    const plan = await SubscriptionPlan.findById(planId).populate('vendor');
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found or inactive' });
    }

    if (plan.currentSubscribers >= plan.maxSubscribers) {
      return res.status(409).json({ success: false, message: 'This subscription plan is at full capacity' });
    }

    // Check existing active subscription for this plan and resident
    const existing = await Subscription.findOne({
      plan: plan._id,
      resident: req.user._id,
      status: 'ACTIVE',
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have an active subscription to this plan' });
    }

    const totalMeals = plan.duration === 'weekly' ? 5 : 22;
    const endDate = new Date(Date.now() + (plan.duration === 'weekly' ? 7 : 30) * 24 * 60 * 60 * 1000);

    const subscription = await Subscription.create({
      plan: plan._id,
      resident: req.user._id,
      vendor: plan.vendor._id,
      status: 'ACTIVE',
      startDate: new Date(),
      endDate,
      mealsRemaining: totalMeals,
      totalMeals,
      deliveryAddress: deliveryAddress || req.user.location?.address || 'Resident Address',
      paymentStatus: 'PAID', // Demo flow
    });

    // Update subscriber counts on Plan and Vendor
    await SubscriptionPlan.findByIdAndUpdate(plan._id, { $inc: { currentSubscribers: 1 } });
    await Vendor.findByIdAndUpdate(plan.vendor._id, { $inc: { subscriberCount: 1 } });

    const populated = await Subscription.findById(subscription._id)
      .populate('plan')
      .populate('vendor', 'businessName category pickupAddress rating');

    if (req.io) {
      req.io.to(`vendor:${plan.vendor._id}`).emit('subscription:newSubscriber', {
        subscription: populated,
        vendorId: plan.vendor._id,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Subscribed successfully! Your daily meals are now scheduled with priority allocation.',
      data: populated,
      subscription: populated,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMySubscriptions(req, res, next) {
  try {
    const subscriptions = await Subscription.find({ resident: req.user._id })
      .populate('plan')
      .populate('vendor', 'businessName category pickupAddress rating location')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: subscriptions.length, data: subscriptions, subscriptions });
  } catch (err) {
    next(err);
  }
}

export async function getVendorSubscriptions(req, res, next) {
  try {
    let vendorId = req.params.vendorId;
    if (!vendorId || vendorId === 'me') {
      const v = await Vendor.findOne({ user: req.user._id });
      vendorId = v?._id;
    }
    if (!vendorId) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const subscriptions = await Subscription.find({ vendor: vendorId })
      .populate('plan')
      .populate('resident', 'name phone email avatar location')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: subscriptions.length, data: subscriptions, subscriptions });
  } catch (err) {
    next(err);
  }
}

export async function cancelSubscription(req, res, next) {
  try {
    const subscription = await Subscription.findOneAndUpdate(
      { _id: req.params.id, resident: req.user._id },
      { status: 'CANCELLED' },
      { returnDocument: 'after' }
    ).populate('plan');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    await SubscriptionPlan.findByIdAndUpdate(subscription.plan._id, { $inc: { currentSubscribers: -1 } });
    await Vendor.findByIdAndUpdate(subscription.vendor, { $inc: { subscriberCount: -1 } });

    res.json({ success: true, message: 'Subscription cancelled successfully', subscription });
  } catch (err) {
    next(err);
  }
}
