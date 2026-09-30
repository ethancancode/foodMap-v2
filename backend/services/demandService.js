import Order from '../models/Order.js';
import Food from '../models/Food.js';
import { Subscription } from '../models/Subscription.js';
import Vendor from '../models/Vendor.js';

export async function getVendorDemandPrediction(vendorId) {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    throw new Error('Vendor not found');
  }

  // 1. Fetch active subscriptions for this vendor
  const activeSubscriptions = await Subscription.find({
    vendor: vendorId,
    status: 'ACTIVE',
  }).populate('plan');

  const subscriberCount = activeSubscriptions.length;

  // 2. Fetch completed/active orders from the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const orders = await Order.find({
    vendor: vendorId,
    createdAt: { $gte: thirtyDaysAgo },
    status: { $nin: ['CANCELLED', 'REJECTED'] },
  }).select('items totalAmount createdAt status orderType');

  // 3. Compute historical daily averages and item demand
  const itemCounts = {};
  const dayOfWeekCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const hourlyCounts = {};

  let totalItemsSold = 0;
  orders.forEach((o) => {
    const day = new Date(o.createdAt).getDay();
    dayOfWeekCounts[day] = (dayOfWeekCounts[day] || 0) + 1;

    const hr = new Date(o.createdAt).getHours();
    hourlyCounts[hr] = (hourlyCounts[hr] || 0) + 1;

    if (o.items && o.items.length > 0) {
      o.items.forEach((item) => {
        const name = item.name || 'Signature Meal';
        itemCounts[name] = (itemCounts[name] || 0) + (Number(item.quantity) || 1);
        totalItemsSold += Number(item.quantity) || 1;
      });
    }
  });

  // 4. Get active vendor foods
  const activeFoods = await Food.find({ vendor: vendorId });

  // Baseline demand estimates
  const currentDay = new Date().getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayWeight = dayOfWeekCounts[currentDay] > 0 ? Math.min(1.4, 0.8 + (dayOfWeekCounts[currentDay] / 5)) : 1.1;

  // Top demand items projection
  const itemPredictions = activeFoods.map((food) => {
    const historicalSold = itemCounts[food.name] || 0;
    const baseDailyNormal = Math.max(8, Math.round((historicalSold / 12) * dayWeight) || 12);
    
    // Subscriber portion: If vendor has active subscribers, calculate reserved portions
    const subscriberMealShare = food.isVeg
      ? Math.round(subscriberCount * 0.7)
      : Math.round(subscriberCount * 0.3);

    const expectedDemand = baseDailyNormal + subscriberMealShare;
    // Buffer 10% for walk-ins/hyperlocal radar discovery
    const recommendedPrep = Math.ceil(expectedDemand * 1.12);

    return {
      foodId: food._id,
      name: food.name,
      category: food.category,
      isVeg: food.isVeg,
      currentStock: food.quantity,
      historicalSold,
      subscriberPortions: subscriberMealShare,
      normalOrdersPortion: baseDailyNormal,
      expectedDemand,
      recommendedPrep,
      stockStatus:
        food.quantity >= recommendedPrep
          ? 'WELL_STOCKED'
          : food.quantity < expectedDemand
          ? 'STOCK_LOW'
          : 'OPTIMAL',
    };
  });

  // Calculate peak order window from hourly counts
  let peakHour = 13; // default 1:00 PM
  let maxOrders = 0;
  for (const [hr, cnt] of Object.entries(hourlyCounts)) {
    if (cnt > maxOrders) {
      maxOrders = cnt;
      peakHour = parseInt(hr, 10);
    }
  }

  const peakWindow = `${peakHour % 12 || 12}:00 ${peakHour >= 12 ? 'PM' : 'AM'} - ${(peakHour + 2) % 12 || 12}:00 ${peakHour + 2 >= 12 ? 'PM' : 'AM'}`;
  const surplusWindow = `${(peakHour + 3) % 12 || 12}:30 ${peakHour + 3 >= 12 ? 'PM' : 'AM'}`;

  const totalExpectedMeals = itemPredictions.reduce((acc, curr) => acc + curr.expectedDemand, 0);
  const totalRecommendedPrep = itemPredictions.reduce((acc, curr) => acc + curr.recommendedPrep, 0);

  return {
    success: true,
    dayName: dayNames[currentDay],
    subscriberCount,
    totalExpectedMeals: totalExpectedMeals || 28,
    totalRecommendedPrep: totalRecommendedPrep || 32,
    peakOrderWindow: peakWindow,
    wasteReductionAdvice: `Peak orders finish around ${surplusWindow}. Unsold portions can be automatically converted to Surplus Waste-Rescue with 20% discount to achieve zero food waste.`,
    itemPredictions,
  };
}
