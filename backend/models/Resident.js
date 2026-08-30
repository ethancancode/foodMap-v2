import mongoose from 'mongoose';

const residentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    preferences: {
      radarDistanceLimit: {
        type: Number,
        default: 500, // in meters
      },
      notificationsEnabled: {
        type: Boolean,
        default: true,
      },
      dietaryPreference: {
        type: String,
        enum: ['all', 'veg', 'non-veg'],
        default: 'all',
      },
    },
    vouchedVendors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
      },
    ],
    savedAddresses: [
      {
        label: { type: String, default: 'Home' },
        address: String,
        building: String,
        flatNumber: String,
        coordinates: [Number], // [lng, lat]
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Resident = mongoose.models.Resident || mongoose.model('Resident', residentSchema);
export default Resident;
