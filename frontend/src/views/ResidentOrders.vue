<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { orderApi } from '../services/api.js'
import { onOrderStatusChanged, onNewIncomingOrder } from '../services/socket.js'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

const props = defineProps({
  user: Object,
  currentRole: {
    type: String,
    default: 'resident',
  },
})

const emit = defineEmits(['navigate', 'action', 'logout'])

const activeTab = ref('active') // 'active' | 'past'
const isLoading = ref(true)
const orders = ref([])

const ACTIVE_STATUSES = ['pending', 'placed', 'accepted', 'preparing', 'ready_for_pickup', 'ready', 'out_for_delivery']

function isOrderActive(order) {
  const s = (order.status || '').toLowerCase()
  // Active ongoing statuses
  if (ACTIVE_STATUSES.includes(s)) return true
  // Cancelled or rejected orders remain in active history until resident checks / views it
  if (['cancelled', 'rejected'].includes(s) && !order.isViewedByResident) {
    return true
  }
  return false
}

const activeOrders = computed(() => {
  return orders.value.filter(o => isOrderActive(o))
})

const pastOrders = computed(() => {
  return orders.value.filter(o => !isOrderActive(o))
})

function formatVendorName(val) {
  if (!val) return 'Home Kitchen'
  if (typeof val === 'string') return val
  return val.businessName || val.name || 'Home Kitchen'
}

function formatDate(isoStr) {
  if (!isoStr) return 'Recent Order'
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return 'Recent Order'
  }
}

function getStatusBadgeClass(status) {
  const s = (status || '').toLowerCase()
  switch (s) {
    case 'pending':
    case 'placed':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'accepted':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'preparing':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'ready_for_pickup':
    case 'ready':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'completed':
    case 'delivered':
      return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30'
    case 'cancelled':
      return 'bg-rose-100 text-rose-800 border-rose-200'
    default:
      return 'bg-primary/10 text-primary border-primary/20'
  }
}

function getStatusLabel(status) {
  const s = (status || '').toLowerCase()
  switch (s) {
    case 'pending':
    case 'placed':
      return 'Order Placed'
    case 'accepted':
      return 'Kitchen Accepted'
    case 'preparing':
      return 'Preparing Fresh'
    case 'ready_for_pickup':
    case 'ready':
      return 'Ready for Pickup'
    case 'completed':
    case 'delivered':
      return 'Delivered & Enjoyed'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status?.replace(/_/g, ' ')?.toUpperCase() || 'Placed'
  }
}

async function fetchOrders() {
  isLoading.value = true
  try {
    const res = await orderApi.getOrders().catch(() => null)
    const list = res?.orders || res?.data || []
    orders.value = list
  } catch (err) {
    console.error('Failed to fetch resident orders:', err)
  } finally {
    isLoading.value = false
  }
}

let unsubStatus, unsubNew

onMounted(() => {
  fetchOrders()

  unsubStatus = onOrderStatusChanged((data) => {
    fetchOrders()
    if (data?.status === 'CANCELLED' || data?.status === 'REJECTED') {
      emit('action', {
        action: 'toast',
        payload: {
          message: `⚠️ Order #${data.orderNumber || ''} was cancelled by the cook${data.rejectionReason ? ': ' + data.rejectionReason : '.'}`
        }
      })
    }
  })

  unsubNew = onNewIncomingOrder(() => {
    fetchOrders()
  })
})

onUnmounted(() => {
  if (unsubStatus) unsubStatus()
  if (unsubNew) unsubNew()
})

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

async function dismissOrder(order) {
  const targetId = order._id || order.id
  order.isViewedByResident = true
  if (targetId) {
    try {
      await orderApi.updateStatus(targetId, order.status, {
        rejectionReason: order.rejectionReason,
        isViewedByResident: true,
      })
    } catch (e) {
      console.warn('Failed to persist order dismissal:', e)
    }
  }
  emit('action', {
    action: 'toast',
    payload: { message: 'Order moved to Past History.' }
  })
}

async function trackOrder(order) {
  navigateTo('order_status', { order })
}

