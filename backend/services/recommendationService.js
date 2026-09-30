import Food from '../models/Food.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Resident from '../models/Resident.js';

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0; // fallback average
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export async function getResidentRecommendations(userId) {
  const user = userId ? await User.findById(userId) : null;
  const resident = user ? await Resident.findOne({ user: user._id }) : null;

  // Collect user's preferences & history
  const userDiet = resident?.preferences?.dietaryPreference || 'all';
  const userAllergies = (user?.allergies || []).map((a) => a.toLowerCase().trim());
  const userCoords = user?.location?.coordinates || [73.0188, 19.0225];

  // Get previous orders to check vendor and category affinity
  let previousVendorIds = [];
  let previousCategories = [];
  if (user) {
    const previousOrders = await Order.find({ resident: user._id })
      .select('vendor items')
      .sort({ createdAt: -1 })
      .limit(20);

    previousVendorIds = previousOrders.map((o) => o.vendor?.toString()).filter(Boolean);
  }

  // Get all active dishes
  const foods = await Food.find({ available: true, quantity: { $gt: 0 } })
    .populate('vendor', 'businessName category rating totalReviews status location verificationStatus')
    .lean();

  const scoredFoods = foods.map((food) => {
    let score = 50;
    const reasons = [];

    // 1. Dietary Preference Scoring
    if (userDiet === 'veg') {
      if (food.isVeg || food.diet === 'veg') {
        score += 30;
        reasons.push('100% Vegetarian Match');
      } else {
        score -= 60;
      }
    } else if (userDiet === 'non-veg') {
      if (!food.isVeg || food.diet === 'non-veg') {
        score += 25;
        reasons.push('Non-veg specialty');
      }
    }

    // 2. Allergy Safety Penalty
    if (userAllergies.length > 0) {
      const foodAllergens = (food.allergens || []).map((a) => a.toLowerCase().trim());
      const foodIngredients = (food.ingredients || []).map((i) => i.toLowerCase().trim());
      const matchingAllergens = userAllergies.filter(
        (ua) => foodAllergens.includes(ua) || foodIngredients.some((fi) => fi.includes(ua))
      );

      if (matchingAllergens.length > 0) {
        score -= 80;
        reasons.push(`Contains allergen: ${matchingAllergens.join(', ')}`);
      } else {
        score += 15;
        reasons.push('Allergen-safe choice');
      }
    }

    // 3. Proximity Scoring
    const foodCoords = food.location?.coordinates || food.vendor?.location?.coordinates || [73.0188, 19.0225];
    const distanceKm = calculateDistanceKm(userCoords[1], userCoords[0], foodCoords[1], foodCoords[0]);
    if (distanceKm <= 1.5) {
      score += 25;
      reasons.push(`Very close (${distanceKm} km)`);
    } else if (distanceKm <= 4.0) {
      score += 15;
      reasons.push(`Nearby (${distanceKm} km)`);
    } else {
      score += 5;
    }

    // 4. Rating & Verification
    const vendorRating = food.vendor?.rating || 4.2;
    if (vendorRating >= 4.7) {
      score += 20;
      reasons.push(`Top Rated (${vendorRating} ★)`);
    } else if (vendorRating >= 4.0) {
      score += 10;
      reasons.push(`Well Reviewed (${vendorRating} ★)`);
    }

    if (food.vendor?.verificationStatus === 'VERIFIED') {
      score += 10;
      reasons.push('Verified Home Chef');
    }

    // 5. Repeat Vendor Affinity
    if (food.vendor && previousVendorIds.includes(food.vendor._id?.toString())) {
      score += 20;
      reasons.push('Ordered from this Kitchen before');
    }

    // 6. Food Surplus / Eco Rescue Boost
    if (food.isSurplusRescue || food.surplusStatus === 'SURPLUS') {
      score += 15;
      reasons.push(`Surplus Rescue (${food.surplusDiscount || 20}% OFF)`);
    }

    // Normalize match percentage
    const matchPercentage = Math.min(99, Math.max(45, Math.round(score)));

    return {
      ...food,
      distanceKm,
      recommendationScore: score,
      matchPercentage,
      matchReasons: reasons.slice(0, 3),
    };
  });

  // Sort descending by recommendationScore
  scoredFoods.sort((a, b) => b.recommendationScore - a.recommendationScore);

  return scoredFoods;
}
