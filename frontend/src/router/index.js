import { createRouter, createWebHistory } from 'vue-router';

// Views / Pages
import Welcome_to_FoodMap from '../views/Welcome_to_FoodMap.vue';
import FoodRadar from '../views/FoodRadar.vue';
import FoodDetails from '../views/FoodDetails.vue';
import Checkout from '../views/Checkout.vue';
import OrderConfirmation from '../views/OrderConfirmation.vue';
import OrderStatus from '../views/OrderStatus.vue';
import OrderPickup from '../views/OrderPickup.vue';
import OrderCompleted from '../views/OrderCompleted.vue';
import ResidentProfile from '../views/ResidentProfile.vue';
import ResidentOrders from '../views/ResidentOrders.vue';
import VendorDashboard from '../views/VendorDashboard.vue';
import PostNewFood from '../views/PostNewFood.vue';
import YouAreLive from '../views/YouAreLive.vue';
import NewOrder from '../views/NewOrder.vue';
import VendorOrderConfirmed from '../views/VendorOrderConfirmed.vue';
import VendorProfile from '../views/VendorProfile.vue';
import EditVendorProfile from '../views/EditVendorProfile.vue';
const routes = [
  { path: '/', name: 'welcome', component: Welcome_to_FoodMap },
  { path: '/welcome', name: 'welcome-page', component: Welcome_to_FoodMap },
  { path: '/otp', redirect: '/' },
  { path: '/role-selection', redirect: '/' },
  { path: '/radar', name: 'food-radar', component: FoodRadar },
  { path: '/food-details', name: 'food-details', component: FoodDetails },
  { path: '/checkout', name: 'checkout', component: Checkout },
  { path: '/order-confirmation/:id?', name: 'order-confirmation', component: OrderConfirmation },
  { path: '/order-status/:id?', name: 'order-status', component: OrderStatus },
  { path: '/resident-orders', name: 'resident-orders', component: ResidentOrders },
  { path: '/order-pickup/:id?', name: 'order-pickup', component: OrderPickup },
  { path: '/order-completed/:id?', name: 'order-completed', component: OrderCompleted },
  { path: '/resident-profile/:id?', name: 'resident-profile', component: ResidentProfile },
  { path: '/resident-orders/:id?', name: 'resident-orders', component: ResidentOrders },
  { path: '/vendor-dashboard/:id?', name: 'vendor-dashboard', component: VendorDashboard },
  { path: '/post-food', name: 'post-food', component: PostNewFood },
  { path: '/you-are-live', name: 'you-are-live', component: YouAreLive },
  { path: '/new-order', name: 'new-order', component: NewOrder },
  { path: '/vendor-order-confirmed', name: 'vendor-order-confirmed', component: VendorOrderConfirmed },
  { path: '/vendor-profile/:id?', name: 'vendor-profile', component: VendorProfile },
  { path: '/edit-vendor-profile', name: 'edit-vendor-profile', component: EditVendorProfile },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Route Guard: Protect registered routes & enforce role restrictions
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('foodmap_token');
  const role = localStorage.getItem('foodmap_role') || '';

  const vendorOnlyRoutes = [
    '/vendor-dashboard',
    '/post-food',
    '/you-are-live',
    '/new-order',
    '/vendor-order-confirmed',
    '/edit-vendor-profile',
  ];

  const authRequiredRoutes = [
    '/resident-profile',
    '/resident-orders',
    '/order-status',
    '/order-pickup',
    '/order-completed',
    ...vendorOnlyRoutes,
  ];

  const isAuthRequired = authRequiredRoutes.some((route) => to.path.startsWith(route));

  if (isAuthRequired && !token) {
    // Guest tried to access protected route -> redirect to welcome / login
    return next({ path: '/', query: { redirect: to.fullPath } });
  }

  // If a resident attempts to access vendor-exclusive backoffice routes
  const isVendorOnly = vendorOnlyRoutes.some((route) => to.path.startsWith(route));
  if (isVendorOnly && role === 'resident') {
    return next({ path: '/radar' });
  }

  next();
});

export default router;

