<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { orderApi } from '../services/api.js'
import { onOrderStatusChanged } from '../services/socket.js'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'


const props = defineProps({
  order: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const mapContainer = ref(null)
let mapInstance = null

function formatVendorName(val) {
  if (!val) return 'Home Kitchen'
  if (typeof val === 'string') return val
  return val.businessName || val.name || 'Home Kitchen'
}

const isDelivery = computed(() => {
  const o = props.order || {}
  const type = (o.orderType || o.fulfillment || '').toUpperCase()
  return type === 'DELIVERY' || (Number(o.deliveryFee) > 0)
})

const liveOrder = ref(props.order || {})

const orderInfo = computed(() => {
  const o = liveOrder.value || props.order || {}
  return {
    id: o.id || o.orderNumber || '#FM1024',
    item: o.item || o.foodName || o.itemSummary || 'Fresh Homemade Meal',
    vendor: formatVendorName(o.vendorName || o.vendor),
    qty: o.qty || o.quantity || 1,
    price: o.price || o.totalAmount || o.total || 0,
    pickupAddress: o.pickupAddress || o.address || o.vendor?.pickupAddress || o.vendor?.location?.pickupAddress || 'Seawoods, Navi Mumbai',
    customerName: o.residentName || props.user?.name || 'Customer'
  }
})

const browserCoords = ref(null)

function requestBrowserLocation() {
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        browserCoords.value = {
          lng: pos.coords.longitude,
          lat: pos.coords.latitude
        }
        if (mapInstance) {
          initMap()
        }
      },
      (err) => {
        console.warn('Browser geolocation error or permission denied:', err.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }
}

// User Location Coordinates [lng, lat] from live browser GPS, order destination, or user profile
const userCoords = computed(() => {
  if (browserCoords.value) {
    return browserCoords.value
  }
  const o = liveOrder.value || props.order || {}
  const c = props.user?.location?.coordinates ||
            o.residentLocation?.coordinates ||
            o.resident?.location?.coordinates ||
            [73.0188, 19.0225]
  return {
    lng: Number(c[0]) || 73.0188,
    lat: Number(c[1]) || 19.0225
  }
})

// Kitchen Location Coordinates [lng, lat] from dish vendor
const kitchenCoords = computed(() => {
  const o = liveOrder.value || props.order || {}
  const c = o.vendor?.location?.coordinates ||
            o.location?.coordinates ||
            o.vendorLocation?.coordinates ||
            o.vendor?.coordinates ||
            [73.0188, 19.0225]
  return {
    lng: Number(c[0]) || 73.0188,
    lat: Number(c[1]) || 19.0225
  }
})

function initMap() {
  if (!mapContainer.value) return
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }

  const u = userCoords.value
  const k = kitchenCoords.value

  mapInstance = L.map(mapContainer.value, {
    zoomControl: true,
    attributionControl: false
  })

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19
  }).addTo(mapInstance)

  // User Marker
  const userIcon = L.divIcon({
    className: 'custom-user-pin',
    html: `
      <div style="background:#2563eb;color:#fff;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(37,99,235,0.45);border:2px solid #fff;">
        <span style="font-family:'Material Symbols Outlined';font-size:20px;">person_pin_circle</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  })

  // Kitchen Marker
  const kitchenIcon = L.divIcon({
    className: 'custom-kitchen-pin',
    html: `
      <div style="background:#b91c1c;color:#fff;width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(185,28,28,0.45);border:2px solid #fff;">
        <span style="font-family:'Material Symbols Outlined';font-size:22px;">soup_kitchen</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38]
  })

  L.marker([u.lat, u.lng], { icon: userIcon })
    .addTo(mapInstance)
    .bindPopup(`<b>Your Real Location (Device GPS)</b><br/>${isDelivery.value ? 'Delivery Destination' : 'Your Live Location'}`)

  L.marker([k.lat, k.lng], { icon: kitchenIcon })
    .addTo(mapInstance)
    .bindPopup(`<b>${orderInfo.value.vendor}</b><br/>${orderInfo.value.pickupAddress}`)

  // Fit bounds to display both markers clearly without fake zig-zag lines
  const bounds = L.latLngBounds([
    [u.lat, u.lng],
    [k.lat, k.lng]
  ])
  mapInstance.fitBounds(bounds, { padding: [70, 70], maxZoom: 16 })

  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize()
  }, 200)
}

let unsubOrderStatus

import { useRoute } from 'vue-router'
const route = useRoute()

