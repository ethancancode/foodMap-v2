<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { orderApi, vendorApi } from '../services/api.js'
import { onNewIncomingOrder, onOrderStatusChanged, onLocationUpdated, subscribeToVendor } from '../services/socket.js'
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

// Cancel modal state
const isCancelModalOpen = ref(false)
const cancelTargetOrder = ref(null)
const cancelReason = ref('')
const isCancelling = ref(false)

// Filter active (pending, accepted, preparing, ready_for_pickup, out_for_delivery)
const activeOrders = computed(() => {
  return allOrders.value.filter((o) => {
    const s = (o.status || '').toLowerCase()
    return s !== 'completed' && s !== 'cancelled' && s !== 'rejected' && s !== 'delivered'
  })
})

// Filter completed / fulfilled orders
const completedOrders = computed(() => {
  return allOrders.value.filter((o) => {
    const s = (o.status || '').toLowerCase()
    return s === 'completed' || s === 'delivered'
  })
})

function formatOrder(o) {
  if (!o) return null
  const residentObj = o.resident || {}
  const coords = o.liveCoordinates || o.residentLocation?.coordinates || residentObj.location?.coordinates || o.location?.coordinates || o.residentCoordinates || [73.0188, 19.0225]
  const address = o.liveAddress || o.residentLocation?.address || residentObj.location?.address || o.deliveryAddress || o.location?.address || o.pickupAddress || 'Current Live Location'
  const customerName = o.residentName || o.customer || residentObj.name || 'Neighbor'
  const customerPhone = o.residentPhone || o.customerPhone || residentObj.phone || ''

  const isDelivery = String(o.orderType || o.fulfillment || '').toUpperCase() === 'DELIVERY' || o.deliveryFee > 0

  return {
    _id: o._id,
    id: o.orderNumber || o.id || o._id?.slice(-5) || '#0001',
    item: o.foodName || o.item || (o.items?.[0]?.food?.name) || 'Fresh Food Batch',
    customer: customerName,
    customerPhone: customerPhone,
    qty: o.quantity || o.qty || (o.items?.[0]?.quantity) || 1,
    price: o.totalAmount || o.price || 0,
    type: isDelivery ? 'Direct Delivery' : 'Self Pickup',
    isDelivery,
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

let unsubNew, unsubStatus, unsubLocation

async function loadAllOrders() {
  try {
    const myVendorRes = await vendorApi.getMyProfile().catch(() => null)
    if (myVendorRes?.vendor) {
      vendorProfile.value = myVendorRes.vendor
    }
    const vendorId = vendorProfile.value?._id || vendorProfile.value?.id
    if (vendorId) {
      subscribeToVendor(vendorId)
    }

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

  unsubLocation = onLocationUpdated((data) => {
    if (!data.userId || !data.location) return
    allOrders.value.forEach((order) => {
      const resId = order.resident?._id || order.resident?.id || order.resident
      if (resId && String(resId) === String(data.userId)) {
        order.liveCoordinates = data.location.coordinates
        order.liveAddress = data.location.address
      }
    })
  })
})

onUnmounted(() => {
  if (unsubNew) unsubNew()
  if (unsubStatus) unsubStatus()
  if (unsubLocation) unsubLocation()
})

function openLocationMap(orderItem = null) {
  const target = orderItem || currentOrder.value
  if (!target) return
  mapCoordinates.value = target.coordinates || [73.0188, 19.0225]
  mapResidentName.value = target.customer || 'Resident'
  mapAddress.value = target.address || 'Pickup Location'
  isMapModalOpen.value = true
}

async function handleAcceptOrder(orderObj = null) {
  const target = orderObj || currentOrder.value
  if (!target || isUpdating.value) return
  isUpdating.value = true
  const targetId = target._id || target.id

  try {
    if (targetId) {
      await orderApi.updateStatus(targetId, 'accepted', 'Kitchen accepted order')
    }
    const idx = allOrders.value.findIndex(
      (o) => o._id === target._id || o.orderNumber === target.id || o.id === target.id
    )
    if (idx !== -1) {
      allOrders.value[idx].status = 'ACCEPTED'
    }
    emit('action', {
      action: 'toast',
      payload: { message: `👨‍🍳 Order #${target.id} accepted!` }
    })
  } catch (err) {
    console.error('Failed to accept order:', err)
  } finally {
    isUpdating.value = false
  }
}

function promptCancelOrder(orderObj = null) {
  cancelTargetOrder.value = orderObj || currentOrder.value
  cancelReason.value = ''
  isCancelModalOpen.value = true
}

async function submitCancelOrder() {
  if (!cancelTargetOrder.value || isCancelling.value) return
  isCancelling.value = true
  const target = cancelTargetOrder.value
  const targetId = target._id || target.id
  const reasonText = cancelReason.value.trim() || 'Kitchen unavailable or out of ingredients'

  try {
    if (targetId) {
      await orderApi.updateStatus(targetId, 'cancelled', reasonText)
    }
    const idx = allOrders.value.findIndex(
      (o) => o._id === target._id || o.orderNumber === target.id || o.id === target.id
    )
    if (idx !== -1) {
      allOrders.value[idx].status = 'CANCELLED'
    }
    isCancelModalOpen.value = false
    emit('action', {
      action: 'toast',
      payload: { message: `❌ Order #${target.id} cancelled.` }
    })
  } catch (err) {
    console.error('Failed to cancel order:', err)
  } finally {
    isCancelling.value = false
  }
}

async function markDoneWithPickup() {
  if (!currentOrder.value || isUpdating.value) return
  isUpdating.value = true
  const orderObj = currentOrder.value
  const targetId = orderObj._id || orderObj.id
  const isDeliveryOrder = Boolean(orderObj.isDelivery || orderObj.type === 'Direct Delivery')
  const newStatus = isDeliveryOrder ? 'out_for_delivery' : 'completed'
  const statusNote = isDeliveryOrder ? 'Order dispatched out for delivery' : 'Order picked up and completed'

  try {
    if (targetId) {
      await orderApi.updateStatus(targetId, newStatus, statusNote)
    }
    
    // Update status in allOrders list
    const idx = allOrders.value.findIndex(
      (o) => o._id === orderObj._id || o.orderNumber === orderObj.id || o.id === orderObj.id
    )
    if (idx !== -1) {
      allOrders.value[idx].status = newStatus
    }

    if (!isDeliveryOrder) {
      if (activeIndex.value >= activeOrders.value.length) {
        activeIndex.value = Math.max(0, activeOrders.value.length - 1)
      }
      emit('action', {
        action: 'toast',
        payload: { message: `🎉 Order #${orderObj.id} completed & archived!` }
      })
    } else {
      emit('action', {
        action: 'toast',
        payload: { message: `🚴 Order #${orderObj.id} sent out for delivery!` }
      })
    }
  } catch (err) {
    console.error('Failed to update order status:', err)
    const idx = allOrders.value.findIndex(
      (o) => o._id === orderObj._id || o.orderNumber === orderObj.id || o.id === orderObj.id
    )
    if (idx !== -1) {
      allOrders.value[idx].status = newStatus
    }
    emit('action', {
      action: 'toast',
      payload: { message: isDeliveryOrder ? `🚴 Order #${orderObj.id} out for delivery!` : `🎉 Order #${orderObj.id} completed!` }
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
              @accept="handleAcceptOrder"
              @cancel="promptCancelOrder"
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

    <!-- Cancellation Reason Modal -->
    <div
      v-if="isCancelModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <div class="bg-surface-container-lowest rounded-3xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/30 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-red-600 font-bold">
            <span class="material-symbols-outlined text-2xl">cancel</span>
            <span class="text-base text-on-surface font-extrabold">Cancel Order {{ cancelTargetOrder?.id }}</span>
          </div>
          <button
            type="button"
            @click="isCancelModalOpen = false"
            class="p-1 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p class="text-xs text-on-surface-variant">
          Provide a reason for the cancellation to inform the resident (optional). The order will be cancelled and portion quantities will be restored automatically.
        </p>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-on-surface">Cancellation Reason (Optional)</label>
          <textarea
            v-model="cancelReason"
            rows="3"
            placeholder="e.g., Run out of fresh ingredients, kitchen closed unexpectedly..."
            class="w-full bg-surface-container px-3.5 py-2.5 rounded-xl border border-outline-variant/30 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-red-500 outline-none resize-none"
          ></textarea>
        </div>

        <div class="flex gap-2.5 pt-2">
          <button
            type="button"
            @click="isCancelModalOpen = false"
            class="flex-1 py-2.5 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Keep Order
          </button>
          <button
            type="button"
            :disabled="isCancelling"
            @click="submitCancelOrder"
            class="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {{ isCancelling ? 'Cancelling...' : 'Confirm Cancel' }}
          </button>
        </div>
      </div>
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
