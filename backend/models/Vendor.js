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
      default: "Anjali's Kitchen",
      trim: true,
    },
    category: {
      type: String,
      default: 'North Indian Home Cook',
    },
    bio: {
      type: String,
      default: 'Authentic home-cooked meals prepared with love and fresh ingredients daily.',
    },
    status: {
      type: String,
      enum: ['ONLINE', 'OFFLINE', 'BUSY'],
      default: 'ONLINE',
    },
    rating: {
      type: Number,
      default: 4.9,
    },
    totalReviews: {
      type: Number,
      default: 28,
    },
    fssaiLicense: {
      type: String,
      default: '21524021000842',
    },
    coverImage: {
      type: String,
      default: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcCn3i8k4gYk-jLV5MXuqSONW-8QpGOpQ4yYcs-5HUarOFUR1kCq3boeWmwl-f7Seo8MV5gGPaYolyo8w_lFVLtdBGN11e9huwwnLqF4wUGtqAbHcuebFi79m5evx_bXkagJMfR6xqZSl0A3UhdKsMtGL_SyAxPz6EhwbTtY7oWANHjY08Msx9WdC5GF0cpXi4h-eS9GA4sfMmh7CCZv7Lu_elTf3lY2oNae4dUF5Fxdr0ktu3Ed5C',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [72.9355, 19.1492],
      },
      pickupAddress: {
        type: String,
        default: 'Wing B, Flat 402, Green Meadows, Bhandup West, Mumbai',
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
