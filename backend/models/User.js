import mongoose from 'mongoose';

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
      default: 'FoodMap User',
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    role: {
      type: String,
      enum: ['resident', 'vendor', 'admin'],
      default: 'resident',
    },
    avatar: {
      type: String,
      default: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-X2N_MBx3jeZoXjVwqr2YHzWOXb-McFnW5_Tul40mZAa9NuirSD7OKBkkDU56xzennrxI3Xgv-sO-QsSTQzj2Bgea6r41SOJqbrH8gWm8zMup3uMuMaG28Z-fGLLlliOALyrH-YnA9TWnRinucPUDxqCgeWLoi3BEPWE8u7Fh4xXAmbxwgcOfwpER6x1vM3SR1jywAKX3fBJaC48BfJ_cwOyEuMuIbtahE2gMi3BEM_m8HL3TAKHU',
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
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [72.9342, 19.1485], // Bhandup West, Mumbai
      },
      address: {
        type: String,
        default: 'Bhandup West, Mumbai',
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ location: '2dsphere' });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
