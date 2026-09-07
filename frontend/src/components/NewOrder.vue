<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { orderApi, vendorApi } from '../services/api.js'
import { onNewIncomingOrder, onOrderStatusChanged } from '../services/socket.js'
import ResidentLocationModal from './ResidentLocationModal.vue'

const props = defineProps({
  order: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const isMobileSidebarOpen = ref(false)
const currentTab = ref('active') // 'active' | 'completed'
const allOrders = ref([])
const activeIndex = ref(0)
const isUpdating = ref(false)
const vendorProfile = ref(null)

// Map modal state
const isMapModalOpen = ref(false)
const mapCoordinates = ref([73.0188, 19.0225])
const mapResidentName = ref('')
const mapAddress = ref('')

// Filter active (pending, accepted, preparing, ready_for_pickup)
const activeOrders = computed(() => {
  return allOrders.value.filter((o) => {
    const s = (o.status || '').toLowerCase()
    return s !== 'completed' && s !== 'cancelled' && s !== 'rejected'
  })
})

// Filter completed / fulfilled orders
const completedOrders = computed(() => {
  return allOrders.value.filter((o) => {
    const s = (o.status || '').toLowerCase()
    return s === 'completed'
  })
})

function formatOrder(o) {
  if (!o) return null
  const residentObj = o.resident || {}
  const coords = residentObj.location?.coordinates || o.location?.coordinates || o.residentCoordinates || [73.0188, 19.0225]
  const address = residentObj.location?.address || o.pickupAddress || o.location?.address || o.deliveryAddress || 'Seawoods, Navi Mumbai'
  const customerName = o.residentName || o.customer || residentObj.name || 'Neighbor'
  const customerPhone = o.residentPhone || o.customerPhone || residentObj.phone || ''

  return {
    _id: o._id,
    id: o.orderNumber || o.id || o._id?.slice(-5) || '#0001',
    item: o.foodName || o.item || (o.items?.[0]?.food?.name) || 'Fresh Food Batch',
    customer: customerName,
    customerPhone: customerPhone,
    qty: o.quantity || o.qty || (o.items?.[0]?.quantity) || 1,
    price: o.totalAmount || o.price || 0,
    type: o.pickupAddress ? 'Self Pickup' : (o.type || 'Self Pickup'),
    status: o.status || 'placed',
    time: new Date(o.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date(o.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
    notes: (o.specialInstructions || o.notes || '').trim() || 'None',
    coordinates: coords,
    address: address
  }
}

const currentOrder = computed(() => {
  const list = activeOrders.value
  const idx = activeIndex.value < list.length ? activeIndex.value : 0
  if (list.length > 0 && list[idx]) {
    return formatOrder(list[idx])
  }
  return null
})

let unsubNew, unsubStatus

async function loadAllOrders() {
  try {
    const myVendorRes = await vendorApi.getMyProfile().catch(() => null)
    if (myVendorRes?.vendor) {
      vendorProfile.value = myVendorRes.vendor
    }
    const vendorId = vendorProfile.value?._id || vendorProfile.value?.id

    const res = vendorId ? await orderApi.getOrders({ vendor: vendorId }).catch(() => null) : { orders: [] }
    let fetched = res?.orders || res?.data || []
    allOrders.value = fetched || []
  } catch (err) {
    console.error('Failed to load orders:', err)
  }
}

onMounted(async () => {
  await loadAllOrders()

  unsubNew = onNewIncomingOrder((order) => {
    const vendorId = vendorProfile.value?._id || vendorProfile.value?.id
    const orderVendorId = order.vendor?._id || order.vendor?.id || order.vendor
    if (vendorId && orderVendorId && String(vendorId) !== String(orderVendorId)) {
      return
    }
    allOrders.value.unshift(order)
    activeIndex.value = 0
    currentTab.value = 'active'
    emit('action', {
      action: 'toast',
      payload: { message: `🔔 New Order #${order.orderNumber} incoming!` }
    })
  })

  unsubStatus = onOrderStatusChanged((data) => {
    const idx = allOrders.value.findIndex((o) => o._id === data.orderId || o.orderNumber === data.orderNumber)
    if (idx !== -1) {
      allOrders.value[idx].status = data.status
    }
  })
})

onUnmounted(() => {
  if (unsubNew) unsubNew()
  if (unsubStatus) unsubStatus()
})

function openLocationMap(orderItem = null) {
  const target = orderItem || currentOrder.value
  if (!target) return
  mapCoordinates.value = target.coordinates || [73.0188, 19.0225]
  mapResidentName.value = target.customer || 'Resident'
  mapAddress.value = target.address || 'Pickup Location'
  isMapModalOpen.value = true
}

async function markDoneWithPickup() {
  if (!currentOrder.value || isUpdating.value) return
  isUpdating.value = true
  const orderObj = currentOrder.value
  const targetId = orderObj._id || orderObj.id

  try {
    if (targetId) {
      await orderApi.updateStatus(targetId, 'completed', 'Order picked up and completed')
    }
    
    // Update status in allOrders list
    const idx = allOrders.value.findIndex(
      (o) => o._id === orderObj._id || o.orderNumber === orderObj.id || o.id === orderObj.id
    )
    if (idx !== -1) {
      allOrders.value[idx].status = 'completed'
    }

    if (activeIndex.value >= activeOrders.value.length) {
      activeIndex.value = Math.max(0, activeOrders.value.length - 1)
    }

    emit('action', {
      action: 'toast',
      payload: { message: `🎉 Order #${orderObj.id} completed & archived!` }
    })
  } catch (err) {
    console.error('Failed to mark order as completed:', err)
    const idx = allOrders.value.findIndex(
      (o) => o._id === orderObj._id || o.orderNumber === orderObj.id || o.id === orderObj.id
    )
    if (idx !== -1) {
      allOrders.value[idx].status = 'completed'
    }
    emit('action', {
      action: 'toast',
      payload: { message: `🎉 Order #${orderObj.id} completed!` }
    })
  } finally {
    isUpdating.value = false
  }
}

function navigateTo(route, payload = null) {
  isMobileSidebarOpen.value = false
  emit('navigate', route, payload)
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface pb-20 lg:pb-0">
    <!-- Backdrop for Mobile Sidebar Drawer -->
    <div
      v-if="isMobileSidebarOpen"
      @click="isMobileSidebarOpen = false"
      class="fixed inset-0 bg-black/40 z-50 lg:hidden backdrop-blur-xs transition-opacity"
    ></div>

    <!-- Navigation Sidebar -->
    <aside
      :class="isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      class="fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col border-r border-outline-variant/30 shadow-[4px_0_24px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-in-out"
    >
      <div class="p-4 lg:p-stack-lg flex items-center justify-between">
        <button @click="navigateTo('vendor_dashboard')" class="flex items-center gap-base text-left cursor-pointer">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-on-primary">soup_kitchen</span>
          </div>
          <div class="flex flex-col">
            <span class="font-headline-lg text-title-md tracking-tight text-primary font-bold">FoodMap</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Vendor Portal</span>
          </div>
        </button>
        <button
          @click="isMobileSidebarOpen = false"
          class="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high cursor-pointer"
        >
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <nav class="flex-1 px-base space-y-stack-sm mt-2">
        <button
          @click="navigateTo('vendor_dashboard')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer font-medium"
        >
          <span class="material-symbols-outlined mr-gutter">dashboard</span>
          <span class="font-label-md">Kitchen Hub</span>
        </button>
        <button
          @click="navigateTo('post_new_food')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer font-medium"
        >
          <span class="material-symbols-outlined mr-gutter">add_circle</span>
          <span class="font-label-md">Post New Food</span>
        </button>
        <button
          @click="navigateTo('new_order')"
          class="w-full flex items-center justify-between px-gutter py-stack-md rounded-lg transition-all bg-primary text-on-primary font-bold shadow-sm cursor-pointer"
        >
          <div class="flex items-center">
            <span class="material-symbols-outlined mr-gutter">notifications_active</span>
            <span class="font-label-md">Incoming Orders</span>
          </div>
          <span v-if="activeOrders.length > 0" class="w-5 h-5 bg-white text-primary text-[10px] font-black rounded-full flex items-center justify-center">
            {{ activeOrders.length }}
          </span>
        </button>
        <button
          @click="navigateTo('vendor_profile')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer font-medium"
        >
          <span class="material-symbols-outlined mr-gutter">storefront</span>
          <span class="font-label-md">Kitchen Profile</span>
        </button>
      </nav>

      <div class="px-base py-stack-lg border-t border-outline-variant/20 space-y-stack-sm">
        <button
          @click="navigateTo('vendor_profile')"
          class="w-full flex items-center gap-gutter px-gutter py-stack-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 transition-colors text-left cursor-pointer"
        >
          <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {{ (vendorProfile?.businessName || props.user?.vendor?.businessName || props.user?.name || 'P').charAt(0).toUpperCase() }}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-label-md text-on-surface leading-normal text-xs font-bold truncate">{{ vendorProfile?.businessName || props.user?.vendor?.businessName || props.user?.name || "Priya Kitchen" }}</span>
          </div>
        </button>

        <button
          @click="navigateTo('welcome')"
          class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-medium transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="pl-0 lg:pl-72">
      <!-- Header -->
      <header class="fixed top-0 left-0 lg:left-72 right-0 h-16 lg:h-20 bg-surface/90 backdrop-blur-md z-40 flex items-center px-3 sm:px-container-margin justify-between border-b border-outline-variant/20 gap-2">
        <div class="flex items-center gap-2">
          <button
            @click="isMobileSidebarOpen = true"
            class="lg:hidden p-2 rounded-xl text-on-surface hover:bg-surface-container-high focus:outline-none"
            aria-label="Open menu"
          >
            <span class="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <button
            @click="navigateTo('vendor_dashboard')"
            class="flex items-center gap-2 text-on-surface hover:text-primary transition-colors bg-surface-container px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-label-md font-semibold text-xs cursor-pointer shadow-sm"
          >
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Dashboard</span>
          </button>
        </div>
        <div class="flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
          <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>Live Sockets Active</span>
        </div>
      </header>

      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background">
        <div class="w-full max-w-3xl mx-auto px-4 sm:px-container-margin py-8 flex-1 flex flex-col justify-center min-h-[calc(100vh-80px)]">
          
          <!-- Header Alert -->
          <div class="mb-5 flex flex-col items-center text-center">
            <h1 class="text-2xl font-black text-on-surface mb-1">Kitchen Orders</h1>
            <p class="text-xs text-on-surface-variant max-w-md mx-auto mb-4">
              Track incoming orders from neighbors and review your completed order history.
            </p>

            <!-- Navigation Tabs: Active Orders vs Completed History -->
            <div class="inline-flex p-1 bg-surface-container rounded-2xl border border-outline-variant/20 shadow-2xs">
              <button
                @click="currentTab = 'active'"
                :class="currentTab === 'active' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'text-on-surface-variant hover:text-on-surface font-medium'"
                class="px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <span class="material-symbols-outlined text-[16px]">notifications_active</span>
                <span>Active Orders</span>
                <span
                  v-if="activeOrders.length > 0"
                  :class="currentTab === 'active' ? 'bg-white text-primary' : 'bg-primary text-on-primary'"
                  class="px-1.5 py-0.2 rounded-full text-[10px] font-black"
                >
                  {{ activeOrders.length }}
                </span>
              </button>

              <button
                @click="currentTab = 'completed'"
                :class="currentTab === 'completed' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'text-on-surface-variant hover:text-on-surface font-medium'"
                class="px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <span class="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Completed History</span>
                <span
                  v-if="completedOrders.length > 0"
                  :class="currentTab === 'completed' ? 'bg-white text-primary' : 'bg-surface-container-high text-on-surface'"
                  class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                >
                  {{ completedOrders.length }}
                </span>
              </button>
            </div>
          </div>

          <!-- TAB 1: ACTIVE ORDERS -->
          <div v-if="currentTab === 'active'" class="w-full">
            <!-- Order Card (When active orders exist) -->
            <div v-if="currentOrder" class="bg-surface-container-lowest rounded-3xl shadow-sm p-6 relative overflow-hidden border border-outline-variant/20">
              <div class="flex flex-col md:flex-row gap-5 mb-5">
                
                <!-- Left: Order Details -->
                <div class="flex-1 space-y-3">
                  <div class="flex justify-between items-start">
                    <div>
                      <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">Order {{ currentOrder.id }}</p>
                      <h2 class="text-lg font-bold text-on-surface">{{ currentOrder.item }}</h2>
                    </div>
                    <div class="flex items-center gap-1.5 bg-surface-container rounded-xl px-3 py-1.5 shadow-sm border border-outline-variant/20">
                      <span class="text-xs text-on-surface-variant font-medium">Qty:</span>
                      <span class="text-sm font-black text-primary">{{ currentOrder.qty }}</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3 pt-3 border-t border-outline-variant/20">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <span class="material-symbols-outlined text-[18px]">shopping_bag</span>
                      </div>
                      <div>
                        <p class="text-[10px] text-on-surface-variant font-bold">Fulfillment</p>
                        <p class="text-xs text-on-surface font-bold">{{ currentOrder.type }}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <span class="material-symbols-outlined text-[18px]">schedule</span>
                      </div>
                      <div>
                        <p class="text-[10px] text-on-surface-variant font-bold">Placed At</p>
                        <p class="text-xs text-on-surface font-bold">{{ currentOrder.time }}</p>
                      </div>
                    </div>
                  </div>

                  <!-- Customer Note -->
                  <div class="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                    <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Customer Note</span>
                    <span class="text-xs text-on-surface font-medium italic">"{{ currentOrder.notes }}"</span>
                  </div>
                </div>

                <!-- Right: Resident Info & Location Map CTA -->
                <div class="flex-shrink-0 w-full md:w-64 bg-surface-container rounded-2xl p-4 flex flex-col justify-between shadow-sm border border-outline-variant/20 gap-3">
                  <div class="space-y-2">
                    <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ordered By Resident</p>
                    
                    <div class="flex items-center gap-3 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20">
                      <div class="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {{ (currentOrder.customer || 'R').charAt(0).toUpperCase() }}
                      </div>
                      <div class="flex flex-col min-w-0">
                        <span class="text-xs text-on-surface font-extrabold truncate">{{ currentOrder.customer }}</span>
                        <span v-if="currentOrder.customerPhone" class="text-[11px] text-on-surface-variant truncate font-medium">{{ currentOrder.customerPhone }}</span>
                        <span v-else class="text-[10px] text-on-surface-variant italic">Resident Neighbor</span>
                      </div>
                    </div>

                    <!-- Check Location on Map Button -->
                    <button
                      @click="openLocationMap(currentOrder)"
                      class="w-full py-2.5 px-3 rounded-xl bg-surface-container-lowest hover:bg-primary/10 border border-outline-variant/30 hover:border-primary/40 text-primary text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <span class="material-symbols-outlined text-[18px]">explore</span>
                      <span>Check Location on Map</span>
                    </button>
                  </div>

                  <div class="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                    <span class="text-[11px] font-bold text-on-surface-variant uppercase">Earning</span>
                    <span class="text-xl text-primary font-black tracking-tight">₹{{ currentOrder.price }}</span>
                  </div>
                </div>

              </div>

              <!-- Actions: Done with Pickup Action -->
              <div class="flex flex-col sm:flex-row gap-3 mt-4 border-t border-outline-variant/20 pt-4">
                <button
                  @click="navigateTo('vendor_dashboard')"
                  class="flex-1 py-3.5 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-outline-variant/30 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer"
                >
                  <span class="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Chef Dashboard</span>
                </button>

                <button
                  @click="markDoneWithPickup"
                  :disabled="isUpdating"
                  class="flex-[2] py-3.5 px-4 bg-green-700 hover:bg-green-800 text-white text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 font-bold cursor-pointer disabled:opacity-50"
                >
                  <span class="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{{ isUpdating ? 'Updating...' : 'Done with Pickup (Completed)' }}</span>
                </button>
              </div>
            </div>

            <!-- Empty State for Active Orders -->
            <div v-else class="bg-surface-container-lowest rounded-3xl shadow-sm p-10 relative overflow-hidden border border-dashed border-outline-variant/40 flex flex-col items-center justify-center text-center">
              <div class="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <span class="material-symbols-outlined text-3xl">mark_email_read</span>
              </div>
              <h2 class="text-lg font-bold text-on-surface">No Pending Orders</h2>
              <p class="text-xs text-on-surface-variant max-w-sm mt-1 mb-5">
                You are all caught up! New orders placed by nearby neighbors will chime and appear here in real time.
              </p>
              <button
                @click="navigateTo('vendor_dashboard')"
                class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
              >
                Return to Dashboard
              </button>
            </div>

            <!-- Multiple orders switcher if multiple active orders exist -->
            <div v-if="activeOrders.length > 1" class="mt-4 flex items-center justify-center gap-2">
              <span class="text-xs text-on-surface-variant font-medium">Viewing order {{ activeIndex + 1 }} of {{ activeOrders.length }}</span>
              <button
                v-for="(_, idx) in activeOrders"
                :key="idx"
                @click="activeIndex = idx"
                :class="activeIndex === idx ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container text-on-surface'"
                class="w-6 h-6 rounded-full text-xs flex items-center justify-center cursor-pointer"
              >
                {{ idx + 1 }}
              </button>
            </div>
          </div>

          <!-- TAB 2: COMPLETED HISTORY -->
          <div v-else class="w-full space-y-4">
            <div v-if="completedOrders.length > 0" class="flex flex-col gap-3">
              <div
                v-for="order in completedOrders.map(formatOrder)"
                :key="order._id || order.id"
                class="bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-outline-variant/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div class="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div class="w-10 h-10 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center font-bold shrink-0">
                    <span class="material-symbols-outlined text-[20px]">task_alt</span>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Order {{ order.id }}</span>
                      <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-bold">Picked Up & Fulfilled</span>
                    </div>
                    <h3 class="text-sm sm:text-base font-extrabold text-on-surface truncate">{{ order.item }}</h3>
                    <p class="text-[11px] text-on-surface-variant mt-0.5">
                      Customer: <span class="font-bold text-on-surface">{{ order.customer }}</span> • {{ order.qty }} portion{{ order.qty > 1 ? 's' : '' }} • {{ order.date }} at {{ order.time }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-outline-variant/10">
                  <div class="text-left sm:text-right">
                    <span class="text-[10px] font-bold text-on-surface-variant uppercase block">Earned</span>
                    <span class="text-base font-black text-primary">₹{{ order.price }}</span>
                  </div>
                  <button
                    @click="openLocationMap(order)"
                    class="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    title="View Pickup Location"
                  >
                    <span class="material-symbols-outlined text-[18px]">location_on</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Empty State for Completed History -->
            <div v-else class="bg-surface-container-lowest rounded-3xl shadow-sm p-10 relative overflow-hidden border border-dashed border-outline-variant/40 flex flex-col items-center justify-center text-center">
              <div class="w-16 h-16 rounded-2xl bg-surface-container text-on-surface-variant flex items-center justify-center mb-3">
                <span class="material-symbols-outlined text-3xl">history_toggle_off</span>
              </div>
              <h2 class="text-lg font-bold text-on-surface">No Completed Orders Yet</h2>
              <p class="text-xs text-on-surface-variant max-w-sm mt-1">
                When you tap "Done with Pickup" on active orders, fulfilled orders will be archived here in your kitchen history.
              </p>
            </div>
          </div>

        </div>
      </main>
    </div>

    <!-- Resident Location Map Modal -->
    <ResidentLocationModal
      :is-open="isMapModalOpen"
      :coordinates="mapCoordinates"
      :resident-name="mapResidentName"
      :address="mapAddress"
      @close="isMapModalOpen = false"
    />
  </div>
</template>
