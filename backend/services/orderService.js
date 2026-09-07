import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Food from '../models/Food.js';
import Vendor from '../models/Vendor.js';
import User from '../models/User.js';
import { deductFoodQuantity } from './foodService.js';

export async function createOrder(userId, data) {
  const user = await User.findById(userId);
  const residentName = data.residentName || user?.name || 'Resident';
  const residentPhone = data.residentPhone || user?.phone || '';

  let vendorId = data.vendorId;
  let items = data.items;

  // If single item payload was passed directly from Checkout
  if ((!items || items.length === 0) && data.foodId) {
    items = [
      {
        foodId: data.foodId,
        quantity: Number(data.quantity) || 1,
      },
    ];
  }

  if (!items || items.length === 0) {
    throw new Error('Order must contain at least one food item');
  }

  // Find vendor from food item if not explicitly provided
  let vendor = null;
  if (vendorId && mongoose.Types.ObjectId.isValid(vendorId)) {
    vendor = await Vendor.findById(vendorId);
  }

  if (!vendor && items[0]?.foodId && mongoose.Types.ObjectId.isValid(items[0].foodId)) {
    const firstFood = await Food.findById(items[0].foodId);
    if (firstFood && firstFood.vendor) {
      vendor = await Vendor.findById(firstFood.vendor);
    }
  }

  if (!vendor) {
    vendor = await Vendor.findOne();
    if (!vendor) {
      throw new Error('Vendor not found for this food order');
    }
  }

  // Atomically deduct food quantities
  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const food = await deductFoodQuantity(item.foodId, Number(item.quantity) || 1);
    const itemTotal = food.price * (Number(item.quantity) || 1);
    subtotal += itemTotal;
    orderItems.push({
      food: food._id,
      name: food.name,
      price: food.price,
      quantity: Number(item.quantity) || 1,
      totalPrice: itemTotal,
    });
  }

  const normalizedOrderType = (data.orderType || data.fulfillment || 'PICKUP').toUpperCase();
  const deliveryFee = normalizedOrderType === 'DELIVERY' ? 30 : 0;
  const platformFee = 5;
  const totalAmount = subtotal + deliveryFee + platformFee;
  const orderNumber = `#FM${Math.floor(1000 + Math.random() * 9000)}`;

  const order = await Order.create({
    orderNumber,
    resident: userId,
    vendor: vendor._id,
    foodName: orderItems[0]?.name || 'Food Order',
    vendorName: vendor.businessName || 'Priya Kitchen',
    residentName,
    residentPhone,
    quantity: orderItems.reduce((acc, i) => acc + i.quantity, 0),
    pricePerUnit: orderItems[0]?.price || 0,
    items: orderItems,
    itemSummary: orderItems.map((i) => `${i.quantity}x ${i.name}`).join(', '),
    subtotal,
    deliveryFee,
    platformFee,
    totalAmount,
    status: 'ACCEPTED',
    orderType: normalizedOrderType === 'DELIVERY' ? 'DELIVERY' : 'PICKUP',
    pickupAddress: vendor.pickupAddress || vendor.location?.address || 'Bhandup West, Mumbai',
    specialInstructions: data.specialInstructions,
    timeline: [
      {
        status: 'ACCEPTED',
        note: 'Order auto-confirmed from kitchen inventory',
        timestamp: new Date(),
      },
    ],
  });

  const populated = await Order.findById(order._id)
    .populate('vendor', 'businessName category pickupAddress location rating totalReviews')
    .populate('resident', 'name phone location');

  return populated;
}

export async function updateOrderStatus(orderId, { status, rejectionReason, note }) {
  let query = {};
  if (mongoose.Types.ObjectId.isValid(orderId)) {
    query._id = orderId;
  } else {
    query.orderNumber = orderId;
  }

  const order = await Order.findOne(query);
  if (!order) {
    throw new Error('Order not found');
  }

  const normalizedStatus = (status || '').toUpperCase();
  order.status = normalizedStatus;
  if (rejectionReason) order.rejectionReason = rejectionReason;
  
  order.timeline.push({
    status: normalizedStatus,
    timestamp: new Date(),
    note: note || `Status updated to ${normalizedStatus}`,
  });

  await order.save();
  return await Order.findById(order._id)
    .populate('vendor', 'businessName category pickupAddress location')
    .populate('resident', 'name phone location');
}

export async function getOrders(filters = {}) {
  const query = {};
  if (filters.resident && mongoose.Types.ObjectId.isValid(filters.resident)) query.resident = filters.resident;
  if (filters.vendor && mongoose.Types.ObjectId.isValid(filters.vendor)) query.vendor = filters.vendor;
  if (filters.status) query.status = filters.status.toUpperCase();

  return await Order.find(query)
    .populate('vendor', 'businessName category pickupAddress location rating totalReviews')
    .populate('resident', 'name phone location')
    .sort({ createdAt: -1 });
}

export async function getOrderById(id) {
  let query = {};
  if (mongoose.Types.ObjectId.isValid(id)) {
    query._id = id;
  } else {
    query.orderNumber = id;
  }
  return await Order.findOne(query)
    .populate('vendor', 'businessName category pickupAddress location')
    .populate('resident', 'name phone location');
}
