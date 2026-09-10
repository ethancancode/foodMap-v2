import mongoose from 'mongoose';
import Food from '../models/Food.js';
import FoodAvailability from '../models/FoodAvailability.js';
import Vendor from '../models/Vendor.js';
import { DEFAULT_FOOD_SVG } from '../utils/defaultFoodImage.js';

export async function getAllFoods(filters = {}) {
  const query = {};
  if (filters.category && filters.category !== 'all' && filters.category !== 'All') {
    query.category = filters.category;
  }
  if (filters.isVeg !== undefined) {
    query.isVeg = filters.isVeg === 'true' || filters.isVeg === true;
  }
  if (filters.diet && filters.diet !== 'all') {
    query.diet = filters.diet;
  }
  if (filters.search) {
    query.name = { $regex: filters.search, $options: 'i' };
  }
  if (filters.vendor && mongoose.Types.ObjectId.isValid(filters.vendor)) {
    query.vendor = filters.vendor;
  }

  const foods = await Food.find(query)
    .populate('vendor', 'businessName category rating totalReviews status location pickupAddress coverImage')
    .sort({ createdAt: -1 });

  // Filter out any orphaned food dishes where the vendor account was deleted
  return foods.filter(f => f.vendor != null);
}

export async function getFoodById(id) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  const food = await Food.findById(id).populate('vendor');
  return food;
}

export async function createFood(vendorUserId, data) {
  let vendor = await Vendor.findOne({ user: vendorUserId });
  if (!vendor) {
    vendor = await Vendor.create({
      user: vendorUserId,
      businessName: data.vendorName || 'Priya Kitchen',
      location: data.vendorLocation || {
        type: 'Point',
        coordinates: [72.9348, 19.1462],
        pickupAddress: 'Bhandup West, Mumbai',
      },
    });
  }

function calculateReadyAt(statusText, explicitReadyAt) {
  if (explicitReadyAt) return new Date(explicitReadyAt);
  if (!statusText) return null;
  const raw = String(statusText).trim();
  if (/^(ready\s*now|now)$/i.test(raw)) return null;

  const hrMatch = raw.match(/(\d+)\s*(?:hr|hour|h)/i);
  const minMatch = raw.match(/(\d+)\s*(?:min|m)/i);
  const totalMinutes = (hrMatch ? parseInt(hrMatch[1], 10) * 60 : 0) + (minMatch ? parseInt(minMatch[1], 10) : 0);
  if (totalMinutes > 0) {
    return new Date(Date.now() + totalMinutes * 60 * 1000);
  }
  return null;
}

  const quantity = Number(data.quantity) || 1;
  const initialQuantity = Number(data.initialQuantity) || quantity;
  const location = data.vendorLocation || vendor.location || {
    type: 'Point',
    coordinates: [72.9348, 19.1462],
  };
  const pickupAddress = data.vendorLocation?.pickupAddress || data.pickupAddress || vendor.location?.pickupAddress || 'Navi Mumbai, Thane';

  const cookingStatus = data.cookingStatus || data.timeReady || 'Ready now';
  const readyAt = calculateReadyAt(cookingStatus, data.readyAt);

  const food = await Food.create({
    name: data.name,
    description: data.description || 'Delicious freshly prepared home-cooked specialty.',
    price: Number(data.price),
    quantity,
    initialQuantity,
    isVeg: data.isVeg !== undefined ? data.isVeg : true,
    diet: data.diet || (data.isVeg !== false ? 'veg' : 'non-veg'),
    category: data.category || 'Main Course',
    timeReady: data.timeReady || cookingStatus,
    cookingStatus,
    readyAt,
    image: data.image || DEFAULT_FOOD_SVG,
    spiciness: data.spiciness || 'Medium',
    fulfillmentOptions: data.fulfillmentOptions || 'BOTH',
    location,
    pickupAddress,
    vendor: vendor._id,
    status: quantity > 0 ? 'AVAILABLE' : 'SOLD_OUT',
    available: quantity > 0,
  });

  await FoodAvailability.create({
    food: food._id,
    vendor: vendor._id,
    quantity: food.quantity,
    available: food.available,
    status: food.status,
  });

  const populated = await Food.findById(food._id).populate('vendor');
  return populated;
}

export async function updateFood(foodId, data) {
  if (!foodId || !mongoose.Types.ObjectId.isValid(foodId)) {
    return null;
  }

  const updatePayload = { ...data };

  if (updatePayload.quantity !== undefined) {
    const qty = Number(updatePayload.quantity);
    updatePayload.quantity = qty;
    updatePayload.available = qty > 0;
    updatePayload.status = qty === 0 ? 'SOLD_OUT' : qty <= 3 ? 'LOW_STOCK' : 'AVAILABLE';
  } else if (updatePayload.isAvailable !== undefined) {
    updatePayload.available = updatePayload.isAvailable;
    if (!updatePayload.isAvailable) {
      updatePayload.status = 'SOLD_OUT';
    }
  }

  if (updatePayload.cookingStatus || updatePayload.timeReady || updatePayload.readyAt !== undefined) {
    updatePayload.readyAt = calculateReadyAt(
      updatePayload.cookingStatus || updatePayload.timeReady,
      updatePayload.readyAt
    );
  }

  const food = await Food.findByIdAndUpdate(foodId, updatePayload, { returnDocument: 'after' }).populate('vendor');
  
  if (food) {
    await FoodAvailability.findOneAndUpdate(
      { food: food._id },
      {
        quantity: food.quantity,
        available: food.available,
        status: food.status,
        lastUpdated: new Date(),
      },
      { upsert: true }
    );
  }
  return food;
}

export async function deleteFood(foodId) {
  if (!foodId || !mongoose.Types.ObjectId.isValid(foodId)) {
    return null;
  }
  const food = await Food.findByIdAndDelete(foodId);
  await FoodAvailability.findOneAndDelete({ food: foodId });
  return food;
}

/**
 * Atomic quantity deduction to prevent overselling
 */
export async function deductFoodQuantity(foodId, qty) {
  if (!foodId || !mongoose.Types.ObjectId.isValid(foodId)) {
    throw new Error(`Invalid food ID: ${foodId}`);
  }

  const food = await Food.findOneAndUpdate(
    {
      _id: foodId,
      quantity: { $gte: qty },
      available: true,
    },
    {
      $inc: { quantity: -qty },
    },
    { returnDocument: 'after' }
  ).populate('vendor');

  if (!food) {
    const existing = await Food.findById(foodId);
    if (!existing || existing.quantity < qty) {
      throw new Error(`Insufficient quantity available (only ${existing ? existing.quantity : 0} left)`);
    }
    throw new Error('Food item is currently unavailable');
  }

  // Update availability status
  if (food.quantity === 0) {
    food.available = false;
    food.status = 'SOLD_OUT';
    await food.save();
  } else if (food.quantity <= 3) {
    food.status = 'LOW_STOCK';
    await food.save();
  }

  await FoodAvailability.findOneAndUpdate(
    { food: food._id },
    {
      quantity: food.quantity,
      available: food.available,
      status: food.status,
      lastUpdated: new Date(),
    },
    { upsert: true }
  );

  return food;
}
