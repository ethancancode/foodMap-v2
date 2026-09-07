import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
    },
    experience: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'BUSY'],
      default: 'ONLINE',
    },
    rating: {
      type: Number,
      default: 0,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    fssaiLicense: {
      type: String,
      default: '',
    },
    coverImage: {
      type: String,
      default: '',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [73.0188, 19.0225],
      },
      pickupAddress: {
        type: String,
        default: '',
      },
    },
    operatingHours: {
      open: { type: String, default: '11:00 AM' },
      close: { type: String, default: '10:00 PM' },
    },
  },
  {
    timestamps: true,
  }
);

vendorSchema.index({ location: '2dsphere' });

export const Vendor = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);
export default Vendor;
