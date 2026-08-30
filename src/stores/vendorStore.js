import { defineStore } from 'pinia';
import { vendorApi } from '../services/api.js';
import { getSocket } from '../services/socket.js';

export const useVendorStore = defineStore('vendor', {
  state: () => ({
    vendor: {
      _id: 'v_anjali',
      businessName: "Anjali's Kitchen",
      category: 'North Indian Home Cook',
      bio: 'Authentic Punjabi home-cooked meals prepared with love daily.',
      status: 'ONLINE',
      rating: 4.9,
      totalReviews: 32,
      pickupAddress: 'Wing B, Flat 402, Green Meadows, Bhandup West, Mumbai',
      distance: '420m away',
    },
    vendors: [],
    loading: false,
    initialized: false,
  }),

  actions: {
    async fetchVendors(params = {}) {
      this.loading = true;
      try {
        const res = await vendorApi.getVendors(params);
        if (res.data && res.data.length > 0) {
          this.vendors = res.data;
        }
      } catch (err) {
        console.warn('[VendorStore] Fallback:', err.message);
      } finally {
        this.loading = false;
        this.initSocketListeners();
      }
    },

    async updateStatus(status) {
      this.vendor.status = status;
      try {
        await vendorApi.updateVendor(this.vendor._id, { status });
      } catch (err) {
        console.warn('[VendorStore] Offline status update');
      }
    },

    initSocketListeners() {
      if (this.initialized) return;
      this.initialized = true;

      try {
        const socket = getSocket();

        socket.on('vendor:statusUpdated', (updatedVendor) => {
          if (this.vendor && (this.vendor._id === updatedVendor._id || this.vendor.id === updatedVendor._id)) {
            this.vendor = { ...this.vendor, ...updatedVendor };
          }
          const idx = this.vendors.findIndex((v) => v._id === updatedVendor._id || v.id === updatedVendor._id);
          if (idx !== -1) {
            this.vendors[idx] = { ...this.vendors[idx], ...updatedVendor };
          }
        });
      } catch (e) {
        console.warn(e);
      }
    },
  },
});
