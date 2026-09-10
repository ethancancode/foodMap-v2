import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import Food from '../models/Food.js';
import Review from '../models/Review.js';
import { DEFAULT_FOOD_SVG } from '../utils/defaultFoodImage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/foodmap';

// 5 Home Kitchens situated directly around Ramnarain Ruia Autonomous College, Matunga (East/West), Mumbai
const VENDORS_DATA = [
  {
    phone: '+919820111001',
    chefName: 'Meenakshi Iyer',
    businessName: 'Iyer Maami’s Traditional Kitchen',
    category: 'South Indian • Authentic Tamil Brahmin Home Food',
    bio: 'Homestyle pure vegetarian South Indian meals made with traditional cold-pressed sesame oil and freshly roasted spice podis.',
    experience: '18+ years traditional home cooking',
    address: 'Near Ruia College Gate 2, Lakhamsi Napoo Rd, Matunga, Mumbai',
    coordinates: [72.85575, 19.02325],
    dish: {
      name: 'Mysore Masala Dosa with Fresh Coconut Chutney',
      description: 'Crispy fermented rice & urad dal crepe smeared with spicy red garlic chutney and stuffed with spiced potato mash.',
      price: 90,
      quantity: 12,
      isVeg: true,
      diet: 'veg',
      category: 'Breakfast / Snacks',
      cookingStatus: 'Ready in 10 mins',
      timeReady: 'Ready in 10 mins',
      fulfillmentOptions: 'BOTH',
    },
  },
  {
    phone: '+919820111002',
    chefName: 'Aarti Joshi',
    businessName: 'Aarti’s Maharashtrian Poli Bhaji',
    category: 'Maharashtrian • Daily Fresh Tiffin',
    bio: 'Homemade daily lunch boxes and comforting traditional recipes made fresh for college students and local residents.',
    experience: '12 years running authentic local home kitchen',
    address: 'Opp. Podar College, LN Road, Matunga East, Mumbai',
    coordinates: [72.85680, 19.02270],
    dish: {
      name: 'Maharashtrian Pithla Bhakri with Thecha',
      description: 'Warm, rustic spiced gram flour curry accompanied by fresh jowar bhakri and fiery green chili-garlic thecha.',
      price: 110,
      quantity: 15,
      isVeg: true,
      diet: 'veg',
      category: 'Main Course',
      cookingStatus: 'Ready now',
      timeReady: 'Ready now',
      fulfillmentOptions: 'BOTH',
    },
  },
  {
    phone: '+919820111003',
    chefName: 'Jaspreet Singh',
    businessName: 'Pind Di Khushboo Home Kitchen',
    category: 'North Indian • Homestyle Punjabi Curries',
    bio: 'Rich, comforting Punjabi gravies prepared with pure ghee, slow-cooked whole spices, and lots of love.',
    experience: '9 years home culinary enthusiast',
    address: 'Near Five Gardens, Matunga East, Mumbai',
    coordinates: [72.85750, 19.02180],
    dish: {
      name: 'Homestyle Rajma Chawal with Jeera Tadka',
      description: 'Slow-simmered Kashmiri red kidney beans in a rich tomato-onion-ginger masala over fragrant steamed Basmati rice.',
      price: 120,
      quantity: 10,
      isVeg: true,
      diet: 'veg',
      category: 'Main Course',
      cookingStatus: 'Ready now',
      timeReady: 'Ready now',
      fulfillmentOptions: 'BOTH',
    },
  },
  {
    phone: '+919820111004',
    chefName: 'Bhavna Shah',
    businessName: 'Bhavna Ben’s Kathiyawadi Rasoi',
    category: 'Gujarati • Authentic Kathiyawadi & Snacks',
    bio: 'Clean, sattvic Gujarati delicacies with balanced mild sweetness, tangy lemon notes, and minimal oil.',
    experience: '15 years homemade culinary expertise',
    address: 'Near Matunga Post Office, Telang Road, Matunga, Mumbai',
    coordinates: [72.85490, 19.02410],
    dish: {
      name: 'Steamed Surati Khaman Dhokla with Sev & Fried Chillies',
      description: 'Ultra-soft, spongy steamed gram flour cakes tempered with mustard seeds, curry leaves, and green chillies.',
      price: 60,
      quantity: 20,
      isVeg: true,
      diet: 'veg',
      category: 'Breakfast / Snacks',
      cookingStatus: 'Ready in 15 mins',
      timeReady: 'Ready in 15 mins',
      fulfillmentOptions: 'BOTH',
    },
  },
  {
    phone: '+919820111005',
    chefName: 'Sunita Fernandes',
    businessName: 'Sunita’s Coastal & Street Bites',
    category: 'Snacks & Street Food • Homestyle Quick Bites',
    bio: 'Freshly fried hot evening snacks and street food prepared in a pristine, clean home kitchen environment.',
    experience: '8 years small-batch home cooking',
    address: 'Near Matunga Central Railway Station (East), Mumbai',
    coordinates: [72.85610, 19.02520],
    dish: {
      name: 'Mumbai Pav Bhaji with Butter Toasted Ladi Pav',
      description: 'Mashed spiced seasonal vegetables simmered on an iron griddle with fragrant pav bhaji masala, served with 2 buttered ladi pavs.',
      price: 95,
      quantity: 14,
      isVeg: true,
      diet: 'veg',
      category: 'Street Food',
      cookingStatus: 'Ready now',
      timeReady: 'Ready now',
      fulfillmentOptions: 'BOTH',
    },
  },
];

