export function registerOrderSocketHandlers(io, socket) {
  socket.on('order:subscribe', (orderId) => {
    socket.join(`order:${orderId}`);
  });

  socket.on('order:unsubscribe', (orderId) => {
    socket.leave(`order:${orderId}`);
  });

  socket.on('vendor:join', (vendorId) => {
    socket.join(`vendor:${vendorId}`);
  });

  socket.on('user:join', (userId) => {
    socket.join(`user:${userId}`);
  });
}
