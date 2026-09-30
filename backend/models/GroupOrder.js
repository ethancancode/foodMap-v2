import mongoose from 'mongoose';

const groupOrderItemSchema = new mongoose.Schema({
  food: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food',
    required: true,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
});

const groupOrderMemberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String, required: true },
  items: [groupOrderItemSchema],
  joinedAt: { type: Date, default: Date.now },
});

const groupOrderSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    hostName: {
      type: String,
      default: 'Host Resident',
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
    },
    status: {
      type: String,
      enum: ['OPEN', 'LOCKED', 'COMPLETED', 'CANCELLED'],
      default: 'OPEN',
    },
    deliveryAddress: {
      type: String,
      default: '',
    },
    members: [groupOrderMemberSchema],
    placedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
  },
  {
    timestamps: true,
  }
);

export const GroupOrder =
  mongoose.models.GroupOrder || mongoose.model('GroupOrder', groupOrderSchema);

export default GroupOrder;