async function seedRuiaDemoVendors() {
  try {
    console.log(`[FoodMap] Connecting to database: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('[FoodMap] Connected successfully.');

    let createdVendorsCount = 0;
    let createdDishesCount = 0;

    for (const data of VENDORS_DATA) {
      // 1. Find or create vendor User
      let user = await User.findOne({ phone: data.phone });
      if (!user) {
        user = await User.create({
          phone: data.phone,
          name: data.chefName,
          role: 'vendor',
          isVerified: true,
          isOnboarded: true,
          isTotpSetup: true,
          avatar: '', // Default placeholder
          location: {
            type: 'Point',
            coordinates: data.coordinates,
            address: data.address,
          },
        });
      } else {
        user.name = data.chefName;
        user.role = 'vendor';
        user.isVerified = true;
        user.isOnboarded = true;
        user.isTotpSetup = true;
        user.avatar = '';
        user.location = {
          type: 'Point',
          coordinates: data.coordinates,
          address: data.address,
        };
        await user.save();
      }

      // 2. Find or create Vendor record with 0 ratings and 0 reviews
      let vendor = await Vendor.findOne({ user: user._id });
      if (!vendor) {
        vendor = await Vendor.create({
          user: user._id,
          businessName: data.businessName,
          category: data.category,
          bio: data.bio,
          experience: data.experience,
          status: 'ONLINE',
          rating: 0,
          totalReviews: 0,
          coverImage: '', // Default placeholder
          location: {
            type: 'Point',
            coordinates: data.coordinates,
            pickupAddress: data.address,
          },
        });
      } else {
        vendor.businessName = data.businessName;
        vendor.category = data.category;
        vendor.bio = data.bio;
        vendor.experience = data.experience;
        vendor.status = 'ONLINE';
        vendor.rating = 0;
        vendor.totalReviews = 0;
        vendor.coverImage = '';
        vendor.location = {
          type: 'Point',
          coordinates: data.coordinates,
          pickupAddress: data.address,
        };
        await vendor.save();
      }

      // 3. Clear any existing reviews for this vendor to ensure 0 reviews
      await Review.deleteMany({ vendor: vendor._id });

      // 4. Remove previous demo dishes for this vendor
      await Food.deleteMany({ vendor: vendor._id });

      // 5. Create fresh live dish for this vendor (using DEFAULT_FOOD_SVG, no external image)
      const food = await Food.create({
        vendor: vendor._id,
        name: data.dish.name,
        description: data.dish.description,
        price: data.dish.price,
        quantity: data.dish.quantity,
        initialQuantity: data.dish.quantity,
        isVeg: data.dish.isVeg,
        diet: data.dish.diet,
        category: data.dish.category,
        cookingStatus: data.dish.cookingStatus,
        timeReady: data.dish.timeReady,
        available: true,
        status: 'AVAILABLE',
        fulfillmentOptions: data.dish.fulfillmentOptions,
        image: DEFAULT_FOOD_SVG,
        location: {
          type: 'Point',
          coordinates: data.coordinates,
        },
        pickupAddress: data.address,
      });

      createdVendorsCount++;
      createdDishesCount++;
      console.log(`[+] Seeded Vendor: "${vendor.businessName}" (0 reviews) -> Dish: "${food.name}"`);
    }

    console.log('\n======================================================');
    console.log('       RUIA COLLEGE DEMO VENDORS & DISHES SEEDED');
    console.log('======================================================');
    console.log(`- Total Vendors Created/Updated: ${createdVendorsCount}`);
    if (mongoose.connection.readyState === 1 && !process.env.CLI_INVOCATION) {
      return { success: true, count: createdVendorsCount };
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[FoodMap] Error seeding demo vendors:', err);
    if (!process.env.CLI_INVOCATION) throw err;
    process.exit(1);
  }
}

export { seedRuiaDemoVendors, VENDORS_DATA };

if (process.argv[1] && process.argv[1].includes('seedRuiaDemoVendors.js')) {
  process.env.CLI_INVOCATION = 'true';
  seedRuiaDemoVendors();
}
