<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { orderApi } from '../services/api.js'
import { getSocket, emitCourierLocation, onOrderStatusChanged, subscribeToCourier } from '../services/socket.js'

const props = defineProps({
  user: Object,
  currentRole: String,
})

const emit = defineEmits(['navigate', 'action'])

const activeTab = ref('active') // 'active' | 'available' | 'history'
const availableOrders = ref([])
const myDeliveries = ref([])
const isLoading = ref(true)
const isLiveTrackingActive = ref(false)
let locationWatchId = null
let locationInterval = null

const activeDelivery = computed(() => {
  return myDeliveries.value.find(
    (o) => ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.deliveryStatus) ||
           ['READY_FOR_PICKUP', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.status)
  )
})

const completedDeliveries = computed(() => {
  return myDeliveries.value.filter(
    (o) => o.deliveryStatus === 'DELIVERED' || ['DELIVERED', 'COMPLETED'].includes(o.status)
  )
})

async function fetchAvailableDeliveries() {
  try {
    const res = await orderApi.getAvailableDeliveries()
    availableOrders.value = res?.orders || res?.data || []
  } catch (err) {
    console.warn('[Courier] Failed to load available deliveries:', err.message)
  }
}

async function fetchMyDeliveries() {
  try {
    const res = await orderApi.getMyDeliveries()
    myDeliveries.value = res?.orders || res?.data || []
  } catch (err) {
    console.warn('[Courier] Failed to load courier deliveries:', err.message)
  }
}

async function loadData() {
  isLoading.value = true
  await Promise.all([fetchAvailableDeliveries(), fetchMyDeliveries()])
  isLoading.value = false
}

async function handleAcceptOrder(order) {
  try {
    await orderApi.acceptDelivery(order._id)
    emit('action', { action: 'toast', payload: { message: `Accepted delivery for Order ${order.orderNumber}` } })
    await loadData()
    activeTab.value = 'active'
    startLiveTracking()
  } catch (err) {
    emit('action', { action: 'toast', payload: { message: err.message || 'Could not accept delivery' } })
  }
}

async function handleUpdateStatus(order, newStatus) {
  try {
    await orderApi.updateDeliveryStatus(order._id, newStatus)
    emit('action', { action: 'toast', payload: { message: `Delivery updated: ${newStatus.replace(/_/g, ' ')}` } })
    await loadData()
    if (newStatus === 'DELIVERED') {
      stopLiveTracking()
    }
  } catch (err) {
    emit('action', { action: 'toast', payload: { message: err.message || 'Failed to update status' } })
  }
}

// Live GPS streaming with throttled updates
function startLiveTracking() {
  if (isLiveTrackingActive.value) return
  isLiveTrackingActive.value = true

  // Send initial or fallback coordinates
  sendLocationUpdate(73.0195, 19.0235, 'Courier Moving - En Route')

  if ('geolocation' in navigator) {
    locationWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        sendLocationUpdate(lng, lat, 'Live GPS Position')
      },
      (err) => {
        console.warn('[Courier GPS Warning]', err.message)
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
  }
}

function stopLiveTracking() {
  isLiveTrackingActive.value = false
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId)
    locationWatchId = null
  }
  if (locationInterval) {
    clearInterval(locationInterval)
    locationInterval = null
  }
}

// Simulated GPS step for seamless presentation demonstration (Demo 9 & 10)
function simulateGpsMovement() {
  if (!activeDelivery.value) return
  // Progress towards resident location
  const currentCoords = activeDelivery.value.deliveryPartnerLocation?.coordinates || [73.0180, 19.0220]
  // Shift slightly towards resident coordinates
  const newLng = currentCoords[0] + (Math.random() - 0.45) * 0.0005
  const newLat = currentCoords[1] + (Math.random() - 0.45) * 0.0005

  sendLocationUpdate(newLng, newLat, 'Live Courier Movement (Simulated GPS)')
  emit('action', { action: 'toast', payload: { message: 'GPS ping sent: Courier location updated!' } })
}

