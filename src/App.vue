<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from './stores/authStore.js'
import { useFoodStore } from './stores/foodStore.js'
import { useOrderStore } from './stores/orderStore.js'
import { useVendorStore } from './stores/vendorStore.js'
import { getSocket } from './services/socket.js'

// Import all FoodMap screen components
import Welcome_to_FoodMap from './components/Welcome_to_FoodMap.vue'
import FoodRadar from './components/FoodRadar.vue'
import FoodDetails from './components/FoodDetails.vue'
import Checkout from './components/Checkout.vue'
import OrderConfirmation from './components/OrderConfirmation.vue'
import OrderStatus from './components/OrderStatus.vue'
import OrderPickup from './components/OrderPickup.vue'
import OrderCompleted from './components/OrderCompleted.vue'
import ResidentProfile from './components/ResidentProfile.vue'
import VendorDashboard from './components/VendorDashboard.vue'
import PostNewFood from './components/PostNewFood.vue'
import YouAreLive from './components/YouAreLive.vue'
import NewOrder from './components/NewOrder.vue'
import VendorOrderConfirmed from './components/VendorOrderConfirmed.vue'
import VendorProfile from './components/VendorProfile.vue'
import EditVendorProfile from './components/EditVendorProfile.vue'
import RoleSelection from './components/RoleSelection.vue'
import OTPVerification from './components/OTPVerification.vue'

const authStore = useAuthStore()
const foodStore = useFoodStore()
const orderStore = useOrderStore()
const vendorStore = useVendorStore()

// Screens registry
const screenComponents = {
  welcome: Welcome_to_FoodMap,
  food_radar: FoodRadar,
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
  role_selection: RoleSelection,
  otp_verification: OTPVerification,
}

// Navigation state
const currentScreenId = ref('welcome')
const navigationHistory = ref(['welcome'])

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
  if (targetId === 'home' || targetId === 'explore' || targetId === 'food_radar') {
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

  if (screenComponents[targetId]) {
    currentScreenId.value = targetId
    navigationHistory.value.push(targetId)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function goBack() {
  if (navigationHistory.value.length > 1) {
    navigationHistory.value.pop()
    currentScreenId.value = navigationHistory.value[navigationHistory.value.length - 1]
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    currentScreenId.value = currentRole.value === 'vendor' ? 'vendor_dashboard' : 'food_radar'
  }
}

function handleAuthSuccess(authData) {
  if (authData?.role) {
    authStore.setRole(authData.role)
  }
  if (authData?.phone) {
    if (authStore.user) authStore.user.phone = authData.phone
  }

  if (authStore.currentRole === 'vendor') {
    navigateTo('vendor_dashboard')
  } else {
    navigateTo('food_radar')
  }
  showToast(`Welcome! Logged in as ${authStore.currentRole === 'vendor' ? 'Kitchen Vendor' : 'Resident'}.`)
}

function handleExploreGuest() {
  authStore.setRole('resident')
  navigateTo('food_radar')
  showToast('Welcome to FoodMap! Exploring nearby home cooks.')
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
    showToast('Connecting call to Anjali (+91 98201 45892)...')
  } else if (action === 'share') {
    showToast('Dish link copied to clipboard!')
  } else if (action === 'save' || action === 'favorite') {
    showToast('Saved to your favorite neighborhood kitchens!')
  }
}

onMounted(async () => {
  try {
    getSocket()
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
