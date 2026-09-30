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

  socket.on('courier:join', (courierId) => {
    socket.join(`courier:${courierId}`);
    socket.join('delivery:couriers');
  });

  socket.on('delivery:location', (data) => {
    // data: { orderId, residentId, coordinates: [lng, lat], address, speed, heading }
    if (data?.orderId) {
      io.to(`order:${data.orderId}`).emit('delivery:locationUpdated', {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      if (data.residentId) {
        io.to(`user:${data.residentId}`).emit('delivery:locationUpdated', {
          ...data,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  });
}

