import * as orderService from '../services/orderService.js';
import * as foodService from '../services/foodService.js';

export async function createOrder(req, res, next) {
  try {
    const order = await orderService.createOrder(req.user._id, req.body);

    // Real-time notifications via Socket.IO
    if (req.io) {
      // 1. Notify vendor of new order
      if (order.vendor?._id) {
        req.io.to(`vendor:${order.vendor._id}`).emit('order:created', order);
      }
      req.io.emit('order:created', order); // Broadcast to any active dashboard

      // 2. Broadcast updated food quantity to all connected users
      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const updatedFood = await foodService.getFoodById(item.food);
          if (updatedFood) {
            req.io.emit('food:availabilityUpdated', {
              foodId: updatedFood._id,
              quantity: updatedFood.quantity,
              available: updatedFood.available,
              isAvailable: updatedFood.available !== false && updatedFood.quantity > 0,
              status: updatedFood.status,
            });

            if (updatedFood.quantity === 0 || !updatedFood.available) {
              req.io.emit('food:soldOut', { foodId: updatedFood._id });
            }
          }
        }
      }
    }

    res.status(201).json({ success: true, data: order, order: order });
  } catch (err) {
    if (err.message && err.message.includes('Insufficient quantity')) {
      return res.status(409).json({ success: false, message: err.message, error: err.message });
    }
    next(err);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { status, rejectionReason, note } = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, {
      status,
      rejectionReason,
      note,
    });

    if (req.io) {
      req.io.to(`order:${order._id}`).emit('order:statusUpdated', order);
      if (order.resident?._id || order.resident) {
        req.io.to(`user:${order.resident._id || order.resident}`).emit('order:statusUpdated', order);
      }
      req.io.emit('order:statusUpdated', order);
    }

    res.json({ success: true, data: order, order: order });
  } catch (err) {
    next(err);
  }
}

export async function getOrders(req, res, next) {
  try {
    const orders = await orderService.getOrders(req.query);
    res.json({ success: true, count: orders.length, data: orders, orders: orders });
  } catch (err) {
    next(err);
  }
}

export async function getOrderById(req, res, next) {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order, order: order });
  } catch (err) {
    next(err);
  }
}
