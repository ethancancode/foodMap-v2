import mongoose from 'mongoose';
import dns from 'node:dns';

// Fix DNS SRV lookup issues on Windows / local ISP networks
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {
  // Ignored if custom DNS environment
}

// Disable buffering to prevent 10s hang when Atlas IP whitelist is not configured
mongoose.set('bufferCommands', false);

export async function connectDB() {
  const uri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    'mongodb+srv://guptanikhil8424_db_user:RIGqlhsGX7FEikl8@cluster0.uxyfmlj.mongodb.net/?appName=Cluster0';

  try {
    console.log('[MongoDB] Connecting to database...');
    const conn = await mongoose.connect(uri, {
      dbName: 'foodmap',
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[MongoDB Connection Warning] ${error.message}`);
    console.log('[MongoDB] Tip: If connecting to Atlas from local machine, ensure your IP is added to MongoDB Atlas Network Access (0.0.0.0/0).');
    console.log('[MongoDB] Server running in resilient memory mode with instant sample data.');
    return null;
  }
}

export default connectDB;
