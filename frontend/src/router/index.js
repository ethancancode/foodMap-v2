import { createRouter, createWebHistory } from 'vue-router';

// Lazy load or component map
import Welcome_to_FoodMap from '../components/Welcome_to_FoodMap.vue';
import FoodRadar from '../components/FoodRadar.vue';
import FoodDetails from '../components/FoodDetails.vue';
import Checkout from '../components/Checkout.vue';
import OrderConfirmation from '../components/OrderConfirmation.vue';
import OrderStatus from '../components/OrderStatus.vue';
import OrderPickup from '../components/OrderPickup.vue';
import OrderCompleted from '../components/OrderCompleted.vue';
import ResidentProfile from '../components/ResidentProfile.vue';
import VendorDashboard from '../components/VendorDashboard.vue';
import PostNewFood from '../components/PostNewFood.vue';
import YouAreLive from '../components/YouAreLive.vue';
import NewOrder from '../components/NewOrder.vue';
import VendorOrderConfirmed from '../components/VendorOrderConfirmed.vue';
import VendorProfile from '../components/VendorProfile.vue';
import EditVendorProfile from '../components/EditVendorProfile.vue';
import RoleSelection from '../components/RoleSelection.vue';
import OTPVerification from '../components/OTPVerification.vue';

const routes = [
  { path: '/', name: 'welcome', component: Welcome_to_FoodMap },
  { path: '/welcome', name: 'welcome-page', component: Welcome_to_FoodMap },
  { path: '/otp', name: 'otp', component: OTPVerification },
  { path: '/role-selection', name: 'role-selection', component: RoleSelection },
  { path: '/radar', name: 'food-radar', component: FoodRadar },
  { path: '/food-details', name: 'food-details', component: FoodDetails },
  { path: '/checkout', name: 'checkout', component: Checkout },
  { path: '/order-confirmation', name: 'order-confirmation', component: OrderConfirmation },
  { path: '/order-status', name: 'order-status', component: OrderStatus },
  { path: '/order-pickup', name: 'order-pickup', component: OrderPickup },
  { path: '/order-completed', name: 'order-completed', component: OrderCompleted },
  { path: '/resident-profile', name: 'resident-profile', component: ResidentProfile },
  { path: '/vendor-dashboard', name: 'vendor-dashboard', component: VendorDashboard },
  { path: '/post-food', name: 'post-food', component: PostNewFood },
  { path: '/you-are-live', name: 'you-are-live', component: YouAreLive },
  { path: '/new-order', name: 'new-order', component: NewOrder },
  { path: '/vendor-order-confirmed', name: 'vendor-order-confirmed', component: VendorOrderConfirmed },
  { path: '/vendor-profile', name: 'vendor-profile', component: VendorProfile },
  { path: '/edit-vendor-profile', name: 'edit-vendor-profile', component: EditVendorProfile },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Route Guard: Protect registered routes from guests
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('foodmap_token');
  const protectedRoutes = [
    '/resident-profile',
    '/order-status',
    '/order-pickup',
    '/order-completed',
    '/vendor-dashboard',
    '/post-food',
    '/you-are-live',
    '/vendor-order-confirmed',
    '/vendor-profile',
    '/edit-vendor-profile',
  ];

  if (protectedRoutes.includes(to.path) && !token) {
    // Guest tried to access protected profile or order route -> redirect to welcome / login
    next({ path: '/', query: { redirect: to.fullPath } });
  } else {
    next();
  }
});

export default router;

