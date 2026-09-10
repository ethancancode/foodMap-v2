import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/foodmap';

async function clearDishes() {
  try {
    console.log(`[FoodMap] Connecting to MongoDB: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('[FoodMap] Connected successfully.');

    // Delete dishes/foods and availability records
    const foodsResult = await mongoose.connection.collection('foods').deleteMany({});
    const availResult = await mongoose.connection.collection('foodavailabilities').deleteMany({}).catch(() => ({ deletedCount: 0 }));

    console.log('\n=======================================');
    console.log('       DISHES SUCCESSFULLY CLEARED');
    console.log('=======================================');
    console.log(`- Foods deleted:        ${foodsResult.deletedCount}`);
    console.log(`- Availabilities reset: ${availResult.deletedCount || 0}`);
    console.log('=======================================\n');
    console.log('All old map food items have been cleared.\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[FoodMap] Error clearing database dishes:', err.message);
    process.exit(1);
  }
}

clearDishes();
