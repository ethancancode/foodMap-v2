import { defineStore } from 'pinia';
import { vendorApi } from '../services/api.js';
import { getSocket } from '../services/socket.js';

export const useVendorStore = defineStore('vendor', {
  state: () => ({
    vendorProfile: {
      _id: 'v_anjali',
      businessName: "Anjali's Kitchen",
      category: 'North Indian Home Cook',
      bio: 'Authentic Punjabi home-cooked meals prepared with love and cold-pressed mustard oil daily.',
      status: 'ONLINE',
      rating: 4.9,
      totalReviews: 32,
      pickupAddress: 'Wing B, Flat 402, Green Meadows, Bhandup West, Mumbai',
      fssaiLicense: '21524021000842',
    },
    vendors: [],
    initialized: false,
  }),

  actions: {
    async fetchVendors(params = {}) {
      try {
        const res = await vendorApi.getVendors(params);
        if (res.data) {
          this.vendors = res.data;
        }
      } catch (err) {
        console.warn('[VendorStore] Fetch vendors error:', err.message);
      } finally {
        this.initSocketListeners();
      }
    },

    async fetchMyProfile() {
      try {
        const res = await vendorApi.getMyProfile();
        if (res.vendor) {
          this.vendorProfile = res.vendor;
        }
      } catch (err) {
        // use default profile
      }
    },

    async updateStatus(newStatus) {
      this.vendorProfile.status = newStatus;
      try {
        await vendorApi.updateVendor(this.vendorProfile._id, { status: newStatus });
      } catch (e) {
        console.warn(e.message);
      }
    },

    initSocketListeners() {
      if (this.initialized) return;
      this.initialized = true;

      const socket = getSocket();

      socket.on('vendor:statusUpdated', ({ vendorId, status, vendor }) => {
        if (this.vendorProfile && (this.vendorProfile._id === vendorId || this.vendorProfile.id === vendorId)) {
          this.vendorProfile.status = status;
        }

        const idx = this.vendors.findIndex((v) => v._id === vendorId || v.id === vendorId);
        if (idx !== -1) {
          this.vendors[idx].status = status;
        }
      });
    },
  },
});
