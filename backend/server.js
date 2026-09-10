import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { connectDB } from './config/database.js';
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Attach Socket.IO instance to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Clean up legacy root src folder and config now that all frontend code lives in frontend/
try {
  const legacySrc = path.join(rootDir, 'src');
  if (fs.existsSync(legacySrc)) fs.rmSync(legacySrc, { recursive: true, force: true });
  const legacyIndex = path.join(rootDir, 'index.html');
  if (fs.existsSync(legacyIndex)) fs.unlinkSync(legacyIndex);
  const legacyVite = path.join(rootDir, 'vite.config.js');
  if (fs.existsSync(legacyVite)) fs.unlinkSync(legacyVite);
  const legacyPublic = path.join(rootDir, 'public');
  if (fs.existsSync(legacyPublic)) fs.rmSync(legacyPublic, { recursive: true, force: true });
  const legacyBun = path.join(rootDir, 'bun.lock');
  if (fs.existsSync(legacyBun)) fs.unlinkSync(legacyBun);
  const deprecatedMapbox = path.join(rootDir, 'frontend', 'src', 'components', 'MapboxRadar.vue');
  if (fs.existsSync(deprecatedMapbox)) fs.unlinkSync(deprecatedMapbox);
} catch (e) {
  // Ignore permission or file lock errors
}

// Connect to MongoDB Atlas & auto-seed if empty
connectDB().then(async (conn) => {
  if (conn) {
    try {
      const Food = (await import('./models/Food.js')).default;
      const count = await Food.countDocuments();
      if (count === 0) {
        console.log('[FoodMap] Empty database detected. Auto-seeding 5 Ruia College demo kitchens & dishes...');
        const { seedRuiaDemoVendors } = await import('./scripts/seedRuiaDemoVendors.js');
        await seedRuiaDemoVendors();
      }
    } catch (e) {
      console.warn('[Auto-Seed Warning]', e.message);
    }
  }
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

// Seed Ruia Demo Vendors (Can be triggered directly on live Render deployment)
app.get('/api/seed-ruia', async (req, res) => {
  try {
    const { seedRuiaDemoVendors } = await import('./scripts/seedRuiaDemoVendors.js');
    await seedRuiaDemoVendors();
    res.json({
      success: true,
      message: '5 Ruia College (Matunga) demo vendors and fresh dishes seeded successfully to Atlas database!',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Frontend Vite Integration for unified port 3000 hosting
const isProduction = process.env.NODE_ENV === 'production';

async function setupFrontend() {
  const frontendDir = path.join(rootDir, 'frontend');

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
