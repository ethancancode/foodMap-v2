import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/foodmap';

async function clearAccounts() {
  try {
    console.log(`[FoodMap] Connecting to MongoDB: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('[FoodMap] Connected successfully.');

    // Delete accounts across users, vendors, residents, and orders
    const usersResult = await mongoose.connection.collection('users').deleteMany({});
    const vendorsResult = await mongoose.connection.collection('vendors').deleteMany({});
    const residentsResult = await mongoose.connection.collection('residents').deleteMany({});
    const ordersResult = await mongoose.connection.collection('orders').deleteMany({});

    console.log('\n=======================================');
    console.log('  ACCOUNTS SUCCESSFULLY CLEARED');
    console.log('=======================================');
    console.log(`- Users deleted:     ${usersResult.deletedCount}`);
    console.log(`- Vendors deleted:   ${vendorsResult.deletedCount}`);
    console.log(`- Residents deleted: ${residentsResult.deletedCount}`);
    console.log(`- Orders deleted:    ${ordersResult.deletedCount}`);
    console.log('=======================================\n');
    console.log('You can now test fresh sign-ups and new vendor onboarding!\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[FoodMap] Error clearing database accounts:', err.message);
    process.exit(1);
  }
}

clearAccounts();
