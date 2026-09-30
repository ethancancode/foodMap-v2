import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Food from '../models/Food.js';
import FoodAvailability from '../models/FoodAvailability.js';
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
  let totalDiscount = 0;
  let isOrderSurplus = false;
  let maxSurplusDiscount = 0;

  for (const item of items) {
    const food = await deductFoodQuantity(item.foodId, Number(item.quantity) || 1);
    const isSurplus = Boolean(food.isSurplusRescue || food.surplusStatus === 'SURPLUS');
    const discount = (isSurplus && food.surplusDiscount > 0) ? food.surplusDiscount : 0;

    if (isSurplus) {
      isOrderSurplus = true;
      if (discount > maxSurplusDiscount) maxSurplusDiscount = discount;
    }

    const origPrice = Number(food.price) || 0;
    const finalUnitPrice = discount > 0
      ? Math.max(1, Math.round(origPrice * (1 - discount / 100)))
      : origPrice;

    const qty = Number(item.quantity) || 1;
    const itemTotal = finalUnitPrice * qty;
    const itemDiscount = (origPrice - finalUnitPrice) * qty;

    subtotal += itemTotal;
    totalDiscount += itemDiscount;

    orderItems.push({
      food: food._id,
      name: food.name,
      price: finalUnitPrice,
      quantity: qty,
      totalPrice: itemTotal,
    });
  }

  const normalizedOrderType = (data.orderType || data.fulfillment || 'PICKUP').toUpperCase();
  const deliveryFee = normalizedOrderType === 'DELIVERY' ? 30 : 0;
  const platformFee = 5;
  const totalAmount = subtotal + deliveryFee + platformFee;
  const orderNumber = `#FM${Math.floor(1000 + Math.random() * 9000)}`;

  const primaryFood = await Food.findById(items[0]?.foodId).populate('vendor');

  const resolvedPickupAddress =
    primaryFood?.pickupAddress ||
    primaryFood?.location?.pickupAddress ||
    vendor.pickupAddress ||
    vendor.location?.pickupAddress ||
    vendor.location?.address ||
    'Seawoods, Navi Mumbai';

  // Determine resident's current live location snapshot
  const residentCoords = data.residentLocation?.coordinates || (user?.location?.coordinates?.length === 2 ? user.location.coordinates : null);
  const residentAddress = data.residentLocation?.address || user?.location?.address || '';

  // If resident provided real live GPS coordinates at checkout, update their user record as well
  if (residentCoords && residentCoords.length === 2 && (residentCoords[0] !== 73.0188 || residentCoords[1] !== 19.0225)) {
    try {
      await User.findByIdAndUpdate(userId, {
        location: {
          type: 'Point',
          coordinates: residentCoords,
          address: residentAddress || 'Current Live Location',
        }
      });
    } catch (uErr) {
      console.warn('[OrderService] Could not update user location:', uErr.message);
    }
  }

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
    discountAmount: totalDiscount,
    isSurplusRescue: isOrderSurplus,
    surplusDiscount: maxSurplusDiscount,
    totalAmount,
    status: 'PENDING',
    orderType: normalizedOrderType === 'DELIVERY' ? 'DELIVERY' : 'PICKUP',
    readyAt: primaryFood?.readyAt || data.readyAt || null,
    cookingStatus: primaryFood?.cookingStatus || primaryFood?.timeReady || data.cookingStatus || data.timeReady || null,
    pickupAddress: resolvedPickupAddress,
    specialInstructions: data.specialInstructions,
    residentLocation: residentCoords ? {
      type: 'Point',
      coordinates: residentCoords,
      address: residentAddress,
    } : undefined,
    timeline: [
      {
        status: 'PENDING',
        note: 'Order placed by resident, waiting for kitchen acceptance',
        timestamp: new Date(),
      },
    ],
  });

  const populated = await Order.findById(order._id)
    .populate({
      path: 'vendor',
      select: 'businessName category pickupAddress location rating totalReviews user',
      populate: { path: 'user', select: 'name phone email avatar' }
    })
    .populate('resident', 'name phone location');

  return populated;
}

