import mongoose from 'mongoose';
import orderItemSchema from './OrderItem.js';

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
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
    foodName: {
      type: String,
    },
    vendorName: {
      type: String,
    },
    residentName: {
      type: String,
    },
    residentPhone: {
      type: String,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    pricePerUnit: {
      type: Number,
      default: 0,
    },
    items: [orderItemSchema],
    itemSummary: {
      type: String,
      default: 'Food order',
    },
    subtotal: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    platformFee: {
      type: Number,
      default: 5,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    isSurplusRescue: {
      type: Boolean,
      default: false,
    },
    surplusDiscount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        'PENDING',
        'ACCEPTED',
        'PREPARING',
        'READY_FOR_PICKUP',
        'OUT_FOR_DELIVERY',
        'PICKED_UP',
        'DELIVERED',
        'COMPLETED',
        'REJECTED',
        'CANCELLED',
      ],
      default: 'PENDING',
    },
    orderType: {
      type: String,
      enum: ['PICKUP', 'DELIVERY'],
      default: 'PICKUP',
    },
    readyAt: {
      type: Date,
    },
    cookingStatus: {
      type: String,
    },
    pickupAddress: {
      type: String,
      default: 'Seawoods, Navi Mumbai',
    },
    pickupTimeEstimate: {
      type: String,
      default: '15-20 mins',
    },
    rejectionReason: {
      type: String,
    },
    isViewedByResident: {
      type: Boolean,
      default: false,
    },
    specialInstructions: {
      type: String,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    deliveryPartnerName: {
      type: String,
      default: '',
    },
    deliveryPartnerPhone: {
      type: String,
      default: '',
    },
    deliveryPartnerLocation: {
      coordinates: {
        type: [Number], // [lng, lat]
      },
      address: {
        type: String,
        default: '',
      },
      updatedAt: {
        type: Date,
      },
    },
    deliveryStatus: {
      type: String,
      enum: ['UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'],
      default: 'UNASSIGNED',
    },
    isMarketplaceOrder: {
      type: Boolean,
      default: false,
    },
    isSubscriptionOrder: {
      type: Boolean,
      default: false,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    groupOrderId: {
      type: String,
      default: '',
    },
    groupParticipants: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        itemsSummary: String,
      },
    ],
    residentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
      address: {
        type: String,
        default: '',
      },
    },
    timeline: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    isReviewed: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
    },
    reviewComment: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default Order;
