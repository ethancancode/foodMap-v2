import mongoose from 'mongoose';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Food from '../models/Food.js';
import FoodAvailability from '../models/FoodAvailability.js';

export async function seedInitialData() {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  try {
    const foodCount = await Food.countDocuments().catch(() => 0);
    if (foodCount > 0) {
      console.log('[Seed] Database already has food items.');
      return;
    }

    console.log('[Seed] Initializing FoodMap database with sample vendors & food items...');

    // 1. Create or find Vendor User
    let vendorUser = await User.findOne({ phone: '+919820145892' }).catch(() => null);
    if (!vendorUser) {
      vendorUser = await User.create({
        phone: '+919820145892',
        name: 'Anjali Sharma',
        role: 'vendor',
        avatar:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCcCn3i8k4gYk-jLV5MXuqSONW-8QpGOpQ4yYcs-5HUarOFUR1kCq3boeWmwl-f7Seo8MV5gGPaYolyo8w_lFVLtdBGN11e9huwwnLqF4wUGtqAbHcuebFi79m5evx_bXkagJMfR6xqZSl0A3UhdKsMtGL_SyAxPz6EhwbTtY7oWANHjY08Msx9WdC5GF0cpXi4h-eS9GA4sfMmh7CCZv7Lu_elTf3lY2oNae4dUF5Fxdr0ktu3Ed5C',
        location: {
          type: 'Point',
          coordinates: [72.9355, 19.1492],
          address: 'Wing B, Flat 402, Green Meadows, Bhandup West, Mumbai',
        },
      });
    }

    // 2. Create Vendor profile
    let vendor = await Vendor.findOne({ user: vendorUser._id }).catch(() => null);
    if (!vendor) {
      vendor = await Vendor.create({
        user: vendorUser._id,
        businessName: "Anjali's Kitchen",
        category: 'North Indian Home Cook',
        bio: 'Authentic Punjabi home-cooked meals prepared with love and cold-pressed mustard oil daily.',
        status: 'ONLINE',
        rating: 4.9,
        totalReviews: 32,
        location: {
          type: 'Point',
          coordinates: [72.9355, 19.1492],
          pickupAddress: 'Wing B, Flat 402, Green Meadows, Bhandup West, Mumbai',
        },
      });
    }

    // 3. Create Sample Foods
    const foodsData = [
      {
        vendor: vendor._id,
        name: 'Authentic Rajma Chawal',
        description:
          'Slow-cooked Jammu red kidney beans in rich aromatic tomato gravy, served with steamed basmati rice and fresh mint chutney.',
        price: 80,
        quantity: 6,
        initialQuantity: 6,
        isVeg: true,
        category: 'Main Course',
        timeReady: 'Ready Now',
        available: true,
        status: 'AVAILABLE',
        image:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCcCn3i8k4gYk-jLV5MXuqSONW-8QpGOpQ4yYcs-5HUarOFUR1kCq3boeWmwl-f7Seo8MV5gGPaYolyo8w_lFVLtdBGN11e9huwwnLqF4wUGtqAbHcuebFi79m5evx_bXkagJMfR6xqZSl0A3UhdKsMtGL_SyAxPz6EhwbTtY7oWANHjY08Msx9WdC5GF0cpXi4h-eS9GA4sfMmh7CCZv7Lu_elTf3lY2oNae4dUF5Fxdr0ktu3Ed5C',
        spiciness: 'Medium',
        ingredients: ['Jammu Rajma', 'Basmati Rice', 'Pure Ghee', 'Fresh Coriander', 'Ginger Garlic'],
        nutrition: { calories: 420, protein: '14g' },
      },
      {
        vendor: vendor._id,
        name: 'Paneer Butter Masala & Rotis',
        description:
          'Soft malai paneer cubes simmered in creamy cashew-tomato makhani gravy, served with 3 soft phulkas.',
        price: 120,
        quantity: 4,
        initialQuantity: 4,
        isVeg: true,
        category: 'Main Course',
        timeReady: '15 mins',
        available: true,
        status: 'AVAILABLE',
        image:
          'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
        spiciness: 'Mild',
        ingredients: ['Malai Paneer', 'Fresh Cream', 'Butter', 'Whole Wheat Atta'],
        nutrition: { calories: 510, protein: '18g' },
      },
      {
        vendor: vendor._id,
        name: 'Crispy Stuffed Aloo Paratha (2 Pcs)',
        description:
          'Golden spiced potato stuffed parathas with fresh homemade white butter, curd, and tangy mango pickle.',
        price: 70,
        quantity: 8,
        initialQuantity: 8,
        isVeg: true,
        category: 'Breakfast',
        timeReady: 'Ready Now',
        available: true,
        status: 'AVAILABLE',
        image:
          'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80',
        spiciness: 'Medium',
        ingredients: ['Spiced Potatoes', 'Green Chillies', 'White Butter', 'Curd'],
        nutrition: { calories: 380, protein: '9g' },
      },
    ];

    for (const foodItem of foodsData) {
      const created = await Food.create(foodItem);
      await FoodAvailability.create({
        food: created._id,
        vendor: created.vendor,
        quantity: created.quantity,
        available: created.available,
        status: created.status,
      });
    }

    console.log('[Seed] Database seeded with initial foods and vendor successfully!');
  } catch (err) {
    console.warn('[Seed Notice]', err.message);
  }
}
