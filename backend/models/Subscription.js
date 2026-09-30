import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: String,
      enum: ['weekly', 'monthly'],
      default: 'monthly',
    },
    mealsPerDay: {
      type: Number,
      default: 1,
    },
    availableDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    mealCategory: {
      type: String,
      enum: ['Breakfast', 'Lunch', 'Dinner', 'All Meals'],
      default: 'Lunch',
    },
    cuisine: {
      type: String,
      default: 'Home-style Indian',
    },
    maxSubscribers: {
      type: Number,
      default: 30,
    },
    currentSubscribers: {
      type: Number,
      default: 0,
    },
    subscriberPriorityAllocation: {
      type: Number,
      default: 20, // number of daily portions reserved exclusively for subscribers
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const subscriptionSchema = new mongoose.Schema(
  {
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    resident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PENDING', 'CANCELLED', 'EXPIRED'],
      default: 'ACTIVE',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
    },
    mealsRemaining: {
      type: Number,
      default: 22,
    },
    totalMeals: {
      type: Number,
      default: 22,
    },
    deliveryAddress: {
      type: String,
      default: 'Resident Address',
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PENDING', 'FAILED'],
      default: 'PAID', // Clearly marked demo payment flow
    },
  },
  {
    timestamps: true,
  }
);

export const SubscriptionPlan =
  mongoose.models.SubscriptionPlan || mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

export const Subscription =
  mongoose.models.Subscription || mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
