import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { generateSecret } from 'otplib';
import { connectDB } from '../config/database.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Resident from '../models/Resident.js';
import Food from '../models/Food.js';
import FoodAvailability from '../models/FoodAvailability.js';
import Order from '../models/Order.js';
import { SubscriptionPlan, Subscription } from '../models/Subscription.js';
import Notification from '../models/Notification.js';

async function seed() {
  console.log('[Seed] Connecting to MongoDB...');
  await connectDB();

  console.log('[Seed] Clearing existing demo data...');
  const demoPhones = [
    '9999999999', '+919999999999',
    '8888888888', '+918888888888',
    '9876543210', '+919876543210',
    '9876543222', '+919876543222',
    '9820123456', '+919820123456'
  ];

  const existingDemoUsers = await User.find({ phone: { $in: demoPhones } }).select('_id');
  const demoUserIds = existingDemoUsers.map(u => u._id);
  const existingDemoVendors = await Vendor.find({ user: { $in: demoUserIds } }).select('_id');
  const demoVendorIds = existingDemoVendors.map(v => v._id);

  await Promise.all([
    User.deleteMany({ phone: { $in: demoPhones } }),
    Vendor.deleteMany({ user: { $in: demoUserIds } }),
    Resident.deleteMany({ user: { $in: demoUserIds } }),
    Food.deleteMany({ vendor: { $in: demoVendorIds } }),
    SubscriptionPlan.deleteMany({}),
    Subscription.deleteMany({}),
    Order.deleteMany({ orderNumber: { $in: ['#FM4821', '#FM4822', '#FM4820'] } }),
  ]);

  console.log('[Seed] Creating demo accounts...');
  const defaultPassword = await bcrypt.hash('123456', 10);

  // 1. Admin
  const admin = await User.create({
    phone: '9999999999',
    name: 'FoodMap Admin',
    role: 'admin',
    password: defaultPassword,
    totpSecret: generateSecret(),
    isTotpSetup: true,
    isVerified: true,
    isOnboarded: true,
    location: {
      type: 'Point',
      coordinates: [73.0188, 19.0225],
      address: 'FoodMap Operations HQ, Seawoods, Navi Mumbai',
    },
  });

  // 2. Delivery Partner
  const courier = await User.create({
    phone: '8888888888',
    name: 'Raju Delivery Express',
    role: 'delivery_partner',
    password: defaultPassword,
    totpSecret: generateSecret(),
    isTotpSetup: true,
    isVerified: true,
    isOnboarded: true,
    location: {
      type: 'Point',
      coordinates: [73.0195, 19.0235],
      address: 'Seawoods Station Junction, Navi Mumbai',
    },
  });

  // 3. Verified Kitchen Vendor (Chef Ananya)
  const vendorUser1 = await User.create({
    phone: '9876543210',
    name: 'Chef Ananya Sharma',
    role: 'vendor',
    password: defaultPassword,
    totpSecret: generateSecret(),
    isTotpSetup: true,
    isVerified: true,
    isOnboarded: true,
    location: {
      type: 'Point',
      coordinates: [73.0175, 19.0210],
      address: 'Sector 42, Seawoods, Navi Mumbai',
    },
  });

  const vendor1 = await Vendor.create({
    user: vendorUser1._id,
    businessName: "Ananya's Royal Rasoi",
    category: 'North Indian & Thali',
    bio: 'Preserving authentic multi-generational family recipes with zero artificial preservatives.',
    experience: '12 years home chef experience',
    status: 'ONLINE',
    rating: 4.9,
    totalReviews: 48,
    verificationStatus: 'VERIFIED',
    followersCount: 34,
    subscriberCount: 8,
    location: {
      type: 'Point',
      coordinates: [73.0175, 19.0210],
      pickupAddress: 'B-402, Heritage Palms, Sector 42, Seawoods West, Navi Mumbai',
    },
  });

  // 4. Pending Verification Kitchen Vendor (Chef Vikram)
  const vendorUser2 = await User.create({
    phone: '9876543222',
    name: 'Chef Vikram Patil',
    role: 'vendor',
    password: defaultPassword,
    totpSecret: generateSecret(),
    isTotpSetup: true,
    isVerified: true,
    isOnboarded: true,
    location: {
      type: 'Point',
      coordinates: [73.0210, 19.0240],
      address: 'Sector 44, Seawoods, Navi Mumbai',
    },
  });

  const vendor2 = await Vendor.create({
    user: vendorUser2._id,
    businessName: "Patil's Homemade Treats",
    category: 'Maharashtrian & Bakery',
    bio: 'Artisanal breads, hand-ground masalas and coastal treats made fresh every dawn.',
    status: 'ONLINE',
    rating: 4.6,
    totalReviews: 19,
    verificationStatus: 'PENDING',
    followersCount: 15,
    subscriberCount: 3,
    location: {
      type: 'Point',
      coordinates: [73.0210, 19.0240],
      pickupAddress: 'Shop 4, Sunrise Plaza, Sector 44, Seawoods, Navi Mumbai',
    },
  });

  // 5. Resident (Priya Mehta)
  const residentUser = await User.create({
    phone: '9820123456',
    name: 'Priya Mehta',
    role: 'resident',
    password: defaultPassword,
    totpSecret: generateSecret(),
    gender: 'female',
    occupation: 'working',
    allergies: ['Peanuts'],
    isTotpSetup: true,
    isVerified: true,
    isOnboarded: true,
    location: {
      type: 'Point',
      coordinates: [73.0190, 19.0220],
      address: 'Flat 502, Palm Beach Residency, Seawoods, Navi Mumbai',
    },
  });

  await Resident.create({
    user: residentUser._id,
    gender: 'female',
    occupation: 'working',
    preferences: {
      radarDistanceLimit: 1200,
      dietaryPreference: 'veg',
      notificationsEnabled: true,
    },
  });

  console.log('[Seed] Adding cooked meals & marketplace products...');

  // Dishes for Vendor 1
  const dishes = [
    {
      vendor: vendor1._id,
      name: 'Paneer Butter Masala & Tawa Paratha',
      description: 'Rich slow-simmered cottage cheese in creamy cashew tomato gravy, served with 3 soft parathas.',
      price: 180,
      quantity: 14,
      initialQuantity: 25,
      subscriberReservedQty: 8,
      isVeg: true,
      diet: 'veg',
      category: 'Main Course',
      productType: 'COOKED_MEAL',
      isMarketplace: false,
      allergens: ['Dairy', 'Cashews'],
      spiciness: 'Medium',
      cookingStatus: 'Freshly Prepared',
      fulfillmentOptions: 'BOTH',
      location: vendor1.location,
    },
    {
      vendor: vendor1._id,
      name: 'Dal Makhani & Jeera Rice (Surplus Rescue)',
      description: 'Slow-cooked 16-hour black lentils with aromatic cumin rice. Discounted to prevent food waste.',
      price: 160,
      quantity: 5,
      initialQuantity: 15,
      subscriberReservedQty: 3,
      isVeg: true,
      diet: 'veg',
      category: 'Main Course',
      productType: 'COOKED_MEAL',
      isMarketplace: false,
      surplusStatus: 'SURPLUS',
      surplusDiscount: 30,
      isSurplusRescue: true,
      allergens: ['Dairy'],
      spiciness: 'Mild',
      cookingStatus: 'Ready now',
      fulfillmentOptions: 'BOTH',
      location: vendor1.location,
    },
    {
      vendor: vendor1._id,
      name: "Dadi's Homemade Mango Pickle (500g)",
      description: 'Traditional sun-cured raw mango pickle seasoned with mustard seeds, fenugreek, and cold-pressed oil.',
      price: 190,
      quantity: 20,
      initialQuantity: 20,
      isVeg: true,
      diet: 'veg',
      category: 'Pickles & Condiments',
      productType: 'PICKLES',
      isMarketplace: true,
      allergens: ['Mustard'],
      spiciness: 'Hot',
      fulfillmentOptions: 'BOTH',
      location: vendor1.location,
    },
    {
      vendor: vendor2._id,
      name: 'Artisan Multigrain Sourdough Loaf',
      description: 'Wild yeast fermented for 24 hours. Crisp blistered crust with a light open crumb.',
      price: 150,
      quantity: 12,
      initialQuantity: 15,
      isVeg: true,
      diet: 'veg',
      category: 'Bakery',
      productType: 'BAKERY',
      isMarketplace: true,
      allergens: ['Gluten'],
      fulfillmentOptions: 'BOTH',
      location: vendor2.location,
    },
    {
      vendor: vendor2._id,
      name: 'Crispy Kerala Banana Chips (250g)',
      description: 'Thinly sliced raw Nendran bananas fried in pure cold-pressed coconut oil, sprinkled with sea salt.',
      price: 95,
      quantity: 28,
      initialQuantity: 30,
      isVeg: true,
      diet: 'veg',
      category: 'Snacks',
      productType: 'SNACKS',
      isMarketplace: true,
      allergens: [],
      fulfillmentOptions: 'BOTH',
      location: vendor2.location,
    },
  ];

  for (const d of dishes) {
    const food = await Food.create(d);
    await FoodAvailability.create({
      food: food._id,
      vendor: food.vendor,
      quantity: food.quantity,
      available: true,
      status: 'AVAILABLE',
    });
  }

  console.log('[Seed] Creating Subscription Plans...');
  const plan1 = await SubscriptionPlan.create({
    vendor: vendor1._id,
    name: 'Executive Healthy Lunch Tiffin',
    description: 'Fresh warm home-cooked lunch delivered every weekday: 1 Dal, 1 Sabzi, 3 Roti, Rice & Salad.',
    price: 2899,
    duration: 'monthly',
    mealsPerDay: 1,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    mealCategory: 'Lunch',
    cuisine: 'North Indian Home-style',
    maxSubscribers: 30,
    currentSubscribers: 8,
    subscriberPriorityAllocation: 10,
    isActive: true,
  });

  const plan2 = await SubscriptionPlan.create({
    vendor: vendor1._id,
    name: 'Homestyle Comfort Dinner Plan',
    description: 'Light digestive evening meal prepared with low oil and high dietary fiber.',
    price: 3199,
    duration: 'monthly',
    mealsPerDay: 1,
    availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    mealCategory: 'Dinner',
    cuisine: 'Home-style Indian',
    maxSubscribers: 25,
    currentSubscribers: 5,
    subscriberPriorityAllocation: 8,
    isActive: true,
  });

  // Create active subscription for Priya
  await Subscription.create({
    plan: plan1._id,
    resident: residentUser._id,
    vendor: vendor1._id,
    status: 'ACTIVE',
    startDate: new Date(),
    endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    mealsRemaining: 19,
    totalMeals: 22,
    deliveryAddress: residentUser.location.address,
    paymentStatus: 'PAID',
  });

  console.log('[Seed] Creating sample orders for delivery workflow demo...');
  // Order 1: Ready for pickup so delivery partner can accept it in Demo 8 & 9!
  const liveOrder = await Order.create({
    orderNumber: '#FM4821',
    resident: residentUser._id,
    vendor: vendor1._id,
    foodName: 'Paneer Butter Masala & Tawa Paratha',
    vendorName: vendor1.businessName,
    residentName: residentUser.name,
    residentPhone: residentUser.phone,
    quantity: 1,
    subtotal: 180,
    deliveryFee: 30,
    platformFee: 5,
    totalAmount: 215,
    status: 'READY_FOR_PICKUP',
    orderType: 'DELIVERY',
    deliveryStatus: 'UNASSIGNED',
    pickupAddress: vendor1.location.pickupAddress,
    residentLocation: residentUser.location,
    timeline: [
      { status: 'PENDING', timestamp: new Date(Date.now() - 25 * 60000), note: 'Order placed by resident' },
      { status: 'ACCEPTED', timestamp: new Date(Date.now() - 22 * 60000), note: 'Accepted by kitchen' },
      { status: 'PREPARING', timestamp: new Date(Date.now() - 18 * 60000), note: 'Freshly simmering' },
      { status: 'READY_FOR_PICKUP', timestamp: new Date(Date.now() - 5 * 60000), note: 'Packed hot and awaiting courier' },
    ],
  });

  console.log('[Seed] Created active demo order:', liveOrder.orderNumber);
  console.log('[Seed] Demo accounts ready:');
  console.log(' - Admin: 9999999999');
  console.log(' - Delivery: 8888888888');
  console.log(' - Vendor (Verified): 9876543210');
  console.log(' - Vendor (Pending): 9876543222');
  console.log(' - Resident: 9820123456');

  await mongoose.disconnect();
  console.log('[Seed] Finished successfully!');
}

seed().catch((err) => {
  console.error('[Seed Error]', err);
  process.exit(1);
});
