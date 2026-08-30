import * as notificationService from '../services/notificationService.js';
import Notification from '../models/Notification.js';

export async function getNotifications(req, res, next) {
  try {
    const notifications = await notificationService.getUserNotifications(req.user._id);
    res.json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req, res, next) {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}
