import { defineStore } from 'pinia';
import { authApi } from '../services/api.js';
import { subscribeToUser } from '../services/socket.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('foodmap_token') || '',
    isAuthenticated: false,
    currentRole: 'guest', // 'guest' | 'resident' | 'vendor'
    qrCode: null,
    isEnrolled: false,
  }),

  actions: {
    setRole(role) {
      this.currentRole = role;
      localStorage.setItem('foodmap_role', role);
      if (this.user) {
        this.user.role = role;
      }
    },

    async requestOtp(payload) {
      try {
        const res = await authApi.requestOtp(payload);
        if (res) {
          this.qrCode = res.qrCode || null;
          this.isEnrolled = res.isEnrolled ?? false;
        }
        return res;
      } catch (err) {
        const message =
          err.response?.data?.message ||
          (err.request ? 'Could not reach the server. Please check your connection and try again.' : 'Failed to request verification code.');
        throw new Error(message);
      }
    },

    async verifyOtp(payload) {
      try {
        const res = await authApi.verifyOtp(payload);
        if (res.token) {
          this.token = res.token;
          this.user = res.user;
          this.currentRole = res.user.role || 'resident';
          localStorage.setItem('foodmap_role', this.currentRole);

          const isUnonboarded = Boolean(res.isNewUser) || !res.user.isOnboarded;

          if (isUnonboarded) {
            // Store pending token in sessionStorage so onboarding request is authorized,
            // but DO NOT save to localStorage! If page is refreshed, session is completely discarded.
            sessionStorage.setItem('foodmap_pending_token', res.token);
            this.isAuthenticated = false;
          } else {
            // Returning vendor or resident: fully authenticated
            sessionStorage.removeItem('foodmap_pending_token');
            localStorage.setItem('foodmap_token', res.token);
            this.isAuthenticated = true;
            this.qrCode = null;
            this.isEnrolled = true;
            subscribeToUser(res.user._id || res.user.id);
          }
        }
        return res;
      } catch (err) {
        const message =
          err.response?.data?.message ||
          (err.request ? 'Could not reach the server. Please check your connection and try again.' : 'Invalid verification code. Please try again.');
        throw new Error(message);
      }
    },

    async completeOnboarding(data) {
      try {
        const token = this.token || sessionStorage.getItem('foodmap_pending_token') || localStorage.getItem('foodmap_token');
        const res = await authApi.completeOnboarding(
          { ...data, token },
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );
        if (res.token) {
          sessionStorage.removeItem('foodmap_pending_token');
          this.token = res.token;
          localStorage.setItem('foodmap_token', res.token);
          this.user = res.user;
          this.currentRole = res.user?.role || data?.role || 'resident';
          localStorage.setItem('foodmap_role', this.currentRole);
          this.isAuthenticated = true;
          this.isEnrolled = true;
          subscribeToUser(res.user._id || res.user.id);
        }
        return res;
      } catch (err) {
        const message =
          err.response?.data?.message ||
          (err.request ? 'Could not reach the server. Please check your connection and try again.' : 'Could not complete onboarding. Please try again.');
        throw new Error(message);
      }
    },

    async initAuth() {
      if (!this.token) {
        this.isAuthenticated = false;
        this.user = null;
        this.currentRole = 'guest';
        return;
      }
      try {
        await this.fetchCurrentUser();
      } catch (e) {
        this.logout();
      }
    },

    async fetchCurrentUser() {
      try {
        const res = await authApi.getCurrentUser();
        if (res && res.user) {
          if (!res.user.isOnboarded) {
            this.logout();
            return null;
          }
          this.user = res.user;
          this.currentRole = res.user.role || 'resident';
          localStorage.setItem('foodmap_role', this.currentRole);
          this.isAuthenticated = true;
          subscribeToUser(res.user._id || res.user.id);
          return res.user;
        }
      } catch (e) {
        this.logout();
        throw e;
      }
    },

    logout() {
      this.user = null;
      this.token = '';
      this.isAuthenticated = false;
      this.currentRole = 'guest';
      this.qrCode = null;
      this.isEnrolled = false;
      localStorage.removeItem('foodmap_token');
      localStorage.removeItem('foodmap_role');
    },
  },
});
