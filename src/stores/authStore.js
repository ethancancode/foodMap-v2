import { defineStore } from 'pinia';
import { authApi } from '../services/api.js';
import { subscribeToUser } from '../services/socket.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: {
      id: 'user_1',
      name: 'Nikhil',
      phone: '+91 98201 45892',
      role: 'resident',
      location: {
        address: 'Bhandup West, Mumbai',
        coordinates: [72.9342, 19.1485],
      },
    },
    token: localStorage.getItem('foodmap_token') || '',
    isAuthenticated: true,
    currentRole: 'resident',
  }),

  actions: {
    setRole(role) {
      this.currentRole = role;
      if (this.user) {
        this.user.role = role;
      }
    },

    async requestOtp(phone) {
      return await authApi.requestOtp(phone);
    },

    async verifyOtp(payload) {
      try {
        const res = await authApi.verifyOtp(payload);
        if (res.token) {
          this.token = res.token;
          localStorage.setItem('foodmap_token', res.token);
          this.user = res.user;
          this.currentRole = res.user.role;
          this.isAuthenticated = true;
          subscribeToUser(res.user.id);
        }
        return res;
      } catch (err) {
        this.user.phone = payload.phone;
        if (payload.role) this.setRole(payload.role);
        return { success: true, user: this.user };
      }
    },

    async fetchCurrentUser() {
      try {
        const res = await authApi.getCurrentUser();
        if (res.user) {
          this.user = res.user;
          this.currentRole = res.user.role;
          subscribeToUser(res.user._id || res.user.id);
        }
      } catch (e) {
        // use default state
      }
    },
  },
});
