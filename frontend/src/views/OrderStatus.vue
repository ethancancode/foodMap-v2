<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { orderApi } from '../services/api.js'
import { onOrderStatusChanged } from '../services/socket.js'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

import { getCookingCountdown, currentTimestamp } from '../utils/countdown.js'

const props = defineProps({
  order: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])
const route = useRoute()


// 'placed' (0), 'accepted' (1), 'preparing' (2), 'ready_for_pickup' / 'out_for_delivery' (3), 'completed' / 'delivered' (4)
const statusMap = {
  pending: 0,
  placed: 0,
  accepted: 1,
  preparing: 2,
  ready_for_pickup: 3,
  out_for_delivery: 3,
  ready: 3,
  delivered: 4,
  completed: 4,
  picked_up: 4,
  cancelled: -1
}

const liveOrder = ref(props.order || {})
const currentStatus = ref(props.order?.status || 'pending')
const isConfirmingReceived = ref(false)
const mapContainer = ref(null)
let mapInstance = null

const isDeliveryOrder = computed(() => {
  const o = liveOrder.value || props.order || {}
  const type = String(o.orderType || o.fulfillment || '').toUpperCase()
  return type === 'DELIVERY' || Number(o.deliveryFee) > 0
})

const kitchenCoords = computed(() => {
  const o = liveOrder.value || props.order || {}
  const c = o.vendor?.location?.coordinates ||
            o.location?.coordinates ||
            o.vendorLocation?.coordinates ||
            (props.user?.location?.coordinates) ||
            [73.0188, 19.0225]
  return {
    lng: Number(c[0]) || 73.0188,
    lat: Number(c[1]) || 19.0225
  }
})

