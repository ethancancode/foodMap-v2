import { Server } from 'socket.io';
import { registerFoodSocketHandlers } from './foodSocket.js';
import { registerOrderSocketHandlers } from './orderSocket.js';

export function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Connected client: ${socket.id}`);

    registerFoodSocketHandlers(io, socket);
    registerOrderSocketHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Disconnected client: ${socket.id}`);
    });
  });

  return io;
}
