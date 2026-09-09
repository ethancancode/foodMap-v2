<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from './stores/authStore.js'
import { useFoodStore } from './stores/foodStore.js'
import { useOrderStore } from './stores/orderStore.js'
import { useVendorStore } from './stores/vendorStore.js'
import { getSocket } from './services/socket.js'

// Import all FoodMap view screen components
import Welcome_to_FoodMap from './views/Welcome_to_FoodMap.vue'
import FoodRadar from './views/FoodRadar.vue'
import ExploreRadar from './views/ExploreRadar.vue'
import FoodDetails from './views/FoodDetails.vue'
import Checkout from './views/Checkout.vue'
import OrderConfirmation from './views/OrderConfirmation.vue'
import OrderStatus from './views/OrderStatus.vue'
import OrderPickup from './views/OrderPickup.vue'
import OrderCompleted from './views/OrderCompleted.vue'
import ResidentProfile from './views/ResidentProfile.vue'
import VendorDashboard from './views/VendorDashboard.vue'
import PostNewFood from './views/PostNewFood.vue'
import YouAreLive from './views/YouAreLive.vue'
import NewOrder from './views/NewOrder.vue'
import VendorOrderConfirmed from './views/VendorOrderConfirmed.vue'
import VendorProfile from './views/VendorProfile.vue'
import EditVendorProfile from './views/EditVendorProfile.vue'

import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const authStore = useAuthStore()
const foodStore = useFoodStore()
const orderStore = useOrderStore()
const vendorStore = useVendorStore()

// Mapping between screenId and URL route paths
const screenToPath = {
  welcome: '/',
  food_radar: '/radar',
  explore_radar: '/explore-radar',
  food_details: '/food-details',
  checkout: '/checkout',
  order_confirmation: '/order-confirmation',
  order_status: '/order-status',
  order_pickup: '/order-pickup',
  order_completed: '/order-completed',
  resident_profile: '/resident-profile',
  vendor_dashboard: '/vendor-dashboard',
  post_new_food: '/post-food',
  you_are_live: '/you-are-live',
  new_order: '/new-order',
  vendor_order_confirmed: '/vendor-order-confirmed',
  vendor_profile: '/vendor-profile',
  edit_vendor_profile: '/edit-vendor-profile',
}

const pathToScreen = Object.fromEntries(
  Object.entries(screenToPath).map(([screen, path]) => [path, screen])
)
pathToScreen['/welcome'] = 'welcome'

// Screens registry
const screenComponents = {
  welcome: Welcome_to_FoodMap,
  food_radar: FoodRadar,
  explore_radar: ExploreRadar,
  food_details: FoodDetails,
  checkout: Checkout,
  order_confirmation: OrderConfirmation,
  order_status: OrderStatus,
  order_pickup: OrderPickup,
  order_completed: OrderCompleted,
  resident_profile: ResidentProfile,
  vendor_dashboard: VendorDashboard,
  post_new_food: PostNewFood,
  you_are_live: YouAreLive,
  new_order: NewOrder,
  vendor_order_confirmed: VendorOrderConfirmed,
  vendor_profile: VendorProfile,
  edit_vendor_profile: EditVendorProfile,
}

// Drive active screen directly from current URL path
const currentScreenId = computed(() => {
  return pathToScreen[route.path] || 'welcome'
})



const currentScreen = computed(() => {
  return screenComponents[currentScreenId.value] || Welcome_to_FoodMap
})

const currentUser = computed(() => authStore.user)
const currentRole = computed(() => authStore.currentRole)
const selectedFood = computed(() => foodStore.selectedFood || foodStore.foods[0])
const currentOrder = computed(() => orderStore.currentOrder)

const toastMessage = ref('')
const isToastVisible = ref(false)
let toastTimer = null

function showToast(msg) {
  toastMessage.value = msg
  isToastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    isToastVisible.value = false
  }, 2800)
}

function navigateTo(target, payload = null) {
  if (!target) return
  let targetId = target

  if (targetId.startsWith('applet:')) {
    targetId = targetId.replace('applet:', '')
  }

  // Handle aliases & actions
  if (targetId === 'explore_radar' || targetId === 'explore-radar' || targetId === 'explore') {
    targetId = 'explore_radar'
  } else if (targetId === 'home' || targetId === 'food_radar') {
    targetId = currentRole.value === 'vendor' ? 'vendor_dashboard' : 'food_radar'
  } else if (targetId === 'dashboard' || targetId === 'vendor_home' || targetId === 'listings') {
    targetId = 'vendor_dashboard'
  } else if (targetId === 'post_food') {
    targetId = 'post_new_food'
  } else if (targetId === 'orders' || targetId === 'my_orders') {
    targetId = currentRole.value === 'vendor' ? 'vendor_order_confirmed' : 'order_status'
  } else if (targetId === 'vendor-orders' || targetId === 'vendor_orders') {
    targetId = 'vendor_order_confirmed'
  } else if (targetId === 'profile') {
    targetId = currentRole.value === 'vendor' ? 'vendor_profile' : 'resident_profile'
  } else if (targetId === 'welcome' || targetId === 'logout') {
    authStore.logout()
    router.push('/')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  } else if (targetId === 'back') {
    goBack()
    return
  }

  if (payload) {
    if (targetId === 'food_details' || payload.food || payload.price !== undefined) {
      foodStore.selectFood(payload.food || payload)
    }
    if (payload.order || payload.orderNumber || payload.totalAmount || payload.item) {
      orderStore.currentOrder = { ...orderStore.currentOrder, ...(payload.order || payload) }
    }
    if (payload.role) {
      authStore.setRole(payload.role)
    }
  }

  const targetPath = screenToPath[targetId] || '/'
  if (route.path !== targetPath) {
    router.push(targetPath)
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    const fallbackPath = currentRole.value === 'vendor' ? '/vendor-dashboard' : '/radar'
    router.push(fallbackPath)
  }
}



