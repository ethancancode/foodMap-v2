import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: [
        'ORDER_CREATED',
        'ORDER_ACCEPTED',
        'ORDER_PREPARING',
        'ORDER_READY',
        'ORDER_COMPLETED',
        'FOOD_LIVE',
        'FOOD_SOLD_OUT',
        'DELIVERY_ASSIGNED',
        'DELIVERY_PICKED_UP',
        'DELIVERY_OUT',
        'DELIVERY_COMPLETED',
        'VENDOR_NEW_DISH',
        'SUBSCRIPTION_CREATED',
        'SUBSCRIPTION_MEAL',
        'MARKETPLACE_PRODUCT',
        'COMMUNITY_UPDATE',
        'GENERAL',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export default Notification;
