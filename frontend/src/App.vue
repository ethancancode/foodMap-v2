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
import ResidentOrders from './views/ResidentOrders.vue'
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
  resident_orders: '/resident-orders',
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
  resident_orders: ResidentOrders,
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
  if (pathToScreen[route.path]) {
    return pathToScreen[route.path]
  }
  if (route.path.startsWith('/order-confirmation')) {
    return 'order_confirmation'
  }
  if (route.path.startsWith('/order-status')) {
    return 'order_status'
  }
  if (route.path.startsWith('/order-pickup')) {
    return 'order_pickup'
  }
  if (route.path.startsWith('/order-completed')) {
    return 'order_completed'
  }
  if (route.path.startsWith('/vendor-profile')) {
    return 'vendor_profile'
  }
  if (route.path.startsWith('/vendor-dashboard')) {
    return 'vendor_dashboard'
  }
  if (route.path.startsWith('/resident-profile')) {
    return 'resident_profile'
  }
  if (route.path.startsWith('/resident-orders')) {
    return 'resident_orders'
  }
  return 'welcome'
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

  let targetPath = screenToPath[targetId] || '/'

  // If navigating to order routes with an order ID, include it in the URL
  const orderObj = payload?.order || payload
  const orderIdentifier = orderObj?._id || orderObj?.orderNumber || orderObj?.id
  if (orderIdentifier) {
    if (targetId === 'order_confirmation') {
      targetPath = `/order-confirmation/${encodeURIComponent(orderIdentifier)}`
    } else if (targetId === 'order_status') {
      targetPath = `/order-status/${encodeURIComponent(orderIdentifier)}`
    } else if (targetId === 'order_pickup') {
      targetPath = `/order-pickup/${encodeURIComponent(orderIdentifier)}`
    } else if (targetId === 'order_completed') {
      targetPath = `/order-completed/${encodeURIComponent(orderIdentifier)}`
    }
  }

  // If navigating to vendor_profile with a specific vendorId or vendor object
  if (targetId === 'vendor_profile') {
    const vendorId = payload?.vendorId || payload?.vendor?._id || payload?.vendor?.id || (typeof payload?.vendor === 'string' && payload.vendor.length === 24 ? payload.vendor : null) || authStore.user?.vendor?._id || authStore.user?.vendor?.id || authStore.user?.vendor || authStore.user?._id
    if (vendorId) {
      targetPath = `/vendor-profile/${encodeURIComponent(vendorId)}`
    }
  }

  // If navigating to vendor_dashboard with vendor ID in URL
  if (targetId === 'vendor_dashboard') {
    const vendorId = payload?.vendorId || payload?.vendor?._id || payload?.vendor?.id || authStore.user?.vendor?._id || authStore.user?.vendor?.id || authStore.user?.vendor || authStore.user?._id
    if (vendorId) {
      targetPath = `/vendor-dashboard/${encodeURIComponent(vendorId)}`
    }
  }

  // If navigating to resident_profile with resident/user ID in URL
  if (targetId === 'resident_profile') {
    const residentId = payload?.userId || payload?.residentId || authStore.user?._id || authStore.user?.id
    if (residentId) {
      targetPath = `/resident-profile/${encodeURIComponent(residentId)}`
    }
  }

  // If navigating to resident_orders with resident/user ID in URL
  if (targetId === 'resident_orders') {
    const residentId = payload?.userId || payload?.residentId || authStore.user?._id || authStore.user?.id
    if (residentId) {
      targetPath = `/resident-orders/${encodeURIComponent(residentId)}`
    }
  }

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
  const userId = authStore.user?._id || authStore.user?.id
  const vendorId = authStore.user?.vendor?._id || authStore.user?.vendor?.id || authStore.user?.vendor || userId

  if (authStore.currentRole === 'vendor' || authStore.user?.role === 'vendor' || authData?.role === 'vendor') {
    if (vendorId) {
      router.push(`/vendor-dashboard/${encodeURIComponent(vendorId)}`)
    } else {
      navigateTo('vendor_dashboard')
    }
    showToast(`Welcome! Logged in as Kitchen Vendor (${authStore.user?.name || 'Chef'}).`)
  } else {
    if (userId) {
      router.push(`/radar?resident=${encodeURIComponent(userId)}`)
    } else {
      navigateTo('food_radar')
    }
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

import { locationApi } from './services/api.js'

let appGeoWatchId = null
let lastUpdatedLocation = null

function startContinuousLocationSync() {
  if (!('geolocation' in navigator)) return
  if (appGeoWatchId !== null) return

  // Watch position with high accuracy
  appGeoWatchId = navigator.geolocation.watchPosition(
    async (pos) => {
      // If user already has an explicit location set on profile, do not override with device GPS
      if (authStore.user?.location?.coordinates && Array.isArray(authStore.user.location.coordinates) && authStore.user.location.coordinates.length === 2) {
        return
      }

      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      if (!lat || !lng) return

      // Only sync if moved more than ~15-20 meters to save network calls
      if (lastUpdatedLocation) {
        const dLat = Math.abs(lat - lastUpdatedLocation.lat)
        const dLng = Math.abs(lng - lastUpdatedLocation.lng)
        if (dLat < 0.00015 && dLng < 0.00015) {
          return
        }
      }

      lastUpdatedLocation = { lat, lng }

      // Reverse geocode to get a readable address
      let readableAddress = 'Current Live Location'
      try {
        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        )
        if (bdcRes.ok) {
          const data = await bdcRes.json()
          const locality = data.locality || data.city || data.principalSubdivision || ''
          const neighborhood = data.localityInfo?.administrative?.[3]?.name || data.localityInfo?.administrative?.[2]?.name || ''
          readableAddress = [neighborhood, locality].filter(Boolean).join(', ') || data.plusCode || 'Current Location'
        }
      } catch (e) {
        // ignore geocode error
      }

      // Update in auth store
      if (authStore.user) {
        authStore.user.location = {
          type: 'Point',
          coordinates: [lng, lat],
          address: readableAddress
        }
      }

      // Send to backend if authenticated
      if (authStore.isAuthenticated) {
        locationApi.updateLocation({ lng, lat, address: readableAddress }).catch(() => {})
      }
    },
    (err) => {
      console.warn('[Location Sync Warning]', err.message)
    },
    { enableHighAccuracy: true, maximumAge: 5000 }
  )
}

onMounted(async () => {
  try {
    getSocket()
    await authStore.initAuth()
    startContinuousLocationSync()
    // If user is at root and already authenticated, direct to their home screen
    if (route.path === '/' && authStore.isAuthenticated && authStore.user) {
      const userId = authStore.user._id || authStore.user.id
      const vendorId = authStore.user.vendor?._id || authStore.user.vendor?.id || authStore.user.vendor || userId
      if (authStore.user.role === 'vendor') {
        router.push(vendorId ? `/vendor-dashboard/${encodeURIComponent(vendorId)}` : '/vendor-dashboard')
      } else {
        router.push(userId ? `/radar?resident=${encodeURIComponent(userId)}` : '/radar')
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
