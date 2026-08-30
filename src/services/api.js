import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('foodmap_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const foodApi = {
  getFoods: async (params = {}) => {
    const res = await api.get('/foods', { params });
    const list = res.data?.data || res.data?.foods || (Array.isArray(res.data) ? res.data : []);
    return { foods: list, data: list, ...res.data };
  },
  getFoodById: (id) => api.get(`/foods/${id}`).then((r) => r.data),
  createFood: (data) => api.post('/foods', data).then((r) => r.data),
  updateFood: (id, data) => api.put(`/foods/${id}`, data).then((r) => r.data),
  deleteFood: (id) => api.delete(`/foods/${id}`).then((r) => r.data),
};

export const vendorApi = {
  getVendors: async (params = {}) => {
    const res = await api.get('/vendors', { params });
    const list = res.data?.data || res.data?.vendors || (Array.isArray(res.data) ? res.data : []);
    return { vendors: list, data: list, ...res.data };
  },
  getVendorById: (id) => api.get(`/vendors/${id}`).then((r) => r.data),
  getMyProfile: () => api.get('/vendors/me').then((r) => r.data),
  updateVendor: (id, data) => api.put(`/vendors/${id || 'me'}`, data).then((r) => r.data),
};

export const orderApi = {
  getOrders: async (params = {}) => {
    const res = await api.get('/orders', { params });
    const list = res.data?.data || res.data?.orders || (Array.isArray(res.data) ? res.data : []);
    return { orders: list, data: list, ...res.data };
  },
  getOrderById: (id) => api.get(`/orders/${id}`).then((r) => r.data),
  createOrder: (data) => api.post('/orders', data).then((r) => r.data),
  updateStatus: (id, status, note = '') =>
    api.patch(`/orders/${id}/status`, { status, note }).then((r) => r.data),
};

export const authApi = {
  requestOtp: (phone) => api.post('/auth/request-otp', { phone }).then((r) => r.data),
  verifyOtp: (payload) => api.post('/auth/verify-otp', payload).then((r) => r.data),
  getCurrentUser: () => api.get('/auth/me').then((r) => r.data),
  updateProfile: (data) => api.put('/auth/profile', data).then((r) => r.data),
};

export const locationApi = {
  getNearby: (params) => api.get('/locations/nearby', { params }).then((r) => r.data),
  updateLocation: (data) => api.put('/locations/update', data).then((r) => r.data),
};

export default api;
