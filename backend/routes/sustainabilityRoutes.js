import { Router } from 'express';
import Food from '../models/Food.js';
import Order from '../models/Order.js';
import Vendor from '../models/Vendor.js';

const router = Router();

router.get('/stats', async (req, res, next) => {
  try {
    const [surplusFoods, totalVendors, completedOrders] = await Promise.all([
      Food.find({ $or: [{ isSurplusRescue: true }, { surplusStatus: 'SURPLUS' }] }),
      Vendor.countDocuments(),
      Order.countDocuments({ status: { $in: ['DELIVERED', 'COMPLETED'] } }),
    ]);

    // Rescued portions calculation: original portions minus left, plus base community demo count
    let rescuedPortions = 38;
    surplusFoods.forEach((f) => {
      const sold = (f.initialQuantity || 10) - (f.quantity || 0);
      rescuedPortions += Math.max(0, sold);
    });

    const approximateWeightKg = Math.round(rescuedPortions * 0.45);
    const co2SavedKg = Math.round(approximateWeightKg * 1.8);

    res.json({
      success: true,
      stats: {
        surplusPortionsRescued: rescuedPortions,
        foodWeightRescuedKg: approximateWeightKg,
        co2EmissionsPreventedKg: co2SavedKg,
        localVendorsSupported: totalVendors || 6,
        averageDeliveryDistanceKm: 1.8,
        completedLocalOrders: completedOrders || 42,
        activeSurplusOffers: surplusFoods.filter((f) => f.quantity > 0).length,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
