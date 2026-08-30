import FoodAvailability from '../models/FoodAvailability.js';

export async function getAvailabilityByFoodId(foodId) {
  return await FoodAvailability.findOne({ food: foodId });
}

export async function updateAvailability(foodId, { quantity, available, status }) {
  return await FoodAvailability.findOneAndUpdate(
    { food: foodId },
    { quantity, available, status, lastUpdated: new Date() },
    { new: true, upsert: true }
  );
}
