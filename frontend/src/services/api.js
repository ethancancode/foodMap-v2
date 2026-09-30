import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('foodmap_token') || sessionStorage.getItem('foodmap_pending_token');
  if (token && !config.headers.Authorization) {
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
  updateVendor: (id, data) => {
    const target = id && id !== 'me' ? `/vendors/${id}` : '/vendors/me';
    return api.put(target, data || id).then((r) => r.data);
  },
  submitReview: (vendorId, data) => api.post(`/vendors/${vendorId}/reviews`, data).then((r) => r.data),
  getReviews: (vendorId) => api.get(`/vendors/${vendorId}/reviews`).then((r) => r.data),
  toggleFollow: (vendorId) => api.post(`/vendors/${vendorId}/follow`).then((r) => r.data),
  getAnalytics: (vendorId) => api.get(vendorId ? `/vendors/${vendorId}/analytics` : '/vendors/me/analytics').then((r) => r.data),
  getDemandPrediction: (vendorId) => api.get(vendorId ? `/vendors/${vendorId}/demand-prediction` : '/vendors/me/demand-prediction').then((r) => r.data),
};

export const orderApi = {
  getOrders: async (params = {}) => {
    const res = await api.get('/orders', { params });
    const list = res.data?.data || res.data?.orders || (Array.isArray(res.data) ? res.data : []);
    return { orders: list, data: list, ...res.data };
  },
  getOrderById: (id) => api.get(`/orders/${id}`).then((r) => r.data),
  createOrder: (data) => api.post('/orders', data).then((r) => r.data),
  updateStatus: (id, status, noteOrOptions = '') => {
    const body = typeof noteOrOptions === 'object' && noteOrOptions !== null
      ? { status, ...noteOrOptions }
      : { status, note: noteOrOptions, rejectionReason: noteOrOptions };
    return api.patch(`/orders/${id}/status`, body).then((r) => r.data);
  },
  getAvailableDeliveries: () => api.get('/orders/delivery/available').then((r) => r.data),
  getMyDeliveries: () => api.get('/orders/delivery/my-deliveries').then((r) => r.data),
  acceptDelivery: (id) => api.patch(`/orders/${id}/accept-delivery`).then((r) => r.data),
  updateDeliveryStatus: (id, status) => api.patch(`/orders/${id}/delivery-status`, { status }).then((r) => r.data),
  updateDeliveryLocation: (id, coordinates, address) => api.patch(`/orders/${id}/delivery-location`, { coordinates, address }).then((r) => r.data),
};

export const adminApi = {
  getStats: () => api.get('/admin/stats').then((r) => r.data),
  getUsers: (params) => api.get('/admin/users', { params }).then((r) => r.data),
  updateUserStatus: (id, isActive) => api.patch(`/admin/users/${id}/status`, { isActive }).then((r) => r.data),
  getVendors: (params) => api.get('/admin/vendors', { params }).then((r) => r.data),
  verifyVendor: (id, status) => api.patch(`/admin/vendors/${id}/verify`, { status }).then((r) => r.data),
  getFoods: (params) => api.get('/admin/foods', { params }).then((r) => r.data),
  moderateFood: (id, payload) => api.patch(`/admin/foods/${id}/moderate`, payload).then((r) => r.data),
  getOrders: (params) => api.get('/admin/orders', { params }).then((r) => r.data),
};

export const subscriptionApi = {
  getPlans: (params) => api.get('/subscriptions/plans', { params }).then((r) => r.data),
  getPlanById: (id) => api.get(`/subscriptions/plans/${id}`).then((r) => r.data),
  createPlan: (data) => api.post('/subscriptions/plans', data).then((r) => r.data),
  subscribe: (data) => api.post('/subscriptions/subscribe', data).then((r) => r.data),
  getMySubscriptions: () => api.get('/subscriptions/my').then((r) => r.data),
  getVendorSubscriptions: (vendorId) => api.get(vendorId ? `/subscriptions/vendor/${vendorId}` : '/subscriptions/vendor').then((r) => r.data),
  cancelSubscription: (id) => api.patch(`/subscriptions/${id}/cancel`).then((r) => r.data),
};

export const groupOrderApi = {
  create: (data) => api.post('/group-orders/create', data).then((r) => r.data),
  getByCode: (code) => api.get(`/group-orders/${code}`).then((r) => r.data),
  join: (code, data) => api.post(`/group-orders/${code}/join`, data).then((r) => r.data),
  addItem: (code, item) => api.post(`/group-orders/${code}/items`, item).then((r) => r.data),
  checkout: (code, options) => api.post(`/group-orders/${code}/checkout`, options).then((r) => r.data),
};

export const sustainabilityApi = {
  getStats: () => api.get('/sustainability/stats').then((r) => r.data),
};

export const authApi = {
  requestOtp: (payload) => {
    const body = typeof payload === 'string' ? { phone: payload } : payload;
    return api.post('/auth/request-otp', body).then((r) => r.data);
  },
  verifyOtp: (payload) => api.post('/auth/verify-otp', payload).then((r) => r.data),
  getCurrentUser: () => api.get('/auth/me').then((r) => r.data),
  updateProfile: (data) => api.put('/auth/profile', data).then((r) => r.data),
  completeOnboarding: (data) => api.post('/auth/complete-onboarding', data).then((r) => r.data),
};

export const residentApi = {
  getProfile: (id) => api.get(id ? `/residents/profile/${id}` : '/residents/profile').then((r) => r.data),
  updatePreferences: (data) => api.put('/residents/preferences', data).then((r) => r.data),
  vouchVendor: (vendorId) => api.post('/residents/vouch', { vendorId }).then((r) => r.data),
  getRecommendations: () => api.get('/residents/recommendations').then((r) => r.data),
  updateAllergies: (allergies) => api.put('/residents/allergies', { allergies }).then((r) => r.data),
};

export const locationApi = {
  getNearby: (params) => api.get('/locations/nearby', { params }).then((r) => r.data),
  updateLocation: (data) => api.put('/locations/update', data).then((r) => r.data),
};

export default api;
