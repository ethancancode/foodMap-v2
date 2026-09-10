<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { orderApi, vendorApi } from '../services/api.js'
import { onNewIncomingOrder, onOrderStatusChanged, subscribeToVendor } from '../services/socket.js'
import { useOrderStore } from '../stores/orderStore.js'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    default: 'resident', // 'resident' | 'vendor' | 'guest'
  },
  activeRoute: {
    type: String,
    default: '',
  },
  user: {
    type: Object,
    default: null,
  },
  vendorProfile: {
    type: Object,
    default: null,
  },
  pendingOrdersCount: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['close', 'navigate', 'logout', 'sign-in'])

const orderStore = useOrderStore()
const isVendor = computed(() => props.role === 'vendor' || props.user?.role === 'vendor')
const isGuest = computed(() => !props.user || props.role === 'guest')

const internalPendingCount = ref(0)
let unsubNew, unsubStatus

async function fetchPendingCount() {
  try {
    const vendorId = props.vendorProfile?._id || props.vendorProfile?.id || props.user?.vendor?._id || props.user?.vendor?.id || (isVendor.value ? props.user?.vendor : null)
    if (isVendor.value && vendorId) {
      subscribeToVendor(vendorId)
    }
    const params = isVendor.value && vendorId ? { vendor: vendorId } : {}
    const res = await orderApi.getOrders(params).catch(() => null)
    const orders = res?.orders || res?.data || []
    const ACTIVE_STATUSES = ['pending', 'placed', 'accepted', 'preparing', 'ready_for_pickup', 'ready']
    const active = (orders || []).filter((o) =>
      ACTIVE_STATUSES.includes((o.status || '').toLowerCase())
    )
    internalPendingCount.value = active.length
    if (orders.length > 0) {
      orderStore.orders = orders
    }
  } catch (err) {
    console.error('Failed to fetch pending orders for sidebar:', err)
  }
}

onMounted(() => {
  fetchPendingCount()
  unsubNew = onNewIncomingOrder((order) => {
    const vendorId = props.vendorProfile?._id || props.vendorProfile?.id || props.user?.vendor?._id || props.user?.vendor?.id || props.user?.vendor
    const orderVendorId = order.vendor?._id || order.vendor?.id || order.vendor
    if (isVendor.value && vendorId && orderVendorId && String(vendorId) !== String(orderVendorId)) {
      return
    }
    internalPendingCount.value += 1
    if (orderStore && order) {
      orderStore.orders.unshift(order)
    }
  })
  unsubStatus = onOrderStatusChanged(() => {
    fetchPendingCount()
  })
})

watch(() => props.pendingOrdersCount, (newVal) => {
  if (newVal !== undefined && newVal !== null) {
    internalPendingCount.value = newVal
  }
})

onUnmounted(() => {
  if (unsubNew) unsubNew()
  if (unsubStatus) unsubStatus()
})

const effectivePendingOrdersCount = computed(() => {
  if (props.pendingOrdersCount !== undefined && props.pendingOrdersCount !== null) {
    return Number(props.pendingOrdersCount)
  }
  return internalPendingCount.value
})

// Sidebar Navigation Items
const navItems = computed(() => {
  if (isVendor.value) {
    return [
      {
        id: 'kitchen_hub',
        label: 'Kitchen Hub',
        icon: 'dashboard',
        route: 'vendor_dashboard',
      },
      {
        id: 'post_new_food',
        label: 'Post New Food',
        icon: 'add_circle',
        route: 'post_new_food',
      },
      {
        id: 'incoming_orders',
        label: 'Incoming Orders',
        icon: 'notifications_active',
        route: 'new_order',
        badge: effectivePendingOrdersCount.value,
      },
      {
        id: 'vendor_profile',
        label: 'Kitchen Profile',
        icon: 'storefront',
        route: 'vendor_profile',
      },
    ]
  }

  // Resident / Guest navigation
  const base = [
    {
      id: 'home',
      label: 'Home',
      icon: 'home',
      route: 'food_radar',
    },
    {
      id: 'explore_radar',
      label: 'Explore Map',
      icon: 'explore',
      route: 'explore_radar',
    },
  ]

  if (!isGuest.value) {
    base.push(
      {
        id: 'resident_orders',
        label: 'Orders',
        icon: 'receipt_long',
        route: 'resident_orders',
      },
      {
        id: 'resident_profile',
        label: 'Profile',
        icon: 'person',
        route: 'resident_profile',
      }
    )
  }

  return base
})

const vendorDisplayName = computed(() => {
  return (
    props.vendorProfile?.businessName ||
    props.user?.vendor?.businessName ||
    props.user?.name ||
    'My Kitchen'
  )
})

const residentDisplayName = computed(() => {
  if (isGuest.value) return 'Guest Explorer'
  return props.user?.name || 'Resident'
})

const residentLocationName = computed(() => {
  if (isGuest.value) return 'Tap to Sign In'
  return (
    props.user?.location?.address ||
    props.user?.address ||
    'Matunga East, Mumbai'
  )
})

function handleNavigate(route) {
  emit('navigate', route)
  emit('close')
}

function handleBrandClick() {
  const homeRoute = isVendor.value ? 'vendor_dashboard' : 'food_radar'
  handleNavigate(homeRoute)
}

