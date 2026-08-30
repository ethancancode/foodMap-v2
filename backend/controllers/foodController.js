import * as foodService from '../services/foodService.js';

export async function getFoods(req, res, next) {
  try {
    const foods = await foodService.getAllFoods(req.query);
    res.json({ success: true, count: foods.length, data: foods, foods });
  } catch (err) {
    next(err);
  }
}

export async function getFoodById(req, res, next) {
  try {
    const food = await foodService.getFoodById(req.params.id);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }
    res.json({ success: true, data: food, food });
  } catch (err) {
    next(err);
  }
}

export async function createFood(req, res, next) {
  try {
    const food = await foodService.createFood(req.user._id, req.body);
    
    // Real-time broadcast
    if (req.io) {
      req.io.emit('food:created', food);
      req.io.emit('food:availabilityUpdated', {
        foodId: food._id,
        quantity: food.quantity,
        available: food.available,
        status: food.status,
      });
    }

    res.status(201).json({ success: true, data: food, food });
  } catch (err) {
    next(err);
  }
}

export async function updateFood(req, res, next) {
  try {
    const food = await foodService.updateFood(req.params.id, req.body);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }

    // Real-time broadcast
    if (req.io) {
      req.io.emit('food:updated', food);
      req.io.emit('food:availabilityUpdated', {
        foodId: food._id,
        quantity: food.quantity,
        available: food.available,
        status: food.status,
      });

      if (food.quantity === 0 || !food.available) {
        req.io.emit('food:soldOut', { foodId: food._id });
      }
    }

    res.json({ success: true, data: food, food });
  } catch (err) {
    next(err);
  }
}

export async function deleteFood(req, res, next) {
  try {
    const food = await foodService.deleteFood(req.params.id);
    if (!food) {
      return res.status(404).json({ success: false, message: 'Food item not found' });
    }
    
    // Real-time broadcast
    if (req.io) {
      req.io.emit('food:deleted', { foodId: req.params.id });
    }

    res.json({ success: true, message: 'Food deleted successfully', foodId: req.params.id });
  } catch (err) {
    next(err);
  }
}