function sendLocationUpdate(lng, lat, address = 'Courier Live Location') {
  if (!activeDelivery.value) return
  const orderId = activeDelivery.value._id
  const residentId = activeDelivery.value.resident?._id || activeDelivery.value.resident

  // 1. Emit throttled real-time Socket event
  emitCourierLocation({
    orderId,
    residentId,
    coordinates: [lng, lat],
    address,
  })

  // 2. Persist to database
  orderApi.updateDeliveryLocation(orderId, [lng, lat], address).catch(() => {})
}

onMounted(() => {
  loadData()
  if (props.user?._id) {
    subscribeToCourier(props.user._id)
  }
  onOrderStatusChanged(() => {
    fetchAvailableDeliveries()
    fetchMyDeliveries()
  })
})

onUnmounted(() => {
  stopLiveTracking()
})
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col text-on-surface">
    <!-- Header -->
    <header class="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 px-4 lg:px-8 py-3.5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
          <span class="material-symbols-outlined text-24">moped</span>
        </div>
        <div>
          <h1 class="text-base lg:text-lg font-bold tracking-tight">Delivery Partner Hub</h1>
          <p class="text-xs text-on-surface-variant font-medium">Hyperlocal Neighborhood Courier Console</p>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          @click="emit('navigate', 'food_radar')"
          class="px-3.5 py-1.5 rounded-xl border border-outline-variant/40 bg-surface hover:bg-surface-container text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">radar</span>
          <span>View Map</span>
        </button>
        <button
          @click="emit('action', 'logout')"
          class="px-3 py-1.5 rounded-xl bg-error/10 hover:bg-error/20 text-error text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 max-w-5xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
      <!-- Tabs -->
      <div class="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
        <button
          @click="activeTab = 'active'"
          :class="[
            'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer',
            activeTab === 'active'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface hover:bg-surface-container text-on-surface-variant'
          ]"
        >
          <span class="material-symbols-outlined text-[18px]">navigation</span>
          <span>Active Delivery</span>
          <span v-if="activeDelivery" class="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
        </button>

        <button
          @click="activeTab = 'available'"
          :class="[
            'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer',
            activeTab === 'available'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface hover:bg-surface-container text-on-surface-variant'
          ]"
        >
          <span class="material-symbols-outlined text-[18px]">notifications_active</span>
          <span>Available Deliveries</span>
          <span v-if="availableOrders.length > 0" class="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-black">
            {{ availableOrders.length }}
          </span>
        </button>

        <button
          @click="activeTab = 'history'"
          :class="[
            'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer',
            activeTab === 'history'
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface hover:bg-surface-container text-on-surface-variant'
          ]"
        >
          <span class="material-symbols-outlined text-[18px]">history</span>
          <span>Completed History</span>
          <span class="text-[10px] text-on-surface-variant">({{ completedDeliveries.length }})</span>
        </button>
      </div>

      <!-- Tab 1: Active Delivery -->
      <section v-if="activeTab === 'active'" class="space-y-4 animate-in">
        <div v-if="activeDelivery" class="p-6 rounded-3xl bg-surface border border-outline-variant/30 shadow-md space-y-6">
          <div class="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                  {{ activeDelivery.status }}
                </span>
                <span class="font-mono text-sm font-extrabold text-on-surface">{{ activeDelivery.orderNumber }}</span>
              </div>
              <h2 class="text-lg font-bold text-on-surface mt-1.5">{{ activeDelivery.foodName || 'Food Delivery' }}</h2>
              <p class="text-xs text-on-surface-variant">
                Total Amount: <span class="font-bold text-on-surface">₹{{ activeDelivery.totalAmount }}</span> (Fee: ₹{{ activeDelivery.deliveryFee || 30 }})
              </p>
            </div>

            <!-- Live GPS Broadcast Pill -->
            <div class="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-xl border border-outline-variant/30">
              <span class="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              <span class="text-xs font-bold text-primary">GPS Live Broadcast Active</span>
            </div>
          </div>

          <!-- Pickup & Drop Locations -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Pickup Point -->
            <div class="p-4 rounded-2xl bg-surface-container/60 border border-outline-variant/20 space-y-2">
              <div class="flex items-center gap-2 text-xs font-bold text-on-surface">
                <span class="material-symbols-outlined text-[18px] text-primary">storefront</span>
                <span>STEP 1: PICKUP KITCHEN</span>
              </div>
              <div class="text-sm font-extrabold text-on-surface">{{ activeDelivery.vendorName || activeDelivery.vendor?.businessName }}</div>
              <div class="text-xs text-on-surface-variant font-medium">
                {{ activeDelivery.pickupAddress || activeDelivery.vendor?.pickupAddress || 'Seawoods West, Navi Mumbai' }}
              </div>
            </div>

            <!-- Drop Point -->
            <div class="p-4 rounded-2xl bg-surface-container/60 border border-outline-variant/20 space-y-2">
              <div class="flex items-center gap-2 text-xs font-bold text-on-surface">
                <span class="material-symbols-outlined text-[18px] text-primary">home_pin</span>
                <span>STEP 2: RESIDENT DROP</span>
              </div>
              <div class="text-sm font-extrabold text-on-surface">{{ activeDelivery.residentName || activeDelivery.resident?.name }}</div>
              <div class="text-xs text-on-surface-variant font-medium">
                {{ activeDelivery.residentLocation?.address || 'Resident Delivery Address' }}
              </div>
              <div class="text-[11px] text-primary font-bold">
                Phone: {{ activeDelivery.residentPhone || activeDelivery.resident?.phone || 'Confidential' }}
              </div>
            </div>
          </div>

          <!-- Courier Action Workflow Buttons -->
          <div class="pt-4 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <button
                @click="simulateGpsMovement"
                class="px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-xs font-bold text-on-surface flex items-center gap-1.5 transition-all cursor-pointer"
                title="Send a live GPS location ping to update resident's map"
              >
                <span class="material-symbols-outlined text-[16px] text-primary">satellite_alt</span>
                <span>Simulate GPS Move (Ping Map)</span>
              </button>
            </div>

            <div class="flex items-center gap-2.5">
              <button
                v-if="['ASSIGNED', 'READY_FOR_PICKUP'].includes(activeDelivery.status) || activeDelivery.deliveryStatus === 'ASSIGNED'"
                @click="handleUpdateStatus(activeDelivery, 'PICKED_UP')"
                class="px-4 py-2.5 rounded-xl bg-surface-container-highest hover:bg-surface-container text-on-surface text-xs font-extrabold flex items-center gap-1.5 border border-outline-variant/40 shadow-sm transition-colors cursor-pointer"
              >
                <span class="material-symbols-outlined text-[18px] text-primary">inventory</span>
                <span>Pick Up from Kitchen</span>
              </button>

              <button
                v-if="activeDelivery.status === 'PICKED_UP' || activeDelivery.deliveryStatus === 'PICKED_UP'"
                @click="handleUpdateStatus(activeDelivery, 'OUT_FOR_DELIVERY')"
                class="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <span class="material-symbols-outlined text-[18px]">local_shipping</span>
                <span>Start Delivery (Out For Delivery)</span>
              </button>

              <button
                v-if="['OUT_FOR_DELIVERY', 'PICKED_UP'].includes(activeDelivery.status)"
                @click="handleUpdateStatus(activeDelivery, 'DELIVERED')"
                class="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <span class="material-symbols-outlined text-[18px]">task_alt</span>
                <span>Mark as Delivered</span>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="p-12 rounded-3xl bg-surface border border-outline-variant/30 text-center space-y-3">
          <div class="w-14 h-14 rounded-full bg-surface-container mx-auto flex items-center justify-center text-on-surface-variant">
            <span class="material-symbols-outlined text-32">check_circle</span>
          </div>
          <h3 class="text-base font-bold text-on-surface">No Active Delivery in Progress</h3>
          <p class="text-xs text-on-surface-variant max-w-sm mx-auto">
            You are currently available to take on neighborhood cooked meal or marketplace package deliveries.
          </p>
          <button
            @click="activeTab = 'available'"
            class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Check Available Orders
          </button>
        </div>
      </section>

      <!-- Tab 2: Available Deliveries -->
      <section v-if="activeTab === 'available'" class="space-y-4 animate-in">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-sm font-bold">Unassigned Delivery Requests</h2>
            <p class="text-xs text-on-surface-variant">Home chef orders ready for courier pickup</p>
          </div>
          <button
            @click="fetchAvailableDeliveries"
            class="p-2 rounded-xl bg-surface border border-outline-variant/40 hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">refresh</span>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="order in availableOrders"
            :key="order._id"
            class="p-5 rounded-2xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div>
              <div class="flex items-center justify-between">
                <span class="font-mono text-xs font-bold text-primary">{{ order.orderNumber }}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface">
                  {{ order.status }}
                </span>
              </div>
              <h3 class="text-sm font-bold text-on-surface mt-2">{{ order.foodName || 'Cooked Meal' }}</h3>
              <p class="text-xs text-on-surface-variant font-medium">From: {{ order.vendor?.businessName || order.vendorName }}</p>

              <div class="mt-3 p-2.5 rounded-xl bg-surface-container/60 space-y-1 text-xs">
                <div class="flex items-center gap-1.5 text-on-surface-variant">
                  <span class="material-symbols-outlined text-[14px] text-primary">storefront</span>
                  <span class="truncate">{{ order.pickupAddress || 'Kitchen Pickup' }}</span>
                </div>
                <div class="flex items-center gap-1.5 text-on-surface-variant">
                  <span class="material-symbols-outlined text-[14px] text-primary">home</span>
                  <span class="truncate">{{ order.residentLocation?.address || 'Resident Address' }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-outline-variant/20">
              <div class="text-xs">
                <span class="text-on-surface-variant">Delivery Fee: </span>
                <span class="font-extrabold text-on-surface">₹{{ order.deliveryFee || 30 }}</span>
              </div>

              <button
                @click="handleAcceptOrder(order)"
                class="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Accept Assignment
              </button>
            </div>
          </div>

          <div v-if="availableOrders.length === 0" class="col-span-full p-8 text-center text-on-surface-variant text-xs">
            No unassigned delivery orders at this moment. You will receive real-time notifications as new orders become ready.
          </div>
        </div>
      </section>

      <!-- Tab 3: History -->
      <section v-if="activeTab === 'history'" class="space-y-4 animate-in">
        <h2 class="text-sm font-bold">Your Completed Deliveries</h2>
        <div class="bg-surface rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
          <div class="divide-y divide-outline-variant/10 text-xs">
            <div
              v-for="order in completedDeliveries"
              :key="order._id"
              class="p-4 flex items-center justify-between gap-3 hover:bg-surface-container/40 transition-colors"
            >
              <div>
                <div class="font-bold text-on-surface">{{ order.orderNumber }} • {{ order.foodName || 'Meal Order' }}</div>
                <div class="text-[11px] text-on-surface-variant">
                  Kitchen: {{ order.vendorName || order.vendor?.businessName }} → Resident: {{ order.residentName || order.resident?.name }}
                </div>
              </div>

              <div class="text-right">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">DELIVERED</span>
                <div class="text-[11px] font-bold text-green-700 mt-1">+₹{{ order.deliveryFee || 30 }}</div>
              </div>
            </div>

            <div v-if="completedDeliveries.length === 0" class="p-6 text-center text-on-surface-variant text-xs">
              No completed deliveries yet.
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
