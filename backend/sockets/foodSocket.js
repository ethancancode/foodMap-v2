export function registerFoodSocketHandlers(io, socket) {
  socket.on('food:subscribe', (foodId) => {
    socket.join(`food:${foodId}`);
  });

  socket.on('food:unsubscribe', (foodId) => {
    socket.leave(`food:${foodId}`);
  });
}