function initStatusMap() {
  if (!mapContainer.value) return
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }

  const { lat, lng } = kitchenCoords.value

  mapInstance = L.map(mapContainer.value, {
    center: [lat, lng],
    zoom: 15,
    zoomControl: false,
    attributionControl: false
  })

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19
  }).addTo(mapInstance)

  const pinIcon = L.divIcon({
    className: 'custom-kitchen-pin',
    html: `
      <div style="background:#b91c1c;color:#fff;width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(185,28,28,0.4);border:2px solid #fff;">
        <span style="font-family:'Material Symbols Outlined';font-size:18px;">soup_kitchen</span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34]
  })

  L.marker([lat, lng], { icon: pinIcon })
    .addTo(mapInstance)
    .bindPopup(`<b>${orderInfo.value.vendor}</b><br/>${orderInfo.value.pickupAddress}`)

  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize()
  }, 200)
}

const orderCountdown = computed(() => {
  void currentTimestamp.value
  const item = {
    readyAt: liveOrder.value?.readyAt || props.order?.readyAt || null,
    cookingStatus: liveOrder.value?.cookingStatus || props.order?.cookingStatus || null,
    timeReady: liveOrder.value?.timeReady || props.order?.timeReady || null,
    time: liveOrder.value?.time || props.order?.time || null,
    createdAt: liveOrder.value?.createdAt || props.order?.createdAt || null,
    updatedAt: liveOrder.value?.updatedAt || props.order?.updatedAt || null
  }
  return getCookingCountdown(item)
})

// Check if a specific cooking time was set by the vendor (and not ready now)
const hasCookingTime = computed(() => {
  const cd = orderCountdown.value
  if (!cd) return false
  const statusStr = String(liveOrder.value?.cookingStatus || props.order?.cookingStatus || liveOrder.value?.time || '').toLowerCase()
  if (statusStr.includes('ready now') || statusStr === 'now') return false
  return !cd.isReady && cd.secondsLeft > 0
})

const stepIndex = computed(() => {
  const s = currentStatus.value?.toLowerCase() || 'pending'
  const rawIdx = statusMap[s] !== undefined ? statusMap[s] : 0
  if (s === 'out_for_delivery') return 3
  if (s === 'ready_for_pickup') return 3
  // If no cooking preparation time is needed, an accepted/preparing order is immediately ready for pickup (unless out for delivery)
  if (!hasCookingTime.value && (rawIdx === 1 || rawIdx === 2)) {
    return isDeliveryOrder.value ? 1 : 3
  }
  return rawIdx
})

const effectiveStatusLabel = computed(() => {
  const s = String(currentStatus.value || '').toUpperCase()
  if (s === 'OUT_FOR_DELIVERY') {
    return 'SENT OUT FOR DELIVERY'
  }
  if (stepIndex.value === 3 && (s === 'ACCEPTED' || s === 'PREPARING' || s === 'PLACED')) {
    return isDeliveryOrder.value ? 'OUT FOR DELIVERY' : 'READY FOR PICKUP'
  }
  return currentStatus.value?.replace(/_/g, ' ') || 'ACCEPTED'
})

function formatVendorName(val) {
  if (!val) return 'Home Kitchen'
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed)
        return parsed.businessName || parsed.name || 'Home Kitchen'
      } catch (e) {
        // Not valid JSON
      }
    }
    return trimmed || 'Home Kitchen'
  }
  if (typeof val === 'object') {
    return val.businessName || val.name || 'Home Kitchen'
  }
  return 'Home Kitchen'
}


const orderInfo = computed(() => {
  const o = liveOrder.value || props.order || {}
  return {
    id: o.orderNumber || o.id || '#FM1024',
    _id: o._id || o.id,
    item: o.foodName || o.item || o.itemSummary || 'Fresh Homemade Meal',
    vendor: formatVendorName(o.vendorName || o.vendor),
    vendorObj: o.vendor || o.vendorName,
    vendorId: o.vendor?._id || o.vendor?.id || (typeof o.vendor === 'string' ? o.vendor : null),
    qty: o.quantity || o.qty || 1,
    price: o.totalAmount || o.total || o.price || 0,
    status: currentStatus.value || o.status || 'ACCEPTED',
    time: o.time || 'Today, Fresh Batch',
    pickupAddress: o.pickupAddress || o.address || o.vendor?.pickupAddress || o.vendor?.location?.pickupAddress || 'Seawoods, Navi Mumbai'
  }
})

let unsubOrderStatus

onMounted(async () => {
  const paramId = route.params?.id || route.query?.id
  const targetId = paramId || props.order?._id || props.order?.id || props.order?.orderNumber
  if (targetId) {
    try {
      const res = await orderApi.getOrderById(targetId)
      if (res?.order) {
        liveOrder.value = res.order
        currentStatus.value = res.order.status
        if (['CANCELLED', 'REJECTED'].includes(res.order.status?.toUpperCase()) && !res.order.isViewedByResident) {
          await orderApi.updateStatus(targetId, res.order.status, res.order.rejectionReason, { isViewedByResident: true }).catch(() => {})
        }
      }
    } catch (e) {
      console.log('Order fetch error:', e)
    }
  } else {

    // If no order specifically provided, fetch user's most recent active/placed order
    try {
      const res = await orderApi.getOrders()
      const orders = res?.orders || res?.data || []
      if (orders.length > 0) {
        const active = orders.find(o => !['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(o.status?.toUpperCase()))
        const chosen = active || orders[0]
        liveOrder.value = chosen
        currentStatus.value = chosen.status
      }
    } catch (e) {
      console.warn('Failed to load recent order in tracker:', e)
    }
  }

  nextTick(() => {
    setTimeout(() => {
      initStatusMap()
    }, 150)
  })

  // Socket listener: updates whenever vendor advances order
  unsubOrderStatus = onOrderStatusChanged((data) => {
    const currentId = liveOrder.value?._id || liveOrder.value?.id
    if (data.orderId === currentId || data.orderNumber === liveOrder.value?.orderNumber) {
      currentStatus.value = data.status
      if (data.order) liveOrder.value = data.order
      
      const normalizedStatus = String(data.status || '').toUpperCase()

      emit('action', {
        action: 'toast',
        payload: { message: `Order #${orderInfo.value.id} updated to: ${data.status.replace(/_/g, ' ').toUpperCase()}` }
      })

      // When chef completes pickup (or order is completed/delivered), auto-transition user to order_completed
      if (['COMPLETED', 'DELIVERED', 'PICKED_UP'].includes(normalizedStatus)) {
        setTimeout(() => {
          emit('navigate', 'order_completed', {
            order: {
              ...liveOrder.value,
              ...orderInfo.value,
              vendor: liveOrder.value?.vendor || orderInfo.value.vendorId || orderInfo.value.vendor
            }
          })
        }, 600)
      }
    }
  })
})


