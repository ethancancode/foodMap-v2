<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { onFoodAvailabilityUpdated } from '../services/socket.js'
import { foodApi } from '../services/api.js'
import { getCookingCountdown, currentTimestamp } from '../utils/countdown.js'
import { DEFAULT_FOOD_SVG } from '../utils/defaultFoodImage.js'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

// Re-evaluates every second as currentTimestamp ticks
const countdown = computed(() => {
  void currentTimestamp.value
  return (item) => getCookingCountdown(item)
})

const props = defineProps({
  food: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

function getPortions(f) {
  if (!f) return 0
  if (f.quantity !== undefined && f.quantity !== null) return Number(f.quantity)
  if (f.portions !== undefined && f.portions !== null) return Number(f.portions)
  return 6
}

function getAvailability(f) {
  if (!f) return false
  const qty = getPortions(f)
  const avail = f.isAvailable !== undefined ? f.isAvailable : (f.available !== undefined ? f.available : true)
  return Boolean(avail) && qty > 0
}

const selectedQty = ref(1)
const currentPortions = ref(getPortions(props.food))
const isAvailable = ref(getAvailability(props.food))
const liveFlash = ref(false)

const fetchedFood = ref(null)

async function refreshDishDetails() {
  const targetFoodId = props.food?._id || props.food?.id
  const isMongoId = typeof targetFoodId === 'string' && /^[0-9a-fA-F]{24}$/.test(targetFoodId)

  if (targetFoodId && isMongoId) {
    try {
      const res = await foodApi.getFoodById(targetFoodId)
      const f = res?.food || res?.data
      if (f) {
        fetchedFood.value = f
        if (f.quantity !== undefined) {
          currentPortions.value = f.quantity
          isAvailable.value = (f.isAvailable !== false && f.available !== false) && f.quantity > 0
        }
      }
    } catch (e) {
      console.warn('Error refreshing food details:', e.message)
    }
  }
}

watch(
  () => props.food,
  (newFood) => {
    if (newFood) {
      currentPortions.value = getPortions(newFood)
      isAvailable.value = getAvailability(newFood)
      selectedQty.value = 1
      fetchedFood.value = null
      refreshDishDetails()
    }
  },
  { immediate: true, deep: true }
)

// Haversine distance calculator in meters
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined || lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return 0
  }
  const R = 6371e3 // metres
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

const liveCoords = ref(null)

const userCoords = computed(() => {
  if (liveCoords.value) return liveCoords.value
  if (props.user?.location?.coordinates) {
    return {
      lng: props.user.location.coordinates[0],
      lat: props.user.location.coordinates[1]
    }
  }
  return null
})

const foodItem = computed(() => {
  const src = fetchedFood.value || props.food || {}
  const coords = src.location?.coordinates || src.vendor?.location?.coordinates
  let distM = 0
  if (userCoords.value && coords) {
    distM = calculateDistanceMeters(userCoords.value.lat, userCoords.value.lng, coords[1], coords[0])
  }
  const formattedDist = distM <= 50 ? 'Same Location' : (distM >= 1000 ? `${(distM / 1000).toFixed(1)}km away` : `${distM}m away`)

  const vName = src.vendorName || (typeof src.vendor === 'object' && src.vendor?.businessName) || (typeof src.vendor === 'string' && src.vendor) || "Home Chef's Kitchen"
  const vAddr = src.pickupAddress || src.location?.pickupAddress || (typeof src.vendor === 'object' && src.vendor?.location?.pickupAddress) || (typeof src.vendor === 'object' && src.vendor?.pickupAddress) || 'Seawoods, Navi Mumbai'
  const vRating = (typeof src.vendor === 'object' && src.vendor?.rating !== undefined && src.vendor?.rating !== null)
    ? src.vendor.rating
    : (src.rating !== undefined && src.rating !== null ? src.rating : 0)
  const vReviews = (typeof src.vendor === 'object' && src.vendor?.totalReviews !== undefined && src.vendor?.totalReviews !== null)
    ? src.vendor.totalReviews
    : (src.reviews !== undefined && src.reviews !== null ? src.reviews : 0)

  return {
    id: src.id || src._id,
    _id: src._id || src.id,
    name: src.name || 'Delicious Dish',
    price: src.price || 80,
    portions: currentPortions.value,
    quantity: currentPortions.value,
    time: src.time || src.cookingStatus || 'Ready now',
    cookingStatus: src.cookingStatus || src.timeReady || src.time || 'Ready now',
    readyAt: src.readyAt || null,
    createdAt: src.createdAt || null,
    updatedAt: src.updatedAt || null,
    distance: formattedDist,
    distanceMeters: distM,
    location: src.location || src.vendor?.location || null,
    pickupAddress: vAddr,
    vendorName: vName,
    vendorRating: vRating,
    vendorReviews: vReviews,
    vendorId: src.vendorId || src.vendor?._id || (typeof src.vendor === 'string' ? src.vendor : null),
    fulfillmentOptions: src.fulfillmentOptions || 'BOTH',
    description: src.desc || src.description || 'Authentic homestyle delicacy freshly prepared with traditional spices.',
    image: src.image || DEFAULT_FOOD_SVG
  }
})

let unsubAvailability

onMounted(async () => {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        liveCoords.value = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  unsubAvailability = onFoodAvailabilityUpdated((data) => {
    const targetId = props.food?.id || props.food?._id
    if (data.foodId === targetId || String(data.foodId) === String(targetId)) {
      const avail = data.isAvailable !== undefined ? data.isAvailable : (data.available !== false)
      isAvailable.value = avail && data.quantity > 0
      currentPortions.value = data.quantity !== undefined ? data.quantity : currentPortions.value
      liveFlash.value = true
      setTimeout(() => {
        liveFlash.value = false
      }, 1500)
    }
  })
})

onUnmounted(() => {
  if (unsubAvailability) unsubAvailability()
})

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

function reservePortion() {
  if (currentPortions.value <= 0) return
  emit('navigate', 'checkout', {
    food: {
      ...foodItem.value,
      quantity: selectedQty.value,
      portions: currentPortions.value,
      totalAmount: foodItem.value.price * selectedQty.value
    }
  })
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface">
    <!-- Reusable AppSidebar -->
    <AppSidebar
      :role="props.currentRole || (props.user ? 'resident' : 'guest')"
      activeRoute="food_radar"
      :user="props.user"
      @navigate="navigateTo"
      @logout="navigateTo('welcome')"
    />

    <!-- Main Content Area -->
    <div class="pl-0 lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        :show-back="true"
        back-label="Radar"
        back-route="food_radar"
        :show-sync-badge="true"
        sync-label="Live Portions Sync"
        @navigate="navigateTo"
      />

      <!-- Main Layout -->
      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background pb-12 lg:pb-0">
        <div class="flex flex-col w-full min-h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)] lg:overflow-hidden">
          <div class="flex-1 flex flex-col lg:flex-row relative">
            <!-- Left Column: Food Photo -->
            <div class="w-full lg:w-[58%] h-64 sm:h-80 lg:h-full relative shrink-0 z-10 shadow-md lg:shadow-2xl">
              <div
                class="bg-cover bg-center w-full h-full absolute inset-0"
                :style="{ backgroundImage: `url('${foodItem.image}')` }"
              ></div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"></div>
              
              <!-- Top Badges -->
              <div class="absolute top-4 left-4 flex flex-wrap gap-2">
                <div class="bg-surface/95 backdrop-blur-md px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-outline-variant/20">
                  <span class="w-2 h-2 rounded-full" :class="countdown(foodItem).isReady ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-ping'"></span>
                  <span class="font-label-md text-xs font-bold font-mono" :class="countdown(foodItem).isReady ? 'text-green-700' : 'text-amber-800'">
                    {{ countdown(foodItem).text }}
                  </span>
                </div>
                <div v-if="foodItem.fulfillmentOptions === 'PICKUP_ONLY'" class="bg-surface/95 backdrop-blur-md px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-amber-300 text-amber-900 font-bold text-xs">
                  <span class="material-symbols-outlined text-sm text-amber-600">storefront</span>
                  <span>Pickup Only</span>
                </div>
                <div v-else-if="foodItem.fulfillmentOptions === 'DELIVERY_ONLY'" class="bg-surface/95 backdrop-blur-md px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-blue-300 text-blue-900 font-bold text-xs">
                  <span class="material-symbols-outlined text-sm text-blue-600">directions_bike</span>
                  <span>Delivery Only</span>
                </div>
              </div>

              <!-- Dish Headline on Photo -->
              <div class="absolute bottom-4 left-4 right-4 flex justify-between items-end gap-2">
                <div class="flex-1">
                  <span class="font-label-md text-white bg-primary px-2 py-0.5 rounded-md uppercase tracking-wider mb-1.5 inline-block text-[10px] font-bold shadow">
                    Verified Home Kitchen
                  </span>
                  <h1 class="font-display-lg text-xl sm:text-2xl lg:text-3xl text-white font-extrabold drop-shadow-md">
                    {{ foodItem.name }}
                  </h1>
                  <p class="text-white/90 text-xs mt-0.5 max-w-lg line-clamp-2">{{ foodItem.description }}</p>
                </div>
                <div class="bg-surface text-on-surface px-3 py-1.5 sm:px-4 sm:py-2 rounded-2xl shadow-xl border-b-2 border-primary shrink-0">
                  <span class="font-headline-lg text-lg sm:text-2xl text-primary font-black">₹{{ foodItem.price }}</span>
                </div>
              </div>
            </div>

            <!-- Right Column: Details & Order Controls -->
            <div class="w-full lg:w-[42%] flex flex-col bg-surface overflow-y-auto z-20 shadow-[-8px_0_24px_rgba(0,0,0,0.03)] relative">
              <div class="flex-1 p-4 sm:p-6 flex flex-col gap-4 max-w-xl mx-auto w-full">
                <!-- Portions Indicator (Live Sync with Socket.IO) -->
                <div
                  :class="[
                    liveFlash ? 'ring-2 ring-primary scale-[1.02]' : '',
                    currentPortions <= 0 ? 'bg-red-50 border-red-200' : 'bg-primary/5 border-primary/20'
                  ]"
                  class="flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-300"
                >
                  <div
                    :class="currentPortions <= 0 ? 'bg-red-100 text-red-700' : 'bg-primary/15 text-primary'"
                    class="w-10 h-10 rounded-xl flex items-center justify-center relative shrink-0"
                  >
                    <span class="material-symbols-outlined text-[22px]">
                      {{ currentPortions <= 0 ? 'block' : 'inventory_2' }}
                    </span>
                    <span v-if="currentPortions > 0" class="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                    </span>
                  </div>
                  <div class="flex flex-col">
                    <span
                      :class="currentPortions <= 0 ? 'text-red-700' : 'text-on-surface'"
                      class="text-sm sm:text-base font-black"
                    >
                      {{ currentPortions <= 0 ? 'Sold Out' : `${currentPortions} portion(s) available right now` }}
                    </span>
                    <span class="text-[11px] text-on-surface-variant font-medium">
                      {{ currentPortions <= 0 ? 'The vendor has finished this batch.' : 'Live inventory sync active across all neighbors.' }}
                    </span>
                  </div>
                </div>

                <!-- Quantity Selector -->
                <div v-if="currentPortions > 0" class="flex items-center justify-between p-3 bg-surface-container-low rounded-2xl border border-outline-variant/20">
                  <div class="flex flex-col">
                    <span class="text-xs font-bold text-on-surface">Portion Count</span>
                    <span class="text-[11px] text-on-surface-variant">₹{{ foodItem.price }} per portion</span>
                  </div>
                  <div class="flex items-center gap-3 bg-surface rounded-xl p-1 shadow-sm border border-outline-variant/20">
                    <button
                      @click="selectedQty = Math.max(1, selectedQty - 1)"
                      :disabled="selectedQty <= 1"
                      class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container disabled:opacity-30 cursor-pointer font-bold"
                    >
                      -
                    </button>
                    <span class="font-extrabold text-sm w-5 text-center text-primary">{{ selectedQty }}</span>
                    <button
                      @click="selectedQty = Math.min(currentPortions, selectedQty + 1)"
                      :disabled="selectedQty >= currentPortions"
                      class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container disabled:opacity-30 cursor-pointer font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <!-- Distance & Pickup Details -->
                <div class="grid grid-cols-2 gap-2.5">
                  <div class="bg-surface-container-lowest p-3 rounded-2xl shadow-xs border border-outline-variant/20 flex flex-col gap-0.5">
                    <div class="flex items-center gap-1 text-primary text-[11px] font-bold">
                      <span class="material-symbols-outlined text-[16px]">near_me</span>
                      <span>Distance</span>
                    </div>
                    <span class="text-xs sm:text-sm font-extrabold text-on-surface">{{ foodItem.distance }}</span>
                    <span class="text-[10px] text-on-surface-variant truncate">{{ foodItem.pickupAddress }}</span>
                  </div>
                  <div class="bg-surface-container-lowest p-3 rounded-2xl shadow-xs border border-outline-variant/20 flex flex-col gap-0.5">
                    <div class="flex items-center gap-1 text-primary text-[11px] font-bold">
                      <span class="material-symbols-outlined text-[16px]">schedule</span>
                      <span>Ready Time</span>
                    </div>
                    <span
                      class="text-xs sm:text-sm font-extrabold"
                      :class="countdown(foodItem).isReady ? 'text-green-700' : 'text-amber-800 font-mono'"
                    >
                      {{ countdown(foodItem).text }}
                    </span>
                    <span class="text-[10px] text-on-surface-variant">
                      {{ countdown(foodItem).isReady ? 'Ready for pickup' : 'Fresh batch in progress' }}
                    </span>
                  </div>
                </div>

                <!-- Vendor Profile Link -->
                <div class="flex flex-col gap-1.5">
                  <span class="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Cook & Kitchen</span>
                  <div
                    @click="navigateTo('vendor_profile', { vendorId: foodItem.vendorId, vendor: foodItem.vendorName })"
                    class="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-container cursor-pointer transition-colors border border-outline-variant/20 bg-surface-container-lowest"
                  >
                    <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      <span class="material-symbols-outlined text-[20px]">soup_kitchen</span>
                    </div>
                    <div class="flex flex-col flex-1">
                      <span class="text-xs sm:text-sm font-bold text-on-surface">{{ foodItem.vendorName }}</span>
                      <span v-if="foodItem.vendorReviews > 0" class="text-[11px] text-on-surface-variant flex items-center gap-1">
                        <span class="text-amber-600 font-bold">{{ foodItem.vendorRating ? foodItem.vendorRating.toFixed(1) : '5.0' }} ★</span>
                        <span>({{ foodItem.vendorReviews }} {{ foodItem.vendorReviews === 1 ? 'review' : 'reviews' }})</span>
                      </span>
                      <span v-else class="text-[11px] text-on-surface-variant flex items-center gap-1">
                        <span class="text-primary font-semibold">New Kitchen</span>
                        <span>• No reviews yet</span>
                      </span>
                    </div>
                    <span class="material-symbols-outlined text-on-surface-variant text-[18px]">chevron_right</span>
                  </div>
                </div>
              </div>

              <!-- Sticky Reserve Action Bar -->
              <div class="sticky bottom-0 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/20 p-4 sm:p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] flex flex-col gap-3">
                <button
                  @click="reservePortion"
                  :disabled="currentPortions <= 0"
                  :class="currentPortions <= 0 ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed' : 'bg-primary hover:bg-primary/90 text-on-primary shadow-lg cursor-pointer active:scale-[0.98]'"
                  class="w-full py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 font-bold text-xs sm:text-sm"
                >
                  <span v-if="currentPortions > 0">Reserve {{ selectedQty }} Portion(s) • ₹{{ foodItem.price * selectedQty }}</span>
                  <span v-else>Sold Out In This Batch</span>
                  <span v-if="currentPortions > 0" class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