onMounted(async () => {
  requestBrowserLocation()

  const paramId = route.params?.id || route.query?.id
  const targetId = paramId || props.order?._id || props.order?.id || props.order?.orderNumber
  if (targetId) {
    try {
      const res = await orderApi.getOrderById(targetId)
      if (res?.order) {
        liveOrder.value = res.order
      }
    } catch (e) {
      console.log('Order fetch error in OrderPickup:', e)
    }
  } else {
    try {
      const res = await orderApi.getOrders()
      const orders = res?.orders || res?.data || []
      if (orders.length > 0) {
        liveOrder.value = orders[0]
      }
    } catch (e) {
      console.warn('Failed to load recent order in OrderPickup:', e)
    }
  }

  nextTick(() => {
    setTimeout(() => {
      initMap()
    }, 150)
  })

  unsubOrderStatus = onOrderStatusChanged((data) => {
    const currentId = liveOrder.value?._id || liveOrder.value?.id
    if (data.orderId === currentId || data.orderNumber === liveOrder.value?.orderNumber) {
      if (data.order) liveOrder.value = data.order
      const normalizedStatus = String(data.status || '').toUpperCase()
      if (['COMPLETED', 'DELIVERED', 'PICKED_UP'].includes(normalizedStatus)) {
        setTimeout(() => {
          emit('navigate', 'order_completed', {
            order: {
              ...liveOrder.value,
              ...orderInfo.value,
              vendor: liveOrder.value?.vendor || orderInfo.value.vendorId || orderInfo.value.vendor
            }
          })
        }, 500)
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

async function completeOrder() {
  try {
    const targetId = liveOrder.value?._id || liveOrder.value?.id || props.order?._id || props.order?.id
    if (targetId) {
      await orderApi.updateStatus(targetId, 'completed', 'Customer confirmed order receipt on pickup/delivery route')
    }
  } catch (e) {
    console.warn('Could not update status to completed:', e)
  }
  emit('navigate', 'order_completed', {
    order: {
      ...liveOrder.value,
      ...orderInfo.value,
      vendor: liveOrder.value?.vendor || orderInfo.value.vendorId || orderInfo.value.vendor
    }
  })
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

function openExternalDirections() {
  const u = userCoords.value
  const k = kitchenCoords.value
  let originLat, originLng, destLat, destLng

  if (isDelivery.value) {
    // Delivery: Kitchen to User
    originLat = k.lat
    originLng = k.lng
    destLat = u.lat
    destLng = u.lng
  } else {
    // Self Pickup: User to Kitchen
    originLat = u.lat
    originLng = u.lng
    destLat = k.lat
    destLng = k.lng
  }

  const url = `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}`
  window.open(url, '_blank')
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface">
    <!-- Reusable AppSidebar -->
    <AppSidebar
      :role="props.currentRole || (props.user ? 'resident' : 'guest')"
      activeRoute="order_status"
      :user="props.user"
      @navigate="navigateTo"
      @logout="navigateTo('welcome')"
    />

    <!-- Main Content Area -->
    <div class="lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        :show-back="true"
        back-label="Back to Status"
        back-route="order_status"
        :show-sync-badge="false"
        @navigate="navigateTo"
      >
        <template #actions>
          <div class="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            <span class="material-symbols-outlined text-[16px]">
              {{ isDelivery ? 'local_shipping' : 'directions_walk' }}
            </span>
            <span>{{ isDelivery ? 'Direct Delivery' : 'Self Pickup' }}</span>
          </div>
        </template>
      </AppHeader>

      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background">
        <div class="flex flex-col w-full h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)]">
          <div class="grid grid-cols-1 lg:grid-cols-12 h-full bg-background overflow-hidden relative">
            
            <!-- Left Column: Real Interactive Leaflet Location Map -->
            <div class="lg:col-span-7 xl:col-span-8 relative h-[45vh] lg:h-full overflow-hidden order-2 lg:order-1 bg-surface-container-high">
              <div ref="mapContainer" class="w-full h-full absolute inset-0 z-0"></div>
              
              <!-- Floating Map Badge -->
              <div class="absolute bottom-4 left-4 z-10 bg-surface/95 backdrop-blur-md px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-outline-variant/20 pointer-events-auto">
                <div class="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
                <span class="text-on-surface font-semibold text-xs sm:text-sm">
                  {{ isDelivery ? 'Delivery from Kitchen to Your Address' : 'Pickup from Kitchen Counter' }}
                </span>
              </div>
            </div>

            <!-- Right Column: Info Panel -->
            <div class="lg:col-span-5 xl:col-span-4 h-full bg-surface overflow-y-auto order-1 lg:order-2 custom-scrollbar shadow-[-8px_0_24px_rgba(0,0,0,0.02)] z-10 relative p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
              <div class="space-y-4 sm:space-y-6">
                <div class="flex items-center gap-2">
                  <div class="px-3 py-1 rounded-full bg-primary-container/30 text-on-primary-container inline-flex items-center gap-2 font-semibold text-xs">
                    <span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                    <span>{{ isDelivery ? 'Out for Direct Delivery' : 'Ready at Kitchen Counter' }}</span>
                  </div>
                </div>

                <div>
                  <h1 class="font-display-lg text-headline-lg font-bold text-on-surface tracking-tight">
                    {{ isDelivery ? 'Order Delivery' : 'Pick up your order' }}
                  </h1>
                  <p class="font-body-lg text-on-surface-variant text-sm mt-1">
                    {{ isDelivery 
                        ? 'Your homemade meal is prepared and will be delivered directly from the home kitchen.'
                        : 'Your homemade meal is ready. Collect it directly from the maker.'
                    }}
                  </p>
                </div>

                <!-- Order Summary -->
                <div class="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant/20">
                  <div class="flex justify-between items-start mb-3">
                    <span class="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Your order</span>
                    <span class="text-xs font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded">{{ orderInfo.id }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-bold text-on-surface text-sm sm:text-base">{{ orderInfo.item }}</h3>
                      <p class="text-xs text-on-surface-variant mt-0.5">{{ orderInfo.qty }} portion{{ orderInfo.qty > 1 ? 's' : '' }}</p>
                    </div>
                    <span class="text-base sm:text-lg text-primary font-black">₹{{ orderInfo.price }}</span>
                  </div>
                </div>

                <!-- Location Info Box -->
                <div class="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20">
                  <h3 class="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2.5">
                    {{ isDelivery ? 'Kitchen & Delivery Info' : 'Pickup Address' }}
                  </h3>
                  <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                      <span class="material-symbols-outlined text-[20px]">
                        {{ isDelivery ? 'local_shipping' : 'storefront' }}
                      </span>
                    </div>
                    <div class="min-w-0">
                      <h4 class="font-bold text-on-surface text-sm flex items-center gap-2">
                        {{ orderInfo.vendor }}
                        <span class="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-bold">
                          Home Kitchen
                        </span>
                      </h4>
                      <p class="text-xs text-on-surface-variant mt-1">{{ orderInfo.pickupAddress }}</p>
                    </div>
                  </div>
                </div>

                <!-- Maker Contact -->
                <div class="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex items-center justify-between border border-outline-variant/20">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {{ (orderInfo.vendor || 'K').charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <h4 class="font-bold text-on-surface text-sm">{{ orderInfo.vendor }}</h4>
                      <span class="text-xs text-green-600 font-semibold">
                        {{ isDelivery ? 'Dispatched' : 'Ready for handoff' }}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    @click="copyVendorPhone"
                    class="p-2.5 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-primary text-[20px]">call</span>
                  </button>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="pt-6 mt-auto flex flex-col gap-2.5">
                <button
                  type="button"
                  @click="openExternalDirections"
                  class="w-full bg-surface-container hover:bg-surface-container-high text-on-surface font-title-md py-3.5 px-4 rounded-xl border border-outline-variant/30 transition-all flex items-center justify-center gap-2 font-bold cursor-pointer text-xs sm:text-sm"
                >
                  <span class="material-symbols-outlined text-primary text-[18px]">
                    {{ isDelivery ? 'navigation' : 'directions_walk' }}
                  </span>
                  <span>
                    {{ isDelivery ? 'Open Google Maps (Kitchen to You)' : 'Open Google Maps (You to Kitchen)' }}
                  </span>
                </button>
                <button
                  v-if="isDelivery"
                  type="button"
                  @click="completeOrder"
                  class="w-full bg-primary hover:bg-primary/90 text-on-primary font-title-md py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 font-bold cursor-pointer"
                >
                  <span class="material-symbols-outlined">check_circle</span>
                  <span>Confirm Delivery Received</span>
                </button>
                <div v-else class="p-3 bg-surface-container rounded-xl border border-outline-variant/30 text-center">
                  <p class="text-xs text-on-surface-variant font-medium">
                    🍳 Cook will hand over your fresh meal and complete pickup at the kitchen.
                  </p>
                </div>
              </div>
            </div>


          </div>
        </div>
      </main>
    </div>
  </div>
</template>
