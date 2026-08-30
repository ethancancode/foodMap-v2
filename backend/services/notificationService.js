import Notification from '../models/Notification.js';

export async function createNotification({ recipient, sender, type, title, message, order }) {
  return await Notification.create({
    recipient,
    sender,
    type,
    title,
    message,
    order,
  });
}

export async function getUserNotifications(userId) {
  return await Notification.find({ recipient: userId }).sort({ createdAt: -1 }).limit(20);
}
