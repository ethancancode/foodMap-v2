import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dns from 'node:dns';

// Fix DNS resolution for MongoDB Atlas SRV on local / Windows environments
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  // Ignored
}

import { connectDB } from './config/database.js';
import { seedInitialData } from './config/seed.js';
import { initializeSocket } from './sockets/socket.js';
import { errorHandler } from './middleware/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import residentRoutes from './routes/residentRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import foodRoutes from './routes/foodRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO
const io = initializeSocket(server);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.IO instance to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Connect to MongoDB Atlas and seed
connectDB().then(() => {
  seedInitialData();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'FoodMap Backend API',
    time: new Date().toISOString(),
  });
});

// Frontend Vite Integration for unified port 3000 hosting
const isProduction = process.env.NODE_ENV === 'production';

async function setupFrontend() {
  const frontendDir = fs.existsSync(path.join(rootDir, 'frontend'))
    ? path.join(rootDir, 'frontend')
    : rootDir;

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const viteConfigFile = path.join(frontendDir, 'vite.config.js');

      const vite = await createViteServer({
        root: frontendDir,
        configFile: fs.existsSync(viteConfigFile) ? viteConfigFile : false,
        server: { middlewareMode: true, hmr: false },
        appType: 'spa',
      });

      app.use(vite.middlewares);

      // Express 5 compatible SPA fallback (no '*' regex pattern error)
      app.use(async (req, res, next) => {
        if (
          req.method !== 'GET' ||
          req.originalUrl.startsWith('/api') ||
          req.originalUrl.startsWith('/socket.io')
        ) {
          return next();
        }
        try {
          const indexPath = path.join(frontendDir, 'index.html');
          if (fs.existsSync(indexPath)) {
            let template = fs.readFileSync(indexPath, 'utf-8');
            template = await vite.transformIndexHtml(req.originalUrl, template);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          } else {
            next();
          }
        } catch (e) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
    } catch (e) {
      console.warn('[Vite Integration Notice]', e.message);
    }
  } else {
    const distPath = fs.existsSync(path.join(frontendDir, 'dist'))
      ? path.join(frontendDir, 'dist')
      : path.join(rootDir, 'dist');

    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.use((req, res, next) => {
        if (
          req.method !== 'GET' ||
          req.originalUrl.startsWith('/api') ||
          req.originalUrl.startsWith('/socket.io')
        ) {
          return next();
        }
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }
}

setupFrontend().catch((err) => {
  console.error('[Frontend Setup Error]', err);
});

// Error handling middleware
app.use(errorHandler);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[FoodMap Server] Running at http://0.0.0.0:${PORT}`);
});

export { app, server, io };