export async function updateOrderStatus(orderId, { status, rejectionReason, note, isViewedByResident }) {
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

  const prevStatus = order.status;
  if (status) {
    const normalizedStatus = status.toUpperCase();
    order.status = normalizedStatus;
    if (rejectionReason !== undefined) order.rejectionReason = rejectionReason;
    
    order.timeline.push({
      status: normalizedStatus,
      timestamp: new Date(),
      note: note || (rejectionReason ? `Order cancelled: ${rejectionReason}` : `Status updated to ${normalizedStatus}`),
    });

    // If order was cancelled / rejected and was not already cancelled, restore dish portion quantities
    if (['CANCELLED', 'REJECTED'].includes(normalizedStatus) && !['CANCELLED', 'REJECTED'].includes(prevStatus)) {
      if (order.items && order.items.length > 0) {
        for (const itm of order.items) {
          const foodId = itm.food?._id || itm.food;
          if (foodId && mongoose.Types.ObjectId.isValid(foodId)) {
            try {
              await Food.findByIdAndUpdate(foodId, {
                $inc: { quantity: itm.quantity || 1 },
                $set: { available: true, isAvailable: true }
              });
              const updatedF = await Food.findById(foodId);
              if (updatedF) {
                await FoodAvailability.findOneAndUpdate(
                  { food: updatedF._id },
                  { quantity: updatedF.quantity, available: true, status: 'AVAILABLE', lastUpdated: new Date() },
                  { upsert: true }
                );
              }
            } catch (invErr) {
              console.warn('[OrderService] Non-fatal inventory restoration warning:', invErr.message);
            }
          }
        }
      }
    }
  }

  if (isViewedByResident !== undefined) {
    order.isViewedByResident = isViewedByResident;
  }

  await order.save();
  const populatedOrder = await Order.findById(order._id)
    .populate({
      path: 'vendor',
      select: 'businessName category pickupAddress location rating totalReviews user',
      populate: { path: 'user', select: 'name phone email avatar' }
    })
    .populate('resident', 'name phone location');

  return populatedOrder || order;
}


export async function getOrders(filters = {}) {
  const query = {};
  if (filters.resident && mongoose.Types.ObjectId.isValid(filters.resident)) query.resident = filters.resident;
  if (filters.vendor && mongoose.Types.ObjectId.isValid(filters.vendor)) query.vendor = filters.vendor;
  if (filters.status) query.status = filters.status.toUpperCase();

  return await Order.find(query)
    .populate({
      path: 'vendor',
      select: 'businessName category pickupAddress location rating totalReviews user',
      populate: { path: 'user', select: 'name phone email avatar' }
    })
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
    .populate({
      path: 'vendor',
      select: 'businessName category pickupAddress location rating totalReviews user',
      populate: { path: 'user', select: 'name phone email avatar' }
    })
    .populate('resident', 'name phone location')
    .populate('deliveryPartner', 'name phone location');
}

export async function getAvailableDeliveries() {
  return await Order.find({
    orderType: 'DELIVERY',
    status: { $in: ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP'] },
    deliveryStatus: { $in: ['UNASSIGNED', null] },
  })
    .populate({
      path: 'vendor',
      select: 'businessName pickupAddress location phone user',
      populate: { path: 'user', select: 'name phone' },
    })
    .populate('resident', 'name phone location')
    .sort({ createdAt: -1 });
}

export async function getMyDeliveries(courierUserId) {
  return await Order.find({
    deliveryPartner: courierUserId,
  })
    .populate({
      path: 'vendor',
      select: 'businessName pickupAddress location phone user',
      populate: { path: 'user', select: 'name phone' },
    })
    .populate('resident', 'name phone location')
    .sort({ updatedAt: -1 });
}

export async function acceptDeliveryAssignment(orderId, courierUser) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }
  if (order.deliveryPartner && order.deliveryPartner.toString() !== courierUser._id.toString()) {
    throw new Error('This delivery has already been assigned to another courier');
  }

  order.deliveryPartner = courierUser._id;
  order.deliveryPartnerName = courierUser.name || 'Delivery Partner';
  order.deliveryPartnerPhone = courierUser.phone || '';
  order.deliveryStatus = 'ASSIGNED';
  order.timeline.push({
    status: 'DELIVERY_ASSIGNED',
    timestamp: new Date(),
    note: `Delivery partner ${courierUser.name || 'Courier'} assigned to this order`,
  });

  await order.save();
  return await getOrderById(order._id);
}

export async function updateDeliveryStatus(orderId, status, courierUserId) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }
  if (order.deliveryPartner && order.deliveryPartner.toString() !== courierUserId.toString()) {
    throw new Error('Not authorized to update this delivery');
  }

  const validStatuses = ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid delivery status: ${status}`);
  }

  order.deliveryStatus = status;
  order.status = status;
  order.timeline.push({
    status,
    timestamp: new Date(),
    note: `Order status updated to ${status} by delivery partner`,
  });

  await order.save();
  return await getOrderById(order._id);
}

export async function updateDeliveryLocation(orderId, coordinates, address) {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new Error('Order not found');
  }

  order.deliveryPartnerLocation = {
    coordinates,
    address: address || '',
    updatedAt: new Date(),
  };

  await order.save();
  return order;
}

