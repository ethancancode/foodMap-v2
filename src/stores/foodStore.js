import { defineStore } from 'pinia';
import { foodApi } from '../services/api.js';
import { getSocket } from '../services/socket.js';

export const useFoodStore = defineStore('food', {
  state: () => ({
    foods: [
      {
        _id: 'rajma-chawal',
        id: 'rajma-chawal',
        name: 'Authentic Rajma Chawal',
        vendor: {
          _id: 'v_anjali',
          businessName: "Anjali's Kitchen",
          rating: 4.9,
          totalReviews: 32,
          pickupAddress: 'Wing B, Flat 402, Green Meadows, Bhandup West, Mumbai',
        },
        vendorName: "Anjali's Kitchen",
        price: 80,
        quantity: 6,
        time: 'Ready Now',
        timeReady: 'Ready Now',
        distance: '420m away',
        rating: 4.9,
        available: true,
        status: 'AVAILABLE',
        isVeg: true,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcCn3i8k4gYk-jLV5MXuqSONW-8QpGOpQ4yYcs-5HUarOFUR1kCq3boeWmwl-f7Seo8MV5gGPaYolyo8w_lFVLtdBGN11e9huwwnLqF4wUGtqAbHcuebFi79m5evx_bXkagJMfR6xqZSl0A3UhdKsMtGL_SyAxPz6EhwbTtY7oWANHjY08Msx9WdC5GF0cpXi4h-eS9GA4sfMmh7CCZv7Lu_elTf3lY2oNae4dUF5Fxdr0ktu3Ed5C',
      },
    ],
    selectedFood: null,
    loading: false,
    initialized: false,
  }),

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
        console.warn('[FoodStore] Fallback:', err.message);
      } finally {
        this.loading = false;
        this.initSocketListeners();
      }
    },

    selectFood(food) {
      this.selectedFood = food;
    },

    async addFood(foodData) {
      try {
        const res = await foodApi.createFood(foodData);
        if (res.data) {
          const item = {
            ...res.data,
            id: res.data._id,
            vendorName: res.data.vendor?.businessName || "Anjali's Kitchen",
            time: res.data.timeReady || 'Ready Now',
          };
          this.foods.unshift(item);
          return item;
        }
      } catch (err) {
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

      try {
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
      } catch (e) {
        console.warn(e);
      }
    },
  },
});
