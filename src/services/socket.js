import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('[Socket.IO Frontend] Connected:', socket.id);
    });
  }
  return socket;
}

export function subscribeToVendor(vendorId) {
  const s = getSocket();
  s.emit('vendor:join', vendorId);
}

export function subscribeToUser(userId) {
  const s = getSocket();
  s.emit('user:join', userId);
}

export function subscribeToOrder(orderId) {
  const s = getSocket();
  s.emit('order:subscribe', orderId);
}

export function subscribeToFood(foodId) {
  const s = getSocket();
  s.emit('food:subscribe', foodId);
}

// Real-time Event Subscription Helpers
export function onFoodAvailabilityUpdated(cb) {
  const s = getSocket();
  const handler = (data) => cb(data);
  s.on('food:availabilityUpdated', handler);
  return () => s.off('food:availabilityUpdated', handler);
}

export function onFoodNewPosted(cb) {
  const s = getSocket();
  const handler = (data) => cb(data);
  s.on('food:created', handler);
  return () => s.off('food:created', handler);
}

export function onFoodUpdated(cb) {
  const s = getSocket();
  const handler = (data) => cb(data);
  s.on('food:updated', handler);
  return () => s.off('food:updated', handler);
}

export function onFoodDeleted(cb) {
  const s = getSocket();
  const handler = (data) => cb(data);
  s.on('food:deleted', handler);
  return () => s.off('food:deleted', handler);
}

export function onVendorUpdated(cb) {
  const s = getSocket();
  const handler = (data) => cb(data);
  s.on('vendor:statusUpdated', handler);
  return () => s.off('vendor:statusUpdated', handler);
}

export function onOrderStatusUpdated(cb) {
  const s = getSocket();
  const handler = (data) => cb(data);
  s.on('order:statusUpdated', handler);
  return () => s.off('order:statusUpdated', handler);
}

export const onOrderStatusChanged = onOrderStatusUpdated;

export function onOrderCreated(cb) {
  const s = getSocket();
  const handler = (data) => cb(data);
  s.on('order:created', handler);
  return () => s.off('order:created', handler);
}

export const onNewIncomingOrder = onOrderCreated;

export default getSocket;
