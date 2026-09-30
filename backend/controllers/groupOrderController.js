import mongoose from 'mongoose';
import GroupOrder from '../models/GroupOrder.js';
import Food from '../models/Food.js';
import * as orderService from '../services/orderService.js';

function isGroupMember(group, userId) {
  return group.members.some((member) => member.user.toString() === userId.toString());
}

function recalculateGroupTotal(group) {
  group.total = group.members.reduce(
    (total, member) => total + member.items.reduce(
      (memberTotal, item) => memberTotal + Number(item.price) * Number(item.quantity),
      0
    ),
    0
  );
}

function getGroupFoodQuantity(group, foodId) {
  return group.members.reduce((total, member) => total + member.items.reduce(
    (memberTotal, item) => memberTotal + (item.food.toString() === foodId.toString() ? Number(item.quantity) : 0),
    0
  ), 0);
}

async function publishGroupUpdate(req, group, code) {
  await group.populate('members.items.food');
  if (req.io) {
    req.io.to(`group:${code}`).emit('groupOrder:updated', group);
    req.io.emit('groupOrder:updated', group);
  }
}

export async function createGroupOrder(req, res, next) {
  try {
    const code = `GRP-${Math.floor(1000 + Math.random() * 9000)}`;
    const group = await GroupOrder.create({
      code,
      host: req.user._id,
      hostName: req.user.name || 'Resident Host',
      deliveryAddress: req.body.deliveryAddress || req.user.location?.address || 'Community Hub',
      total: 0,
      members: [
        {
          user: req.user._id,
          name: req.user.name || 'Host',
          items: [],
        },
      ],
    });

    res.status(201).json({ success: true, message: 'Group order created', data: group, group });
  } catch (err) {
    next(err);
  }
}

export async function getGroupOrderByCode(req, res, next) {
  try {
    const code = req.params.code.toUpperCase();
    const group = await GroupOrder.findOne({ code })
      .populate('host', 'name phone')
      .populate('members.user', 'name phone avatar')
      .populate('members.items.food');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group order not found' });
    }

    recalculateGroupTotal(group);
    await group.save();
    res.json({ success: true, data: group, group });
  } catch (err) {
    next(err);
  }
}

export async function joinGroupOrder(req, res, next) {
  try {
    const code = req.params.code.toUpperCase();
    const group = await GroupOrder.findOne({ code });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group order not found' });
    }
    if (group.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: `Group order is ${group.status.toLowerCase()}` });
    }

    const alreadyMember = group.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!alreadyMember) {
      group.members.push({
        user: req.user._id,
        name: req.user.name || req.body.name || 'Resident',
        items: [],
      });
    }

    recalculateGroupTotal(group);
    await group.save();
    await group.populate('members.items.food');

    if (req.io) {
      req.io.to(`group:${code}`).emit('groupOrder:updated', group);
      req.io.emit('groupOrder:updated', group);
    }

    res.json({ success: true, message: 'Joined group order', data: group, group });
  } catch (err) {
    next(err);
  }
}

export async function addItemToGroupOrder(req, res, next) {
  try {
    const code = req.params.code.toUpperCase();
    const { foodId } = req.body;
    const quantity = req.body.quantity === undefined ? 1 : Number(req.body.quantity);
    const group = await GroupOrder.findOne({ code });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group order not found' });
    }
    if (group.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: `Group order is ${group.status.toLowerCase()}` });
    }
    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Join this group order before adding items' });
    }
    if (!mongoose.Types.ObjectId.isValid(foodId)) {
      return res.status(400).json({ success: false, message: 'A valid food item is required' });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive whole number' });
    }

    const food = await Food.findById(foodId);
    if (!food || food.available === false || food.quantity < 1) {
      return res.status(400).json({ success: false, message: 'This food item is currently unavailable' });
    }
    if (getGroupFoodQuantity(group, foodId) + quantity > food.quantity) {
      return res.status(400).json({ success: false, message: `Only ${food.quantity} portions are available` });
    }

    const member = group.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );
    const existingItem = member.items.find(
      (item) => item.food.toString() === foodId.toString()
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      member.items.push({
        food: food._id,
        name: food.name,
        price: food.price,
        quantity,
      });
    }

    recalculateGroupTotal(group);
    await group.save();
    await publishGroupUpdate(req, group, code);

    res.json({ success: true, message: 'Item added to group order', data: group, group });
  } catch (err) {
    next(err);
  }
}

