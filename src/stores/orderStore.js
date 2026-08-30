import { defineStore } from 'pinia';
import { orderApi } from '../services/api.js';
import { getSocket } from '../services/socket.js';

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    currentOrder: {
      _id: 'ord_1024',
      id: 'ord_1024',
      orderNumber: '#FM-1024',
      items: [
        {
          name: 'Authentic Rajma Chawal',
          price: 80,
          quantity: 2,
        },
      ],
      totalAmount: 195,
      deliveryFee: 30,
      platformFee: 5,
      status: 'CONFIRMED',
      customerName: 'Nikhil',
      customerPhone: '+91 98201 45892',
      pickupAddress: 'Building B, Apt 402, Bhandup West',
      createdAt: new Date().toISOString(),
    },
    loading: false,
    initialized: false,
  }),

  actions: {
    async fetchOrders(params = {}) {
      this.loading = true;
      try {
        const res = await orderApi.getOrders(params);
        if (res.data && res.data.length > 0) {
          this.orders = res.data;
        }
      } catch (err) {
        console.warn('[OrderStore] Fallback:', err.message);
      } finally {
        this.loading = false;
        this.initSocketListeners();
      }
    },

    async placeOrder(orderPayload) {
      try {
        const res = await orderApi.createOrder(orderPayload);
        if (res.data) {
          this.currentOrder = res.data;
          this.orders.unshift(res.data);
          return res.data;
        }
      } catch (err) {
        const fallbackOrder = {
          _id: 'ord_' + Date.now(),
          id: 'ord_' + Date.now(),
          orderNumber: '#FM-' + Math.floor(1000 + Math.random() * 9000),
          status: 'PENDING',
          ...orderPayload,
          createdAt: new Date().toISOString(),
        };
        this.currentOrder = fallbackOrder;
        this.orders.unshift(fallbackOrder);
        return fallbackOrder;
      }
    },

    async updateStatus(orderId, status, note = '') {
      try {
        const res = await orderApi.updateStatus(orderId, status, note);
        if (res.data) {
          this.currentOrder = res.data;
          const idx = this.orders.findIndex((o) => o._id === orderId || o.id === orderId);
          if (idx !== -1) this.orders[idx] = res.data;
          return res.data;
        }
      } catch (err) {
        if (this.currentOrder && (this.currentOrder._id === orderId || this.currentOrder.id === orderId)) {
          this.currentOrder.status = status;
        }
        const idx = this.orders.findIndex((o) => o._id === orderId || o.id === orderId);
        if (idx !== -1) this.orders[idx].status = status;
      }
    },

    initSocketListeners() {
      if (this.initialized) return;
      this.initialized = true;

      try {
        const socket = getSocket();

        socket.on('order:created', (newOrder) => {
          const exists = this.orders.some((o) => o._id === newOrder._id || o.id === newOrder._id);
          if (!exists) {
            this.orders.unshift(newOrder);
          }
        });

        socket.on('order:statusUpdated', (updatedOrder) => {
          if (this.currentOrder && (this.currentOrder._id === updatedOrder._id || this.currentOrder.id === updatedOrder._id)) {
            this.currentOrder = { ...this.currentOrder, ...updatedOrder };
          }
          const idx = this.orders.findIndex((o) => o._id === updatedOrder._id || o.id === updatedOrder._id);
          if (idx !== -1) {
            this.orders[idx] = { ...this.orders[idx], ...updatedOrder };
          }
        });
      } catch (e) {
        console.warn(e);
      }
    },
  },
});
