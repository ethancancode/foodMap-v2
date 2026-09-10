import mongoose from 'mongoose';
import { DEFAULT_FOOD_SVG } from '../utils/defaultFoodImage.js';

const foodSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: 'Delicious freshly prepared home-cooked specialty.',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: 0,
      default: 10,
    },
    initialQuantity: {
      type: Number,
      default: 10,
    },
    isVeg: {
      type: Boolean,
      default: true,
    },
    diet: {
      type: String,
      default: 'veg',
    },
    category: {
      type: String,
      default: 'Main Course',
    },
    timeReady: {
      type: String,
      default: 'Ready Now',
    },
    cookingStatus: {
      type: String,
      default: 'Ready now',
    },
    readyAt: {
      type: Date,
    },
    available: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      default: 'AVAILABLE',
    },
    fulfillmentOptions: {
      type: String,
      enum: ['BOTH', 'PICKUP_ONLY', 'DELIVERY_ONLY'],
      default: 'BOTH',
    },
    image: {
      type: String,
      default: DEFAULT_FOOD_SVG,
    },
    spiciness: {
      type: String,
      default: 'Medium',
    },
    ingredients: [String],
    tags: [String],
    nutrition: {
      calories: { type: Number, default: 420 },
      protein: { type: String, default: '14g' },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [72.9348, 19.1462],
      },
    },
    pickupAddress: {
      type: String,
      default: 'Navi Mumbai, Thane',
    },
  },
  {
    timestamps: true,
  }
);

foodSchema.virtual('isAvailable').get(function () {
  return this.available !== false && this.quantity > 0;
});

foodSchema.set('toJSON', { virtuals: true });
foodSchema.set('toObject', { virtuals: true });

foodSchema.index({ location: '2dsphere' });

export const Food = mongoose.models.Food || mongoose.model('Food', foodSchema);
export default Food;

