import * as availabilityService from '../services/availabilityService.js';
import * as foodService from '../services/foodService.js';

export async function getAvailability(req, res, next) {
  try {
    const availability = await availabilityService.getAvailabilityByFoodId(req.params.foodId);
    res.json({ success: true, data: availability });
  } catch (err) {
    next(err);
  }
}

export async function updateAvailability(req, res, next) {
  try {
    const { quantity } = req.body;
    const food = await foodService.updateFood(req.params.foodId, { quantity });
    
    if (req.io) {
      req.io.emit('food:availabilityUpdated', {
        foodId: food._id,
        quantity: food.quantity,
        available: food.available,
        status: food.status,
      });

      if (food.quantity === 0) {
        req.io.emit('food:soldOut', { foodId: food._id });
      }
    }

    res.json({ success: true, data: food });
  } catch (err) {
    next(err);
  }
}
