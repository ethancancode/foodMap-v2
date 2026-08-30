import { defineStore } from 'pinia';
import { orderApi } from '../services/api.js';
import { getSocket, subscribeToOrder } from '../services/socket.js';

export const useOrderStore = defineStore('order', {
  state: () => ({
    currentOrder: {
      id: '#FM1024',
      orderNumber: '#FM1024',
      item: 'Authentic Rajma Chawal',
      vendor: "Anjali's Kitchen",
      qty: 2,
      pricePerPortion: 80,
      subtotal: 160,
      deliveryFee: 30,
      platformFee: 5,
      total: 195,
      totalAmount: 195,
      status: 'PREPARING',
      pickupLocation: 'Wing B, Flat 402, Green Meadows, Bhandup West',
      time: '12:45 PM',
      timeline: [
        { status: 'ACCEPTED', timestamp: new Date(), note: 'Kitchen accepted your order' },
        { status: 'PREPARING', timestamp: new Date(), note: 'Simmering hot Rajma & steamed rice' },
      ],
    },
    orders: [],
    initialized: false,
  }),

  actions: {
    async placeOrder(orderPayload) {
      try {
        const res = await orderApi.createOrder(orderPayload);
        const ord = res?.order || res?.data || res;
        if (ord && (ord._id || ord.orderNumber)) {
          this.currentOrder = {
            ...ord,
            id: ord.orderNumber || ord._id,
            total: ord.totalAmount,
            qty: ord.quantity || ord.items?.reduce((acc, i) => acc + i.quantity, 0) || 1,
            item: ord.foodName || ord.itemSummary || ord.items?.[0]?.name || 'Food Order',
          };
          this.orders.unshift(ord);
          if (ord._id) subscribeToOrder(ord._id);
          return ord;
        }
      } catch (err) {
        // Fallback
        const fallbackOrder = {
          _id: 'order_' + Date.now(),
          id: '#FM' + Math.floor(1000 + Math.random() * 9000),
          orderNumber: '#FM' + Math.floor(1000 + Math.random() * 9000),
          status: 'PENDING',
          ...orderPayload,
        };
        this.currentOrder = fallbackOrder;
        this.orders.unshift(fallbackOrder);
        return fallbackOrder;
      }
    },

    async updateStatus(orderId, status, note = '') {
      try {
        const res = await orderApi.updateStatus(orderId, status, note);
        const ord = res?.order || res?.data || res;
        if (ord && (ord._id || ord.orderNumber)) {
          this.currentOrder = {
            ...this.currentOrder,
            ...ord,
            status: ord.status,
          };
          const idx = this.orders.findIndex((o) => o._id === orderId || o.id === orderId || o.orderNumber === orderId);
          if (idx !== -1) {
            this.orders[idx] = { ...this.orders[idx], ...ord };
          }
        }
      } catch (err) {
        if (this.currentOrder) {
          this.currentOrder.status = status;
        }
      }
    },

    async fetchOrders() {
      try {
        const res = await orderApi.getOrders();
        const list = res?.orders || res?.data || [];
        if (list) {
          this.orders = list;
        }
      } catch (e) {
        console.warn('[OrderStore] Fetch orders error:', e.message);
      } finally {
        this.initSocketListeners();
      }
    },

    initSocketListeners() {
      if (this.initialized) return;
      this.initialized = true;

      const socket = getSocket();

      socket.on('order:created', (newOrder) => {
        const exists = this.orders.some((o) => o._id === newOrder._id);
        if (!exists) {
          this.orders.unshift(newOrder);
        }
      });

      socket.on('order:statusUpdated', (updatedOrder) => {
        if (
          this.currentOrder &&
          (this.currentOrder._id === updatedOrder._id ||
            this.currentOrder.orderNumber === updatedOrder.orderNumber ||
            this.currentOrder.id === updatedOrder.orderNumber)
        ) {
          this.currentOrder = {
            ...this.currentOrder,
            ...updatedOrder,
            status: updatedOrder.status,
          };
        }

        const idx = this.orders.findIndex((o) => o._id === updatedOrder._id);
        if (idx !== -1) {
          this.orders[idx] = { ...this.orders[idx], ...updatedOrder };
        }
      });
    },
  },
});