onUnmounted(() => {
  if (unsubOrderStatus) unsubOrderStatus()
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

async function confirmOrderReceived() {
  if (isConfirmingReceived.value) return
  isConfirmingReceived.value = true

  try {
    const targetId = liveOrder.value?._id || liveOrder.value?.id || props.order?._id || props.order?.id
    if (targetId) {
      const res = await orderApi.updateStatus(targetId, 'completed', 'Customer confirmed order received')
      if (res?.order) {
        currentStatus.value = res.order.status
        liveOrder.value = res.order
      }
    }
    emit('action', {
      action: 'toast',
      payload: { message: '🎉 Order marked as received!' }
    })
    setTimeout(() => {
      emit('navigate', 'order_completed', {
        order: {
          ...liveOrder.value,
          ...orderInfo.value,
          vendor: liveOrder.value?.vendor || orderInfo.value.vendorId || orderInfo.value.vendor
        }
      })
    }, 400)
  } catch (err) {
    console.error('Failed to confirm order received:', err)
    emit('navigate', 'order_completed', {
      order: {
        ...liveOrder.value,
        ...orderInfo.value,
        vendor: liveOrder.value?.vendor || orderInfo.value.vendorId || orderInfo.value.vendor
      }
    })
  } finally {
    isConfirmingReceived.value = false
  }
}

async function advanceOrder() {
  const steps = ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'completed']
  const nextIdx = Math.min(steps.length - 1, stepIndex.value + 1)
  const nextStatus = steps[nextIdx]

  try {
    const targetId = liveOrder.value?._id || liveOrder.value?.id || 'FM-1024'
    const res = await orderApi.updateStatus(targetId, nextStatus, 'Progressed by user action')
    if (res?.order) {
      currentStatus.value = res.order.status
      liveOrder.value = res.order
    }
    if (nextStatus === 'completed') {
      setTimeout(() => {
        emit('navigate', 'order_completed', {
          order: {
            ...liveOrder.value,
            ...orderInfo.value,
            vendor: liveOrder.value?.vendor || orderInfo.value.vendorId || orderInfo.value.vendor
          }
        })
      }, 600)
    }
  } catch (err) {
    console.error('Failed to advance order status:', err)
    currentStatus.value = nextStatus
  }
}

async function copyVendorPhone() {
  const o = liveOrder.value || props.order || {}
  const phone = o.vendor?.user?.phone || o.vendorPhone || o.vendor?.phone || o.user?.phone || '+91 98201 45892'
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(phone)
    }
  } catch (e) {}
  emit('action', {
    action: 'toast',
    payload: { message: `Chef's contact (${phone}) copied to clipboard!` }
  })
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface pb-20 lg:pb-0">
    <!-- Reusable AppSidebar -->
    <AppSidebar
      :role="props.currentRole || 'resident'"
      activeRoute="order_status"
      :user="props.user"
      @navigate="navigateTo"
      @logout="navigateTo('welcome')"
    />

    <!-- Main Content Area -->
    <div class="pl-0 lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        :show-back="true"
        back-label="My Orders"
        back-route="resident_orders"
        :show-sync-badge="true"
        sync-label="Live Tracking"
        @navigate="navigateTo"
      />

      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background">
        <div class="px-4 sm:px-container-margin pb-stack-lg pt-4 sm:pt-section-gap flex flex-col gap-4 sm:gap-5 max-w-[800px] mx-auto w-full">
          <!-- Title & Tag -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex flex-col gap-0.5">
              <span class="text-xl sm:text-2xl font-black text-on-surface">Live Order Tracker</span>
              <span class="text-xs text-on-surface-variant flex items-center gap-2 font-medium">
                Order {{ orderInfo.id }}
                <span class="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
                {{ orderInfo.time }}
              </span>
            </div>
            <div class="px-3 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1.5 border border-primary/20 self-start sm:self-auto">
              <span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              <span class="text-xs font-bold uppercase tracking-wider">
                {{ effectiveStatusLabel }}
              </span>
            </div>
          </div>

          <!-- Status Timeline Container -->
          <div class="bg-surface-container-lowest rounded-3xl p-4 sm:p-6 relative overflow-hidden flex flex-col gap-5 sm:gap-6 shadow-sm border border-outline-variant/20">
            <div class="flex flex-col relative z-10">
              <div class="flex flex-col gap-5 sm:gap-6 relative">
                <div class="absolute left-4 top-4 bottom-4 w-0.5 bg-outline-variant/30 z-0"></div>
                
                <!-- Step 0: Order Placed -->
                <div class="flex gap-3.5 sm:gap-4 items-center relative z-10">
                  <div
                    :class="stepIndex >= 0 ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'"
                    class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md transition-colors"
                  >
                    <span class="material-symbols-outlined text-[16px]">check</span>
                  </div>
                  <div class="flex flex-col">
                    <span class="font-bold text-on-surface text-sm">Order Placed</span>
                  </div>
                </div>

                <!-- Step 1: Kitchen Accepted Order -->
                <div class="flex gap-3.5 sm:gap-4 items-start relative z-10">
                  <div
                    :class="stepIndex >= 1 ? (hasCookingTime && stepIndex < 3 ? 'bg-primary ring-4 ring-primary/20 text-on-primary' : 'bg-primary text-on-primary') : 'bg-surface-variant text-on-surface-variant'"
                    class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all"
                  >
                    <span v-if="stepIndex > 1 && !hasCookingTime" class="material-symbols-outlined text-[16px]">check</span>
                    <div v-else-if="hasCookingTime && stepIndex <= 2" class="w-3 h-3 bg-white rounded-full animate-ping"></div>
                    <span v-else class="material-symbols-outlined text-[16px]">check</span>
                  </div>
                  <div class="flex flex-col pt-0.5 w-full">
                    <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span class="font-bold text-on-surface text-sm">Kitchen Accepted Order</span>
                      <!-- If cooking time was set, display countdown time badge directly below/alongside -->
                      <div v-if="hasCookingTime && stepIndex < 3" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold text-xs font-mono self-start">
                        <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                        <span>{{ orderCountdown.text }}</span>
                      </div>
                    </div>

                    <!-- Meal Preview Box directly under Step 1 -->
                    <div class="mt-2.5 bg-surface-container rounded-2xl p-3 flex gap-3 items-center shadow-xs w-full max-w-sm border border-outline-variant/20">
                      <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[20px]">soup_kitchen</span>
                      </div>
                      <div class="flex flex-col w-full">
                        <div class="flex justify-between items-center w-full">
                          <span class="text-xs font-bold text-on-surface">{{ orderInfo.item }}</span>
                          <span class="text-xs font-bold text-primary">x{{ orderInfo.qty }}</span>
                        </div>
                        <span class="text-xs font-semibold text-on-surface-variant mt-0.5">₹{{ orderInfo.price }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 2: Ready for Pickup / Out for Delivery -->
                <div class="flex gap-3.5 sm:gap-4 items-center relative z-10">
                  <div
                    :class="stepIndex >= 3 ? (stepIndex === 3 ? 'bg-primary ring-4 ring-primary/20 text-on-primary' : 'bg-primary text-on-primary') : 'bg-surface-container-high text-on-surface-variant'"
                    class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all"
                  >
                    <span v-if="stepIndex >= 4" class="material-symbols-outlined text-[16px]">check</span>
                    <div v-else-if="stepIndex === 3" class="w-3 h-3 bg-white rounded-full animate-ping"></div>
                    <span v-else class="w-2 h-2 bg-on-surface-variant rounded-full"></span>
                  </div>
                  <div class="flex flex-col">
                    <span class="font-bold text-sm" :class="stepIndex >= 3 ? 'text-primary' : 'text-on-surface-variant'">
                      {{ isDeliveryOrder ? 'Sent Out for Delivery' : 'Ready for Pickup' }}
                    </span>
                    <span v-if="stepIndex === 3" class="text-xs text-on-surface-variant mt-0.5">
                      {{ isDeliveryOrder ? 'Cook dispatched your meal. On the way to you!' : 'Cook prepared your meal. Ready at the kitchen.' }}
                    </span>
                  </div>
                </div>

                <!-- Step 3: Completed / Received -->
                <div class="flex gap-3.5 sm:gap-4 items-center relative z-10">
                  <div
                    :class="stepIndex >= 4 ? 'bg-green-600 text-white' : 'bg-surface-container-high text-on-surface-variant'"
                    class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all"
                  >
                    <span v-if="stepIndex >= 4" class="material-symbols-outlined text-[16px]">done_all</span>
                    <span v-else class="w-2 h-2 bg-on-surface-variant rounded-full"></span>
                  </div>
                  <div class="flex flex-col">
                    <span class="font-bold text-sm" :class="stepIndex >= 4 ? 'text-green-700' : 'text-on-surface-variant'">
                      {{ isDeliveryOrder ? 'Order Delivered & Received' : 'Order Completed & Picked Up' }}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            <!-- Prominent Confirm Order Received CTA when out for delivery (Delivery orders only) -->
            <div v-if="stepIndex === 3 && isDeliveryOrder" class="pt-4 border-t border-outline-variant/20 flex flex-col gap-2">
              <button
                type="button"
                :disabled="isConfirmingReceived"
                @click="confirmOrderReceived"
                class="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-on-primary rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 font-bold text-sm cursor-pointer disabled:opacity-50"
              >
                <span class="material-symbols-outlined text-[20px]">check_circle</span>
                <span>{{ isConfirmingReceived ? 'Confirming...' : 'Confirm Delivery Received' }}</span>
              </button>
              <p class="text-[11px] text-center text-on-surface-variant">
                Tap once the home cook has delivered your food.
              </p>
            </div>
          </div>


          <!-- Bottom Section: Review CTA when Completed, or Pickup Location & Map when Active -->
          <div v-if="stepIndex >= 4" class="w-full">
            <div class="bg-surface-container-lowest rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm border border-outline-variant/20">
              <div class="flex items-center gap-3.5 text-left w-full sm:w-auto">
                <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-lg shrink-0">
                  <span class="material-symbols-outlined text-[26px]">star</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-sm sm:text-base font-bold text-on-surface">How was your meal from {{ orderInfo.vendor }}?</span>
                  <span class="text-xs text-on-surface-variant mt-0.5">Share your feedback and star rating to support this home kitchen!</span>
                </div>
              </div>

              <button
                type="button"
                @click="navigateTo('order_completed', { order: { ...liveOrder, ...orderInfo, vendor: liveOrder.vendor || orderInfo.vendorId || orderInfo.vendor } })"
                class="w-full sm:w-auto px-6 py-3.5 bg-primary hover:bg-primary/90 text-on-primary rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm shrink-0"
              >
                <span class="material-symbols-outlined text-[18px]">rate_review</span>
                <span>Write Review & Rating</span>
              </button>
            </div>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div class="bg-surface-container-lowest rounded-3xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm border border-outline-variant/20">
              <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Kitchen Pickup Point</span>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  <span class="material-symbols-outlined text-[20px]">soup_kitchen</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs sm:text-sm font-bold text-on-surface">{{ orderInfo.vendor }}</span>
                  <span class="text-xs text-on-surface-variant">{{ orderInfo.pickupAddress }}</span>
                </div>
              </div>
              <div class="h-px w-full bg-outline-variant/20 my-0.5"></div>
              <div class="flex gap-2.5 mt-auto">
                <button
                  type="button"
                  @click="copyVendorPhone"
                  class="flex-1 bg-surface-container py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition-colors font-bold text-xs cursor-pointer"
                >
                  <span class="material-symbols-outlined text-primary text-[18px]">call</span>
                  <span>Call Maker</span>
                </button>
                <button
                  @click="navigateTo('order_pickup', { order: { ...liveOrder, ...orderInfo } })"
                  class="flex-1 bg-primary text-on-primary py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors font-bold text-xs cursor-pointer shadow-sm"
                >
                  <span class="material-symbols-outlined text-[18px]">directions</span>
                  <span>{{ (liveOrder.orderType === 'DELIVERY' || liveOrder.fulfillment === 'delivery') ? 'Live Delivery' : 'Live Route' }}</span>
                </button>
              </div>
            </div>

            <!-- Interactive Real Leaflet Map Shortcut -->
            <div
              class="bg-surface-container rounded-3xl overflow-hidden shadow-sm h-48 md:h-auto min-h-[170px] relative border border-outline-variant/20 group"
            >
              <div ref="mapContainer" class="w-full h-full absolute inset-0 z-0"></div>

              <div class="absolute inset-0 bg-gradient-to-t from-surface/80 via-transparent to-transparent pointer-events-none z-10 flex flex-col justify-end p-3.5">
                <button
                  type="button"
                  @click="navigateTo('order_pickup', { order: { ...liveOrder, ...orderInfo } })"
                  class="bg-surface/95 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-on-surface inline-flex self-start items-center gap-1.5 shadow-md hover:text-primary transition-colors cursor-pointer pointer-events-auto border border-outline-variant/20"
                >
                  <span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  <span>{{ orderInfo.vendor }} • {{ (liveOrder.orderType === 'DELIVERY' || liveOrder.fulfillment === 'delivery') ? 'Live Delivery Route' : 'Live Route Navigation' }}</span>
                  <span class="material-symbols-outlined text-[15px] text-primary">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>


        </div>
      </main>
    </div>

    <!-- Mobile Bottom Navigation Bar -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 z-50 flex items-center justify-around px-2 shadow-lg">
      <button
        @click="navigateTo('food_radar')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">explore</span>
        <span class="text-[10px] font-semibold mt-0.5">Radar</span>
      </button>
      <button
        @click="navigateTo('order_status')"
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
