import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/foodmap';

async function clearOrders() {
  try {
    console.log(`[FoodMap] Connecting to MongoDB: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('[FoodMap] Connected successfully.');

    // Delete all orders without touching users, vendors, or food items
    const ordersResult = await mongoose.connection.collection('orders').deleteMany({});

    console.log('\n=======================================');
    console.log('       ORDERS SUCCESSFULLY CLEARED');
    console.log('=======================================');
    console.log(`- Orders deleted: ${ordersResult.deletedCount}`);
    console.log('=======================================\n');
    console.log('All order records have been cleared from your database.\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[FoodMap] Error clearing database orders:', err.message);
    process.exit(1);
  }
}

clearOrders();
