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
import AdminDashboard from '../views/AdminDashboard.vue';
import DeliveryPartnerDashboard from '../views/DeliveryPartnerDashboard.vue';

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
  { path: '/admin', name: 'admin-dashboard', component: AdminDashboard },
  { path: '/delivery', name: 'delivery-dashboard', component: DeliveryPartnerDashboard },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

function getRoleHome(role) {
  if (role === 'admin') return '/admin';
  if (role === 'delivery_partner' || role === 'courier') return '/delivery';
  if (role === 'vendor') return '/vendor-dashboard';
  return '/radar';
}

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

  const adminOnlyRoutes = [
    '/admin'
  ];

  const deliveryOnlyRoutes = [
    '/delivery'
  ];

  const authRequiredRoutes = [
    '/resident-profile',
    '/resident-orders',
    '/order-status',
    '/order-pickup',
    '/order-completed',
    ...vendorOnlyRoutes,
    ...adminOnlyRoutes,
    ...deliveryOnlyRoutes
  ];

  const isAuthRequired = authRequiredRoutes.some((route) => to.path.startsWith(route));

  // 1. Unauthenticated users accessing protected routes -> redirect to welcome
  if (isAuthRequired && !token) {
    return next({ path: '/', query: { redirect: to.fullPath } });
  }

  // 2. Authenticated users landing on root / welcome -> redirect to their role home
  if ((to.path === '/' || to.path === '/welcome') && token && role) {
    return next({ path: getRoleHome(role) });
  }

  // 3. Admin routes only accessible by admin
  if (adminOnlyRoutes.some((route) => to.path.startsWith(route)) && role !== 'admin') {
    return next({ path: getRoleHome(role) });
  }

  // 4. Delivery routes only accessible by delivery partner
  if (deliveryOnlyRoutes.some((route) => to.path.startsWith(route)) && role !== 'delivery_partner' && role !== 'courier') {
    return next({ path: getRoleHome(role) });
  }

  // 5. Vendor routes only accessible by vendor
  if (vendorOnlyRoutes.some((route) => to.path.startsWith(route)) && role !== 'vendor') {
    return next({ path: getRoleHome(role) });
  }

  // 6. Admin and Delivery Partner cannot be accidentally routed to resident radar
  if (to.path === '/radar' && role === 'admin') {
    return next({ path: '/admin' });
  }
  if (to.path === '/radar' && (role === 'delivery_partner' || role === 'courier')) {
    return next({ path: '/delivery' });
  }

  next();
});

export default router;