</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface pb-20 lg:pb-0">
    <!-- Reusable AppSidebar -->
    <AppSidebar
      :role="props.currentRole || 'resident'"
      activeRoute="resident_orders"
      :user="props.user"
      @navigate="navigateTo"
      @logout="navigateTo('welcome')"
    />

    <!-- Main Content Area -->
    <div class="pl-0 lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        :show-back="true"
        back-label="Food Radar"
        back-route="food_radar"
        :show-sync-badge="true"
        sync-label="Live Synced"
        @navigate="navigateTo"
      />

      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background">
        <div class="px-4 sm:px-container-margin pb-stack-lg pt-4 sm:pt-section-gap flex flex-col gap-5 max-w-[850px] mx-auto w-full">
          
          <!-- Title Header & Tabs Switcher -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 class="text-xl sm:text-2xl font-black text-on-surface">My Orders</h1>
              <p class="text-xs sm:text-sm text-on-surface-variant mt-0.5">
                Track your active hot batches and view order history
              </p>
            </div>

            <!-- Tab Buttons -->
            <div class="inline-flex bg-surface-container-high p-1 rounded-xl border border-outline-variant/20 self-start sm:self-auto shadow-xs">
              <button
                type="button"
                @click="activeTab = 'active'"
                :class="[
                  'px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  activeTab === 'active'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                ]"
              >
                <span>Active</span>
                <span
                  v-if="activeOrders.length > 0"
                  :class="[
                    'px-1.5 py-0.2 rounded-full text-[10px] font-black',
                    activeTab === 'active' ? 'bg-white text-primary' : 'bg-primary text-on-primary'
                  ]"
                >
                  {{ activeOrders.length }}
                </span>
              </button>

              <button
                type="button"
                @click="activeTab = 'past'"
                :class="[
                  'px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                  activeTab === 'past'
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                ]"
              >
                <span>Past History</span>
                <span v-if="pastOrders.length > 0" class="text-[10px] opacity-75">
                  ({{ pastOrders.length }})
                </span>
              </button>
            </div>
          </div>

          <!-- Loading Spinner State -->
          <div v-if="isLoading" class="p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/20 flex flex-col items-center justify-center gap-3">
            <div class="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span class="text-xs font-semibold text-on-surface-variant">Fetching your orders...</span>
          </div>

          <!-- ACTIVE ORDERS TAB -->
          <div v-else-if="activeTab === 'active'" class="flex flex-col gap-3.5">
            <div v-if="activeOrders.length > 0" class="flex flex-col gap-3.5">
              <div
                v-for="order in activeOrders"
                :key="order._id || order.id"
                class="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-outline-variant/25 shadow-sm hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div class="flex items-start gap-3.5">
                  <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[24px]">soup_kitchen</span>
                  </div>
                  <div class="flex flex-col">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-sm sm:text-base text-on-surface">
                        {{ order.foodName || order.item || 'Fresh Homemade Meal' }}
                      </span>
                      <span
                        class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border"
                        :class="getStatusBadgeClass(order.status)"
                      >
                        {{ getStatusLabel(order.status) }}
                      </span>
                    </div>

                    <div class="text-xs text-on-surface-variant mt-1 flex items-center gap-2 flex-wrap">
                      <span class="font-medium text-on-surface">
                        {{ formatVendorName(order.vendorName || order.vendor) }}
                      </span>
                      <span>•</span>
                      <span>{{ order.quantity || 1 }} portion(s)</span>
                      <span>•</span>
                      <span class="font-bold text-primary">₹{{ order.totalAmount || 0 }}</span>
                    </div>

                    <!-- Cancelled Notice / Reason -->
                    <div
                      v-if="['cancelled', 'rejected'].includes((order.status || '').toLowerCase())"
                      class="mt-1.5 p-2 bg-red-50 text-red-800 text-xs rounded-xl border border-red-200 flex items-start gap-1.5"
                    >
                      <span class="material-symbols-outlined text-[15px] text-red-600 shrink-0 mt-0.5">info</span>
                      <div class="flex flex-col">
                        <span class="font-bold">Order Cancelled by Cook</span>
                        <span class="text-[11px] text-red-700">{{ order.rejectionReason || 'Kitchen unavailable or out of portions.' }}</span>
                      </div>
                    </div>

                    <span class="text-[11px] text-on-surface-variant/80 mt-1 flex items-center gap-1">
                      <span class="material-symbols-outlined text-[13px]">schedule</span>
                      {{ formatDate(order.createdAt) }} • Order #{{ order.orderNumber || order.id || order._id?.slice(-5) }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    v-if="['cancelled', 'rejected'].includes((order.status || '').toLowerCase())"
                    type="button"
                    @click="dismissOrder(order)"
                    class="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:border-outline-variant"
                  >
                    <span class="material-symbols-outlined text-[16px] text-on-surface-variant">check_circle</span>
                    <span>Dismiss</span>
                  </button>
                  <button
                    v-else
                    type="button"
                    @click="trackOrder(order)"
                    class="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <span class="material-symbols-outlined text-[16px]">location_searching</span>
                    <span>Live Tracker</span>
                  </button>
                </div>
              </div>
            </div>


            <!-- Empty Active Orders -->
            <div
              v-else
              class="p-10 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/20 flex flex-col items-center justify-center gap-2.5"
            >
              <div class="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-1">
                <span class="material-symbols-outlined text-3xl">soup_kitchen</span>
              </div>
              <h3 class="font-bold text-sm sm:text-base text-on-surface">No Active Orders</h3>
              <p class="text-xs text-on-surface-variant max-w-sm">
                You don't have any ongoing kitchen batches. Check what delicious meals neighbors are cooking right now!
              </p>
              <button
                type="button"
                @click="navigateTo('food_radar')"
                class="mt-2 px-5 py-2.5 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <span class="material-symbols-outlined text-[16px]">explore</span>
                <span>Discover Cooking Batches</span>
              </button>
            </div>
          </div>

          <!-- PAST ORDERS TAB -->
          <div v-else class="flex flex-col gap-3.5">
            <div v-if="pastOrders.length > 0" class="flex flex-col gap-3.5">
              <div
                v-for="order in pastOrders"
                :key="order._id || order.id"
                class="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-outline-variant/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div class="flex items-start gap-3.5">
                  <div class="w-12 h-12 rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-[24px]">receipt</span>
                  </div>
                  <div class="flex flex-col">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-sm sm:text-base text-on-surface">
                        {{ order.foodName || order.item || 'Homemade Meal' }}
                      </span>
                      <span
                        class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border"
                        :class="getStatusBadgeClass(order.status)"
                      >
                        {{ getStatusLabel(order.status) }}
                      </span>
                    </div>

                    <div class="text-xs text-on-surface-variant mt-1 flex items-center gap-2 flex-wrap">
                      <span class="font-medium text-on-surface">
                        {{ formatVendorName(order.vendorName || order.vendor) }}
                      </span>
                      <span>•</span>
                      <span>{{ order.quantity || 1 }} portion(s)</span>
                      <span>•</span>
                      <span class="font-bold text-on-surface">₹{{ order.totalAmount || 0 }}</span>
                    </div>

                    <span class="text-[11px] text-on-surface-variant/80 mt-1 flex items-center gap-1">
                      <span class="material-symbols-outlined text-[13px]">calendar_today</span>
                      {{ formatDate(order.createdAt) }} • Order #{{ order.orderNumber || order.id || order._id?.slice(-5) }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    @click="trackOrder(order)"
                    class="px-3.5 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-outline-variant/20"
                  >
                    <span class="material-symbols-outlined text-[15px]">visibility</span>
                    <span>Details</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty Past Orders -->
            <div
              v-else
              class="p-10 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/20 flex flex-col items-center justify-center gap-2.5"
            >
              <div class="w-14 h-14 bg-surface-container-high text-on-surface-variant rounded-full flex items-center justify-center mb-1">
                <span class="material-symbols-outlined text-3xl">history</span>
              </div>
              <h3 class="font-bold text-sm sm:text-base text-on-surface">No Past Orders Found</h3>
              <p class="text-xs text-on-surface-variant max-w-sm">
                Completed orders and past delicious memories will show up here.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>

    <!-- Mobile Bottom Navigation Bar -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 z-40 flex items-center justify-around px-2 shadow-lg">
      <button
        @click="navigateTo('food_radar')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">explore</span>
        <span class="text-[10px] font-semibold mt-0.5">Radar</span>
      </button>
      <button
        @click="navigateTo('resident_orders')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">receipt_long</span>
        <span class="text-[10px] font-bold mt-0.5">Orders</span>
      </button>
      <button
        @click="navigateTo('resident_profile')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">person</span>
        <span class="text-[10px] font-semibold mt-0.5">Profile</span>
      </button>
    </nav>
  </div>
</template>