function handleAuthSuccess(authData) {
  if (authStore.currentRole === 'vendor' || authStore.user?.role === 'vendor') {
    navigateTo('vendor_dashboard')
    showToast(`Welcome! Logged in as Kitchen Vendor (${authStore.user?.name || 'Chef'}).`)
  } else {
    navigateTo('food_radar')
    showToast(`Welcome! Logged in as Resident (${authStore.user?.name || 'Resident'}).`)
  }
}

function handleExploreGuest() {
  authStore.currentRole = 'guest'
  navigateTo('food_radar')
  showToast('Welcome to FoodMap! Exploring nearby home cooks as Guest.')
}

function handleRoleSwitch(role) {
  authStore.setRole(role)
  showToast(`Switched to ${role === 'vendor' ? 'Vendor Mode (Kitchen)' : 'Resident Mode (Discovery)'}`)
  if (role === 'vendor') {
    navigateTo('vendor_dashboard')
  } else {
    navigateTo('food_radar')
  }
}

function handleAction(event) {
  if (!event) return
  const action = event.action || event
  const payload = event.payload || null

  if (action === 'toast') {
    showToast(payload?.message || 'Updated successfully')
  } else if (action === 'logout') {
    authStore.logout()
    router.push('/')
    showToast('Logged out successfully')
  } else if (action === 'set-role' || action === 'switch-role') {
    handleRoleSwitch(payload?.role || (currentRole.value === 'resident' ? 'vendor' : 'resident'))
  } else if (action === 'create-order') {
    orderStore.placeOrder(payload)
    showToast('Order placed! Notifying kitchen...')
  } else if (action === 'update-order-status') {
    orderStore.updateStatus(payload?.id || orderStore.currentOrder?._id, payload?.status)
    showToast(`Order status updated to ${payload?.status}`)
  } else if (action === 'post-food') {
    foodStore.addFood(payload)
    showToast('Food is now LIVE on FoodMap radar!')
  } else if (action === 'call-vendor' || action === 'call') {
    showToast('Connecting call to kitchen...')
  } else if (action === 'share') {
    showToast('Dish link copied to clipboard!')
  } else if (action === 'save' || action === 'favorite') {
    showToast('Saved to your favorite neighborhood kitchens!')
  }
}

onMounted(async () => {
  try {
    getSocket()
    await authStore.initAuth()
    // If user is at root and already authenticated, direct to their home screen
    if (route.path === '/' && authStore.isAuthenticated && authStore.user) {
      if (authStore.user.role === 'vendor') {
        router.push('/vendor-dashboard')
      } else {
        router.push('/radar')
      }
    }
    foodStore.fetchFoods()
    orderStore.fetchOrders()
    vendorStore.fetchVendors()
  } catch (e) {
    console.warn('[App Init Warning]', e.message)
  }
})

</script>

<template>
  <div id="foodmap-app" class="relative min-h-screen bg-background font-body antialiased selection:bg-primary/20 selection:text-primary">
    <!-- Main Dynamic Screen -->
    <main class="w-full min-h-screen">
      <component
        :is="currentScreen"
        :user="currentUser"
        :current-role="currentRole"
        :food="selectedFood"
        :order="currentOrder"
        @navigate="navigateTo"
        @action="handleAction"
        @role-switch="handleRoleSwitch"
        @auth-success="handleAuthSuccess"
        @explore-guest="handleExploreGuest"
        @role-selected="(role) => authStore.setRole(role)"
      />
    </main>

    <!-- Real-time Toast Notifications -->
    <transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-4 opacity-0 scale-95"
      enter-to-class="translate-y-0 opacity-100 scale-100"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isToastVisible"
        id="toast-notification"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-4 py-3 bg-inverse-surface text-inverse-on-surface rounded-2xl shadow-2xl border border-white/10 text-xs font-semibold max-w-sm w-full mx-4 backdrop-blur-md"
      >
        <span class="material-symbols-outlined text-[20px] text-primary">info</span>
        <span class="flex-1">{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>
