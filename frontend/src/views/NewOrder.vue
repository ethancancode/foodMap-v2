<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { orderApi, vendorApi } from '../services/api.js'
import { onNewIncomingOrder, onOrderStatusChanged } from '../services/socket.js'
import ResidentLocationModal from '../components/ResidentLocationModal.vue'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'
import VendorOrderCard from '../components/VendorOrderCard.vue'
import VendorCompletedOrderCard from '../components/VendorCompletedOrderCard.vue'

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

    <!-- Unified Vendor Sidebar -->
    <AppSidebar
      :is-open="isMobileSidebarOpen"
      role="vendor"
      active-route="new_order"
      :user="props.user"
      :vendor-profile="vendorProfile"
      :pending-orders-count="activeOrders.length"
      @close="isMobileSidebarOpen = false"
      @navigate="navigateTo"
      @logout="navigateTo('welcome')"
    />

    <!-- Main Content Area -->
    <div class="pl-0 lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        :show-back="true"
        back-label="Back to Dashboard"
        back-route="vendor_dashboard"
        :show-sync-badge="true"
        sync-label="Live Sockets Active"
        @toggle-sidebar="isMobileSidebarOpen = true"
        @navigate="navigateTo"
      />

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
            <!-- Order Card Component (When active orders exist) -->
            <VendorOrderCard
              v-if="currentOrder"
              :order="currentOrder"
              :is-updating="isUpdating"
              @complete="markDoneWithPickup"
              @open-map="openLocationMap"
              @back-to-dashboard="navigateTo('vendor_dashboard')"
            />

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
              <VendorCompletedOrderCard
                v-for="order in completedOrders.map(formatOrder)"
                :key="order._id || order.id"
                :order="order"
                @open-map="openLocationMap"
              />
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