function handleAccountClick() {
  if (isGuest.value) {
    emit('sign-in')
    emit('close')
  } else if (isVendor.value) {
    handleNavigate('vendor_profile')
  } else {
    handleNavigate('resident_profile')
  }
}

function handleLogout() {
  emit('logout')
  emit('close')
}
</script>

<template>
  <!-- Mobile Backdrop Overlay -->
  <transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 lg:hidden"
      @click="emit('close')"
    ></div>
  </transition>

  <!-- Sidebar Container -->
  <aside
    :class="[
      'fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col border-r border-outline-variant/30 shadow-[4px_0_24px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-in-out',
      isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    ]"
  >
    <!-- Brand Header -->
    <div class="p-4 lg:p-stack-lg flex items-center justify-between gap-base border-b border-outline-variant/15">
      <button
        type="button"
        @click="handleBrandClick"
        class="flex items-center gap-3 text-left cursor-pointer select-none"
      >
        <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md shrink-0">
          <span class="material-symbols-outlined text-on-primary text-[22px]">
            {{ isVendor ? 'soup_kitchen' : 'map' }}
          </span>
        </div>
        <div class="flex flex-col min-w-0">
          <span class="font-headline-lg text-title-md tracking-tight text-primary font-bold leading-tight">
            FoodMap
          </span>
          <span class="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold mt-0.5 leading-tight">
            {{ isVendor ? 'Vendor Portal' : 'Live Neighborhood Radar' }}
          </span>
        </div>
      </button>

      <!-- Close button for mobile drawer -->
      <button
        type="button"
        @click="emit('close')"
        class="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
        aria-label="Close sidebar"
      >
        <span class="material-symbols-outlined text-[20px]">close</span>
      </button>
    </div>

    <!-- Navigation Links -->
    <nav class="flex-1 px-base space-y-stack-sm mt-3 overflow-y-auto">
      <button
        v-for="item in navItems"
        :key="item.id"
        type="button"
        @click="handleNavigate(item.route)"
        :class="[
          'w-full flex items-center justify-between px-gutter py-stack-md rounded-xl transition-all cursor-pointer font-medium text-left',
          activeRoute === item.route || activeRoute === item.id
            ? 'bg-primary text-on-primary font-bold shadow-xs'
            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
        ]"
      >
        <div class="flex items-center min-w-0">
          <span class="material-symbols-outlined mr-gutter shrink-0">{{ item.icon }}</span>
          <span class="font-label-md truncate">{{ item.label }}</span>
        </div>

        <span
          v-if="item.badge && item.badge > 0"
          :class="[
            'ml-2 px-2 py-0.5 min-w-[20px] text-center text-[10px] font-black rounded-full shrink-0 shadow-xs transition-colors',
            (activeRoute === item.route || activeRoute === item.id)
              ? 'bg-white text-primary'
              : 'bg-primary text-on-primary'
          ]"
        >
          {{ item.badge }}
        </span>
      </button>

      <!-- Guest Exploration Banner inside Nav -->
      <div
        v-if="isGuest"
        class="mt-2 w-full p-4 bg-primary/10 border border-primary/20 rounded-2xl flex flex-col gap-2.5 shadow-xs text-left"
      >
        <div class="flex items-center gap-2 text-primary font-bold text-xs">
          <span class="material-symbols-outlined text-[18px]">travel_explore</span>
          <span>Guest Explorer</span>
        </div>
        <p class="text-[11px] text-on-surface-variant leading-relaxed">
          Sign in to track live home kitchen batches and order fresh meals.
        </p>
        <button
          type="button"
          @click="handleAccountClick"
          class="w-full py-2.5 px-3 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <span class="material-symbols-outlined text-[16px]">login</span>
          <span>Sign In / Register</span>
        </button>
      </div>
    </nav>

    <!-- Sidebar Bottom Footer Area -->
    <div class="px-base py-stack-lg border-t border-outline-variant/20 space-y-stack-sm">
      <!-- Profile Card / Badge -->
      <div
        @click="handleAccountClick"
        class="w-full flex items-center gap-gutter px-gutter py-stack-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 transition-colors text-left cursor-pointer mb-2"
      >
        <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
          {{ isVendor ? vendorDisplayName.charAt(0).toUpperCase() : (isGuest ? '?' : residentDisplayName.charAt(0).toUpperCase()) }}
        </div>
        <div class="flex flex-col min-w-0">
          <span class="font-label-md text-on-surface leading-normal text-xs font-bold truncate">
            {{ isVendor ? vendorDisplayName : residentDisplayName }}
          </span>
          <span class="text-[10px] text-on-surface-variant uppercase tracking-wider font-medium truncate">
            {{ isVendor ? 'Active Kitchen' : residentLocationName }}
          </span>
        </div>
      </div>

      <!-- Edit Kitchen Info button (shown only on Vendor Profile route) -->
      <button
        v-if="isVendor && (activeRoute === 'vendor_profile' || activeRoute === 'kitchen_profile')"
        type="button"
        @click="handleNavigate('edit_vendor_profile')"
        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-xs font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
      >
        <span class="material-symbols-outlined text-[18px]">edit</span>
        <span>Edit Kitchen Info</span>
      </button>

      <!-- Logout / Switch Account / Sign Out Button -->
      <button
        type="button"
        @click="handleLogout"
        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
      >
        <span class="material-symbols-outlined text-[16px]">logout</span>
        <span>Sign Out</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
