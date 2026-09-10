import { defineStore } from 'pinia';
import { foodApi } from '../services/api.js';
import { getSocket } from '../services/socket.js';

export const useFoodStore = defineStore('food', {
  state: () => {
    let savedSelected = null;
    try {
      const stored = sessionStorage.getItem('foodmap_selected_food');
      if (stored) savedSelected = JSON.parse(stored);
    } catch (_) {}

    return {
      foods: [],
      selectedFood: savedSelected,
      loading: false,
      initialized: false,
    };
  },

  actions: {
    async fetchFoods(params = {}) {
      this.loading = true;
      try {
        const res = await foodApi.getFoods(params);
        if (res.data && res.data.length > 0) {
          this.foods = res.data.map((f) => ({
            ...f,
            id: f._id,
            vendorName: f.vendor?.businessName || "Anjali's Kitchen",
            time: f.timeReady || 'Ready Now',
          }));
        }
      } catch (err) {
        console.warn('[FoodStore] Using local food list fallback:', err.message);
      } finally {
        this.loading = false;
        this.initSocketListeners();
      }
    },

    selectFood(food) {
      this.selectedFood = food;
      try {
        if (food) {
          sessionStorage.setItem('foodmap_selected_food', JSON.stringify(food));
        } else {
          sessionStorage.removeItem('foodmap_selected_food');
        }
      } catch (_) {}
    },

    async addFood(foodData) {
      try {
        const res = await foodApi.createFood(foodData);
        const created = res?.food || res?.data || res;
        if (created && (created._id || created.id || created.name)) {
          const item = {
            ...created,
            id: created._id || created.id,
            _id: created._id || created.id,
            vendorName: created.vendor?.businessName || created.vendorName || "Anjali's Kitchen",
            time: created.timeReady || created.cookingStatus || 'Ready Now',
          };
          this.foods.unshift(item);
          return item;
        }
      } catch (err) {
        // Optimistic local add
        const newItem = {
          _id: 'food_' + Date.now(),
          id: 'food_' + Date.now(),
          ...foodData,
          available: true,
          status: 'AVAILABLE',
        };
        this.foods.unshift(newItem);
        return newItem;
      }
    },

    async deleteFood(foodId) {
      try {
        await foodApi.deleteFood(foodId);
      } catch (e) {
        console.warn(e.message);
      }
      this.foods = this.foods.filter((f) => f._id !== foodId && f.id !== foodId);
    },

    initSocketListeners() {
      if (this.initialized) return;
      this.initialized = true;

      const socket = getSocket();

      socket.on('food:created', (newFood) => {
        const exists = this.foods.some((f) => f._id === newFood._id || f.id === newFood._id);
        if (!exists) {
          this.foods.unshift({
            ...newFood,
            id: newFood._id,
            vendorName: newFood.vendor?.businessName || "Anjali's Kitchen",
            time: newFood.timeReady || 'Ready Now',
          });
        }
      });

      socket.on('food:updated', (updatedFood) => {
        const idx = this.foods.findIndex((f) => f._id === updatedFood._id || f.id === updatedFood._id);
        if (idx !== -1) {
          this.foods[idx] = {
            ...this.foods[idx],
            ...updatedFood,
            id: updatedFood._id,
            vendorName: updatedFood.vendor?.businessName || this.foods[idx].vendorName,
          };
        }
      });

      socket.on('food:availabilityUpdated', ({ foodId, quantity, available, status }) => {
        const target = this.foods.find((f) => f._id === foodId || f.id === foodId);
        if (target) {
          target.quantity = quantity;
          target.available = available !== undefined ? available : quantity > 0;
          target.status = status || (quantity === 0 ? 'SOLD_OUT' : 'AVAILABLE');
        }
        if (this.selectedFood && (this.selectedFood._id === foodId || this.selectedFood.id === foodId)) {
          this.selectedFood.quantity = quantity;
          this.selectedFood.available = available !== undefined ? available : quantity > 0;
          this.selectedFood.status = status || (quantity === 0 ? 'SOLD_OUT' : 'AVAILABLE');
        }
      });

      socket.on('food:soldOut', ({ foodId }) => {
        const target = this.foods.find((f) => f._id === foodId || f.id === foodId);
        if (target) {
          target.quantity = 0;
          target.available = false;
          target.status = 'SOLD_OUT';
        }
        if (this.selectedFood && (this.selectedFood._id === foodId || this.selectedFood.id === foodId)) {
          this.selectedFood.quantity = 0;
          this.selectedFood.available = false;
          this.selectedFood.status = 'SOLD_OUT';
        }
      });

      socket.on('food:deleted', ({ foodId }) => {
        this.foods = this.foods.filter((f) => f._id !== foodId && f.id !== foodId);
      });
    },
  },
});
