import GroupOrder from '../models/GroupOrder.js';
import * as orderService from '../services/orderService.js';

export async function createGroupOrder(req, res, next) {
  try {
    const code = `GRP-${Math.floor(1000 + Math.random() * 9000)}`;
    const group = await GroupOrder.create({
      code,
      host: req.user._id,
      hostName: req.user.name || 'Resident Host',
      deliveryAddress: req.body.deliveryAddress || req.user.location?.address || 'Community Hub',
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
      await group.save();
    }

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
    const { foodId, name, price, quantity } = req.body;
    const group = await GroupOrder.findOne({ code });
    if (!group) {
      return res.status(404).json({ success: false, message: 'Group order not found' });
    }

    let member = group.members.find(
      (m) => m.user.toString() === req.user._id.toString()
    );

    if (!member) {
      member = {
        user: req.user._id,
        name: req.user.name || 'Resident',
        items: [],
      };
      group.members.push(member);
      member = group.members[group.members.length - 1];
    }

    const existingItem = member.items.find(
      (i) => i.food.toString() === foodId.toString()
    );

    if (existingItem) {
      existingItem.quantity += Number(quantity) || 1;
    } else {
      member.items.push({
        food: foodId,
        name,
        price: Number(price),
        quantity: Number(quantity) || 1,
      });
    }

    await group.save();

    if (req.io) {
      req.io.to(`group:${code}`).emit('groupOrder:updated', group);
      req.io.emit('groupOrder:updated', group);
    }

    res.json({ success: true, message: 'Item added to group order', data: group, group });
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
      orderType: req.body.orderType || 'DELIVERY',
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
