import mongoose from 'mongoose';

const foodAvailabilitySchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
      required: true,
      unique: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 10,
    },
    available: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'LOW_STOCK', 'SOLD_OUT'],
      default: 'AVAILABLE',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const FoodAvailability =
  mongoose.models.FoodAvailability || mongoose.model('FoodAvailability', foodAvailabilitySchema);
export default FoodAvailability;
