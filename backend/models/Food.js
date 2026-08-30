import mongoose from 'mongoose';

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
    available: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      default: 'AVAILABLE',
    },
    image: {
      type: String,
      default: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcCn3i8k4gYk-jLV5MXuqSONW-8QpGOpQ4yYcs-5HUarOFUR1kCq3boeWmwl-f7Seo8MV5gGPaYolyo8w_lFVLtdBGN11e9huwwnLqF4wUGtqAbHcuebFi79m5evx_bXkagJMfR6xqZSl0A3UhdKsMtGL_SyAxPz6EhwbTtY7oWANHjY08Msx9WdC5GF0cpXi4h-eS9GA4sfMmh7CCZv7Lu_elTf3lY2oNae4dUF5Fxdr0ktu3Ed5C',
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
  },
  {
    timestamps: true,
  }
);

foodSchema.index({ location: '2dsphere' });

export const Food = mongoose.models.Food || mongoose.model('Food', foodSchema);
export default Food;
