<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { orderApi } from '../services/api.js'
import { getCookingCountdown, currentTimestamp } from '../utils/countdown.js'
import { DEFAULT_FOOD_SVG } from '../utils/defaultFoodImage.js'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

const props = defineProps({
  food: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

// Reactive State
const quantity = ref(props.food?.quantity || 1)
const fulfillment = ref('pickup') // 'pickup' | 'delivery'
const deliveryAddress = ref(
  props.user?.location?.address ||
  props.user?.location?.pickupAddress ||
  (typeof props.user?.location === 'string' && !props.user.location.startsWith('{') ? props.user.location : '402, Sunshine Apts, Bhandup West, Mumbai')
)
const specialInstructions = ref('')
const isPaying = ref(false)
const errorMessage = ref('')

const liveCoords = ref(null)

onMounted(() => {
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
})

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined || lat1 === null || lon1 === null || lat2 === null || lon2 === null) {
    return 0
  }
  const R = 6371e3
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

const userCoords = computed(() => {
  if (liveCoords.value) return liveCoords.value
  if (props.user?.location?.coordinates) {
    return {
      lng: props.user.location.coordinates[0],
      lat: props.user.location.coordinates[1]
    }
  }
  return { lng: 73.0188, lat: 19.0225 }
})

const distanceMeters = computed(() => {
  const f = props.food || {}
  // If explicitly passed from FoodDetails
  if (f.distanceMeters !== undefined && f.distanceMeters !== null && f.distanceMeters > 0) {
    return Number(f.distanceMeters)
  }
  // If distance string was passed (e.g. "2.2km away" or "450m away")
  if (typeof f.distance === 'string') {
    const kmMatch = f.distance.match(/([\d.]+)\s*km/i)
    if (kmMatch) return Math.round(parseFloat(kmMatch[1]) * 1000)
    const mMatch = f.distance.match(/(\d+)\s*m/i)
    if (mMatch) return parseInt(mMatch[1], 10)
  }

  const coords = f.location?.coordinates || f.vendor?.location?.coordinates
  if (coords && userCoords.value) {
    return calculateDistanceMeters(userCoords.value.lat, userCoords.value.lng, coords[1], coords[0])
  }
  return 2000
})

// Vendor fulfillment options: 'BOTH' | 'PICKUP_ONLY' | 'DELIVERY_ONLY'
const vendorFulfillment = computed(() => {
  return props.food?.fulfillmentOptions || 'BOTH'
})

const isPickupAllowed = computed(() => {
  return vendorFulfillment.value !== 'DELIVERY_ONLY'
})

const isDeliveryAllowedByVendor = computed(() => {
  return vendorFulfillment.value !== 'PICKUP_ONLY'
})

// Disable delivery if within 100m OR if vendor explicitly restricted to pickup only
const isDeliveryDisabled = computed(() => {
  if (!isDeliveryAllowedByVendor.value) return true
  return distanceMeters.value > 0 && distanceMeters.value <= 100
})

const deliveryDisabledReason = computed(() => {
  if (!isDeliveryAllowedByVendor.value) return 'Pickup only (Cook selected)'
  if (distanceMeters.value > 0 && distanceMeters.value <= 100) return 'Within 100m (Pickup only)'
  return ''
})

// Adjust fulfillment mode if currently invalid
watch([vendorFulfillment, isDeliveryDisabled], () => {
  if (!isPickupAllowed.value && fulfillment.value === 'pickup') {
    fulfillment.value = 'delivery'
  } else if (isDeliveryDisabled.value && fulfillment.value === 'delivery') {
    fulfillment.value = 'pickup'
  }
}, { immediate: true })

// ₹6 per 500m (min ₹10 base fee)
const calculatedDeliveryFee = computed(() => {
  const dist = distanceMeters.value || 0
  return Math.max(10, Math.ceil(dist / 500) * 6)
})

const deliveryFee = computed(() => (fulfillment.value === 'delivery' ? calculatedDeliveryFee.value : 0))

const countdown = computed(() => {
  void currentTimestamp.value
  return getCookingCountdown(props.food)
})

// Travel time: 500m per minute + remaining cooking time
const estDeliveryMinutes = computed(() => {
  const dist = distanceMeters.value || 0
  const travelMins = Math.max(3, Math.ceil(dist / 500))
  const cookMins = countdown.value.isReady ? 0 : (countdown.value.remainingMinutes || 10)
  return cookMins + travelMins
})

const pickupAddress = computed(() => {
  const f = props.food || {}
  return (
    f.pickupAddress ||
    f.location?.pickupAddress ||
    (typeof f.vendor === 'object' && f.vendor?.location?.pickupAddress) ||
    (typeof f.vendor === 'object' && f.vendor?.pickupAddress) ||
    'Seawoods, Navi Mumbai'
  )
})

watch(
  () => props.food,
  (newFood) => {
    if (newFood) {
      // Prioritize explicit selected quantity, or 1
      const chosenQty = newFood.selectedQty || newFood.quantity || 1
      quantity.value = chosenQty
      errorMessage.value = ''
    }
  },
  { immediate: true }
)

const foodId = computed(() => props.food?.id || props.food?._id)
const itemPrice = computed(() => props.food?.price || 80)
const itemName = computed(() => props.food?.name || 'Delicious Dish')
const vendorName = computed(() => {
  const v = props.food?.vendorName || props.food?.vendor
  if (typeof v === 'string') return v
  return v?.businessName || v?.name || "Chef's Kitchen"
})
const itemImage = computed(() => props.food?.image || DEFAULT_FOOD_SVG)
const maxAvailable = computed(() => props.food?.portions || props.food?.quantity || 10)

const itemSubtotal = computed(() => quantity.value * itemPrice.value)
const platformFee = 5
const grandTotal = computed(() => itemSubtotal.value + deliveryFee.value + platformFee)

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

async function processPayment() {
  isPaying.value = true
  errorMessage.value = ''

  try {
    const targetVendorId = props.food?.vendorId || props.food?.vendor?._id || props.food?.vendor?.id || (typeof props.food?.vendor === 'string' ? props.food.vendor : null)

    const payload = {
      foodId: foodId.value,
      vendorId: targetVendorId,
      quantity: quantity.value,
      orderType: fulfillment.value === 'delivery' ? 'DELIVERY' : 'PICKUP',
      fulfillment: fulfillment.value,
      residentName: props.user?.name || 'Resident',
      residentPhone: props.user?.phone || '',
      specialInstructions: specialInstructions.value,
      readyAt: props.food?.readyAt || null,
      cookingStatus: props.food?.cookingStatus || props.food?.timeReady || props.food?.time || 'Ready now',
      timeReady: props.food?.timeReady || props.food?.cookingStatus || props.food?.time || 'Ready now',
      residentLocation: props.user?.location?.coordinates
        ? props.user.location
        : { type: 'Point', coordinates: [userCoords.value.lng, userCoords.value.lat] }
    }

    const res = await orderApi.createOrder(payload)
    isPaying.value = false

    const orderObj = res?.order || res?.data || res
    if (orderObj && (orderObj._id || orderObj.orderNumber)) {
      emit('action', { action: 'toast', payload: { message: `Order #${orderObj.orderNumber} placed successfully!` } })
      const finalVendor = (typeof orderObj.vendorName === 'string' && orderObj.vendorName)
        ? orderObj.vendorName
        : (typeof orderObj.vendor === 'string' ? orderObj.vendor : (orderObj.vendor?.businessName || vendorName.value || "Chef's Kitchen"))

      emit('navigate', 'order_confirmation', {
        order: {
          id: orderObj.orderNumber || orderObj._id,
          _id: orderObj._id,
          item: orderObj.foodName || orderObj.itemSummary || itemName.value,
          vendor: finalVendor,
          vendorName: finalVendor,
          vendorLocation: orderObj.vendor?.location || props.food?.location || props.food?.vendor?.location,
          location: orderObj.vendor?.location || props.food?.location || props.food?.vendor?.location,
          qty: orderObj.quantity || quantity.value,
          pricePerPortion: orderObj.pricePerUnit || itemPrice.value,
          deliveryFee: deliveryFee.value,
          platformFee: platformFee,
          total: orderObj.totalAmount || grandTotal.value,
          fulfillment: fulfillment.value,
          address: orderObj.pickupAddress || pickupAddress.value,
          pickupAddress: orderObj.pickupAddress || pickupAddress.value,
          status: orderObj.status || 'PENDING',
          time: new Date(orderObj.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      })
    } else {
      throw new Error('Order confirmation not received')
    }
  } catch (err) {
    isPaying.value = false
    errorMessage.value = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to place order. Please try again.'
    emit('action', { action: 'toast', payload: { message: errorMessage.value } })
  }
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
    <div class="lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        :show-back="true"
        back-label="Back to Dish Details"
        back-route="food_details"
        :show-sync-badge="false"
        @navigate="navigateTo"
      />

      <!-- Main Container -->
      <main class="relative pt-20 min-h-screen bg-background">
        <div class="flex flex-col w-full h-full p-container-margin lg:p-stack-lg max-w-[1440px] mx-auto gap-stack-lg relative">
          
          <!-- Error banner if out of stock -->
          <div v-if="errorMessage" class="w-full bg-red-50 text-red-800 p-4 rounded-2xl border border-red-200 flex items-center gap-3">
            <span class="material-symbols-outlined text-red-600">error</span>
            <span class="text-sm font-semibold">{{ errorMessage }}</span>
          </div>

          <div class="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 relative z-10 items-stretch">
            
            <!-- Left Column: Item Summary -->
            <div class="lg:col-span-6 flex flex-col h-full w-full relative">
              <div class="w-full h-full flex flex-col bg-surface-container rounded-2xl overflow-hidden shadow-sm border border-outline-variant/20">
                <div class="relative w-full flex-1 min-h-[280px] lg:min-h-[340px] bg-surface-variant overflow-hidden">
                  <div
                    class="absolute inset-0 bg-cover bg-center w-full h-full"
                    :style="{ backgroundImage: `url('${itemImage}')` }"
                  ></div>
                  <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
                  
                  <div class="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div>
                      <h2 class="text-xl lg:text-2xl text-white font-extrabold">{{ itemName }}</h2>
                      <div class="flex items-center gap-2 text-white/90 mt-1 text-xs">
                        <span class="font-bold">{{ vendorName }}</span>
                        <span>•</span>
                        <span>{{ pickupAddress }}</span>
                      </div>
                    </div>
                    <div class="text-center flex flex-col items-center justify-center bg-surface/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl shadow-md shrink-0">
                      <span class="text-lg text-primary font-black leading-tight">₹{{ itemPrice }}</span>
                      <span class="block text-[10px] text-on-surface-variant font-medium leading-tight mt-0.5">per portion</span>
                    </div>
                  </div>
                </div>

                <div class="p-5 flex flex-col gap-3 bg-surface-container flex-shrink-0">
                  <p class="text-xs text-on-surface-variant leading-relaxed">
                    Freshly cooked home meal with pure ingredients and hygienic small-batch preparation.
                  </p>
                </div>
              </div>
            </div>

            <!-- Right Column: Controls & Summary -->
            <div class="lg:col-span-6 flex flex-col gap-4">
              <!-- Order Details -->
              <div class="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/20 flex flex-col gap-4">
                <h3 class="text-base text-on-surface border-b border-outline-variant/20 pb-3 font-bold">Order Details</h3>
                
                <!-- Selected Portions (Read-only as chosen on Food Details) -->
                <div class="flex items-center justify-between">
                  <div class="flex flex-col">
                    <span class="text-sm text-on-surface font-bold">Selected Portions</span>
                    <span class="text-xs text-on-surface-variant font-medium">₹{{ itemPrice }} each</span>
                  </div>
                  <div class="flex items-center gap-1.5 px-3.5 py-2 bg-surface-container rounded-xl border border-outline-variant/20">
                    <span class="text-sm text-primary font-black">{{ quantity }}</span>
                    <span class="text-xs text-on-surface-variant font-semibold">{{ quantity === 1 ? 'portion' : 'portions' }}</span>
                  </div>
                </div>

                <!-- Fulfillment Method -->
                <div class="flex flex-col gap-2 pt-2 border-t border-outline-variant/10">
                  <span class="text-xs uppercase tracking-wider text-on-surface-variant font-bold">Fulfillment Method</span>
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      :disabled="!isPickupAllowed"
                      @click="isPickupAllowed && (fulfillment = 'pickup')"
                      :class="[
                        !isPickupAllowed
                          ? 'opacity-50 cursor-not-allowed border-outline-variant/20 bg-surface-container/50'
                          : (fulfillment === 'pickup' ? 'border-primary bg-primary/10 ring-2 ring-primary/20 cursor-pointer' : 'border-outline-variant/30 hover:bg-surface-container cursor-pointer'),
                        'p-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-center relative'
                      ]"
                    >
                      <span class="material-symbols-outlined text-[24px]" :class="fulfillment === 'pickup' ? 'text-primary' : 'text-on-surface-variant'">storefront</span>
                      <span class="text-xs font-bold" :class="fulfillment === 'pickup' ? 'text-primary' : 'text-on-surface'">Self Pickup</span>
                      <span class="text-[10px] text-on-surface-variant font-medium">
                        <template v-if="!isPickupAllowed">
                          Delivery only (Cook selected)
                        </template>
                        <template v-else>
                          {{ countdown.isReady ? 'Ready for pickup (Free)' : `Ready in ${countdown.text} (Free)` }}
                        </template>
                      </span>
                    </button>

                    <button
                      type="button"
                      :disabled="isDeliveryDisabled"
                      @click="!isDeliveryDisabled && (fulfillment = 'delivery')"
                      :class="[
                        isDeliveryDisabled
                          ? 'opacity-50 cursor-not-allowed border-outline-variant/20 bg-surface-container/50'
                          : (fulfillment === 'delivery' ? 'border-primary bg-primary/10 ring-2 ring-primary/20 cursor-pointer' : 'border-outline-variant/30 hover:bg-surface-container cursor-pointer'),
                        'p-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-center relative'
                      ]"
                    >
                      <span class="material-symbols-outlined text-[24px]" :class="fulfillment === 'delivery' ? 'text-primary' : 'text-on-surface-variant'">directions_bike</span>
                      <span class="text-xs font-bold" :class="fulfillment === 'delivery' ? 'text-primary' : 'text-on-surface'">Direct Delivery</span>
                      <span class="text-[10px] text-on-surface-variant font-medium">
                        <template v-if="isDeliveryDisabled">
                          {{ deliveryDisabledReason }}
                        </template>
                        <template v-else>
                          Est. {{ estDeliveryMinutes }}m (+₹{{ calculatedDeliveryFee }})
                        </template>
                      </span>
                    </button>
                  </div>

                  <!-- Special Note / Instructions -->
                  <div class="mt-2">
                    <label class="text-xs font-bold text-on-surface-variant mb-1 block">Special Cooking / Packing Note</label>
                    <input
                      v-model="specialInstructions"
                      placeholder="e.g., Less spicy, extra spoon, or leave at gate..."
                      class="w-full bg-surface-container px-3.5 py-2.5 rounded-xl border border-outline-variant/20 focus:border-primary text-xs text-on-surface outline-none"
                    />
                  </div>
                </div>
              </div>

              <!-- Payment Summary -->
              <div class="bg-surface-container rounded-2xl p-5 shadow-sm border border-outline-variant/20 flex flex-col gap-3">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-primary text-[20px]">receipt_long</span>
                  <h3 class="text-sm text-on-surface font-bold">Summary Breakdown</h3>
                </div>
                <div class="flex flex-col gap-2 text-xs text-on-surface">
                  <div class="flex justify-between items-center">
                    <span>{{ itemName }} (x{{ quantity }})</span>
                    <span class="font-bold">₹{{ itemSubtotal }}</span>
                  </div>
                  <div v-if="fulfillment === 'delivery'" class="flex justify-between items-center text-on-surface-variant">
                    <span>Direct Delivery Fee ({{ distanceMeters >= 1000 ? (distanceMeters/1000).toFixed(1) + 'km' : distanceMeters + 'm' }})</span>
                    <span class="font-semibold text-on-surface">₹{{ deliveryFee }}</span>
                  </div>
                  <div v-else class="flex justify-between items-center text-on-surface-variant">
                    <span>Self Pickup Fee</span>
                    <span class="text-green-600 font-bold">FREE</span>
                  </div>
                  <div class="flex justify-between items-center text-on-surface-variant">
                    <span>Platform Service Fee</span>
                    <span>₹{{ platformFee }}</span>
                  </div>
                </div>

                <div class="h-px w-full bg-outline-variant/30 my-1 border-dashed border-b"></div>

                <div class="flex justify-between items-end">
                  <div class="flex flex-col">
                    <span class="text-sm font-bold text-on-surface">Total Amount</span>
                    <span class="text-[10px] text-green-700 font-semibold">Direct to Home Cook</span>
                  </div>
                  <span class="text-2xl text-primary font-black">₹{{ grandTotal }}</span>
                </div>
              </div>

              <!-- Action Button -->
              <div>
                <button
                  @click="processPayment"
                  :disabled="isPaying"
                  class="w-full bg-primary hover:bg-primary/90 text-on-primary py-3.5 rounded-xl text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 font-bold cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  <span v-if="!isPaying" class="flex items-center gap-2">
                    <span>Confirm Order & Reserve • ₹{{ grandTotal }}</span>
                    <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </span>
                  <span v-else class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                    <span>Deducting Inventory & Booking...</span>
                  </span>
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
