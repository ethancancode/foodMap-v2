import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ['resident', 'vendor', 'delivery_partner', 'admin'],
      default: 'resident',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say', ''],
      default: '',
    },
    occupation: {
      type: String,
      enum: ['working', 'student', 'prefer_not_to_tell', 'other', ''],
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    password: {
      type: String,
      select: false,
    },
    totpSecret: {
      type: String,
      select: false,
    },
    isTotpSetup: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    allergies: {
      type: [String],
      default: [],
    },
    followedVendors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vendor',
      },
    ],
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
      address: {
        type: String,
        default: '',
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ location: '2dsphere' });

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return true;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