export async function updateGroupOrderItem(req, res, next) {
  try {
    const code = req.params.code.toUpperCase();
    const quantity = Number(req.body.quantity);
    const group = await GroupOrder.findOne({ code });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group order not found' });
    }
    if (group.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: `Group order is ${group.status.toLowerCase()}` });
    }
    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Join this group order before changing items' });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be a positive whole number' });
    }

    const member = group.members.find((entry) => entry.user.toString() === req.user._id.toString());
    const item = member.items.find((entry) => entry.food.toString() === req.params.foodId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Group order item not found' });
    }
    if (quantity > item.quantity) {
      const food = await Food.findById(item.food);
      const reservedByOtherItems = getGroupFoodQuantity(group, item.food) - item.quantity;
      if (!food || food.available === false || reservedByOtherItems + quantity > food.quantity) {
        return res.status(400).json({ success: false, message: 'Requested quantity is not currently available' });
      }
    }

    item.quantity = quantity;
    recalculateGroupTotal(group);
    await group.save();
    await publishGroupUpdate(req, group, code);

    res.json({ success: true, message: 'Group order quantity updated', data: group, group });
  } catch (err) {
    next(err);
  }
}

export async function removeGroupOrderItem(req, res, next) {
  try {
    const code = req.params.code.toUpperCase();
    const group = await GroupOrder.findOne({ code });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group order not found' });
    }
    if (group.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: `Group order is ${group.status.toLowerCase()}` });
    }
    if (!isGroupMember(group, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Join this group order before changing items' });
    }

    const member = group.members.find((entry) => entry.user.toString() === req.user._id.toString());
    const itemIndex = member.items.findIndex((entry) => entry.food.toString() === req.params.foodId);
    if (itemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Group order item not found' });
    }

    member.items.splice(itemIndex, 1);
    recalculateGroupTotal(group);
    await group.save();
    await publishGroupUpdate(req, group, code);

    res.json({ success: true, message: 'Item removed from group order', data: group, group });
  } catch (err) {
    next(err);
  }
}

export async function checkoutGroupOrder(req, res, next) {
  try {
    const code = req.params.code.toUpperCase();
    const group = await GroupOrder.findOne({ code });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group order not found' });
    }
    if (group.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the group host can place this order' });
    }
    if (group.status !== 'OPEN') {
      return res.status(400).json({ success: false, message: `Group order is ${group.status.toLowerCase()}` });
    }

    const orderType = (req.body.orderType || 'DELIVERY').toUpperCase();
    if (!['DELIVERY', 'PICKUP'].includes(orderType)) {
      return res.status(400).json({ success: false, message: 'Order type must be DELIVERY or PICKUP' });
    }
    if (orderType === 'DELIVERY') {
      const foodIds = [...new Set(group.members.flatMap((member) => member.items.map((item) => item.food.toString())))];
      const pickupOnlyFood = await Food.findOne({ _id: { $in: foodIds }, fulfillmentOptions: 'PICKUP_ONLY' });
      if (pickupOnlyFood) {
        return res.status(400).json({ success: false, message: `${pickupOnlyFood.name} is available for pickup only` });
      }
    }

    recalculateGroupTotal(group);
    await group.save();

    // Collect all items across all members
    const consolidatedItems = [];
    const participants = [];

    group.members.forEach((m) => {
      if (m.items && m.items.length > 0) {
        const itemNames = [];
        m.items.forEach((item) => {
          consolidatedItems.push({
            foodId: item.food,
            quantity: item.quantity,
          });
          itemNames.push(`${item.name} x${item.quantity}`);
        });
        participants.push({
          userId: m.user,
          name: m.name,
          itemsSummary: itemNames.join(', '),
        });
      }
    });

    if (consolidatedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in this group order' });
    }

    // Place through existing atomic order creation!
    const orderData = {
      items: consolidatedItems,
      orderType,
      residentName: `${group.hostName} (Group ${code})`,
      pickupAddress: group.deliveryAddress,
      groupOrderId: code,
      groupParticipants: participants,
    };

    const order = await orderService.createOrder(group.host, orderData);

    group.status = 'COMPLETED';
    group.placedOrder = order._id;
    await group.save();

    if (req.io) {
      req.io.to(`group:${code}`).emit('groupOrder:placed', { orderId: order._id, order });
      req.io.emit('groupOrder:placed', { orderId: order._id, order });
    }

    res.status(201).json({
      success: true,
      message: 'Group order placed successfully!',
      order,
      group,
    });
  } catch (err) {
    next(err);
  }
}
