import mongoose from 'mongoose';
import Food from '../models/Food.js';
import FoodAvailability from '../models/FoodAvailability.js';
import Vendor from '../models/Vendor.js';

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

  const foods = await Food.find(query)
    .populate('vendor', 'businessName category rating totalReviews status location pickupAddress coverImage')
    .sort({ createdAt: -1 });

  return foods;
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
      businessName: data.vendorName || "Anjali's Kitchen",
      location: data.vendorLocation || {
        type: 'Point',
        coordinates: [72.9348, 19.1462],
        pickupAddress: 'Bhandup West, Mumbai',
      },
    });
  }

  const quantity = Number(data.quantity) || 1;
  const initialQuantity = Number(data.initialQuantity) || quantity;
  const location = data.vendorLocation || vendor.location || {
    type: 'Point',
    coordinates: [72.9348, 19.1462],
  };

  const food = await Food.create({
    name: data.name,
    description: data.description || 'Delicious freshly prepared home-cooked specialty.',
    price: Number(data.price),
    quantity,
    initialQuantity,
    isVeg: data.isVeg !== undefined ? data.isVeg : true,
    diet: data.diet || (data.isVeg !== false ? 'veg' : 'non-veg'),
    category: data.category || 'Main Course',
    timeReady: data.timeReady || data.cookingStatus || 'Ready Now',
    cookingStatus: data.cookingStatus || data.timeReady || 'Ready now',
    image: data.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcCn3i8k4gYk-jLV5MXuqSONW-8QpGOpQ4yYcs-5HUarOFUR1kCq3boeWmwl-f7Seo8MV5gGPaYolyo8w_lFVLtdBGN11e9huwwnLqF4wUGtqAbHcuebFi79m5evx_bXkagJMfR6xqZSl0A3UhdKsMtGL_SyAxPz6EhwbTtY7oWANHjY08Msx9WdC5GF0cpXi4h-eS9GA4sfMmh7CCZv7Lu_elTf3lY2oNae4dUF5Fxdr0ktu3Ed5C',
    spiciness: data.spiciness || 'Medium',
    location,
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

  const food = await Food.findByIdAndUpdate(foodId, updatePayload, { new: true }).populate('vendor');
  
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
    { new: true }
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
