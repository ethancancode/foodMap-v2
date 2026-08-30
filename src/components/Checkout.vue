<script setup>
import { ref, computed } from 'vue'
import { orderApi } from '../services/api.js'

const props = defineProps({
  food: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

// Reactive State
const quantity = ref(props.food?.quantity || 1)
const fulfillment = ref('pickup') // 'pickup' | 'delivery'
const deliveryAddress = ref(props.user?.location || '402, Sunshine Apts, Bhandup West, Mumbai')
const specialInstructions = ref('')
const isPaying = ref(false)
const errorMessage = ref('')

const foodId = computed(() => props.food?.id || props.food?._id)
const itemPrice = computed(() => props.food?.price || 80)
const itemName = computed(() => props.food?.name || 'Authentic Rajma Chawal')
const vendorName = computed(() => props.food?.vendorName || "Anjali's Kitchen")
const itemImage = computed(() => props.food?.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDafFZxnWsDWN7qKTYJnlTescjOm7k0iERE7lKpfB2DOFewnAuGRBkf4ocUXtqvpZjmz4KSOsOwe0aehBprIbEbO5OsklrbQYgCBG9xttPncOkUpk0NfRBo3K1JNZ0JaKdRffcxRpp3PdQwd0wbScixFwGCqcCVtTQ1rdSuLc0IiwmCzy9S0x2m6XrpiQz_ZzicvlbR_1YKJQ3q_8f11-3P0U9xKJp0RriHs6Qe-O6D7xbA8SS-rGMs')
const maxAvailable = computed(() => props.food?.portions || 10)

const itemSubtotal = computed(() => quantity.value * itemPrice.value)
const deliveryFee = computed(() => (fulfillment.value === 'delivery' ? 30 : 0))
const platformFee = 5
const grandTotal = computed(() => itemSubtotal.value + deliveryFee.value + platformFee)

function increaseQty() {
  if (quantity.value < maxAvailable.value) quantity.value++
}

function decreaseQty() {
  if (quantity.value > 1) quantity.value--
}

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

async function processPayment() {
  isPaying.value = true
  errorMessage.value = ''

  try {
    const payload = {
      foodId: foodId.value,
      quantity: quantity.value,
      residentName: props.user?.name || 'Nikhil Gupta',
      residentPhone: props.user?.phone || '9876543210',
      specialInstructions: specialInstructions.value,
      residentLocation: props.user?.location?.coordinates
        ? props.user.location
        : { type: 'Point', coordinates: [72.9350, 19.1465] }
    }

    const res = await orderApi.createOrder(payload)
    isPaying.value = false

    if (res?.success && res.order) {
      emit('action', { action: 'toast', payload: { message: `Order #${res.order.orderNumber} placed successfully!` } })
      emit('navigate', 'order_confirmation', {
        order: {
          id: res.order.orderNumber,
          _id: res.order._id,
          item: res.order.foodName,
          vendor: res.order.vendorName,
          qty: res.order.quantity,
          pricePerPortion: res.order.pricePerUnit,
          deliveryFee: deliveryFee.value,
          platformFee: platformFee,
          total: res.order.totalAmount + deliveryFee.value + platformFee,
          fulfillment: fulfillment.value,
          address: res.order.pickupAddress,
          status: res.order.status,
          time: new Date(res.order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      })
    }
  } catch (err) {
    isPaying.value = false
    console.error('Order creation error:', err)
    errorMessage.value = err.response?.data?.error || 'Failed to place order. Please try again.'
    emit('action', { action: 'toast', payload: { message: errorMessage.value } })
  }
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface">
    <!-- Left Navigation Sidebar -->
    <aside class="fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col border-r border-outline-variant/30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div class="p-stack-lg flex items-center gap-base">
        <button @click="navigateTo('food_radar')" class="flex items-center gap-base text-left cursor-pointer">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-on-primary">map</span>
          </div>
          <div class="flex flex-col">
            <span class="font-headline-lg text-title-md tracking-tight text-primary font-bold">FoodMap</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Live Neighborhood</span>
          </div>
        </button>
      </div>

      <nav class="flex-1 px-base space-y-stack-sm mt-2">
        <button
          @click="navigateTo('food_radar')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer font-bold"
        >
          <span class="material-symbols-outlined mr-gutter">explore</span>
          <span class="font-label-md">Live Radar</span>
        </button>
        <button
          @click="navigateTo('order_status')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">receipt_long</span>
          <span class="font-label-md">Orders</span>
        </button>
        <button
          @click="navigateTo('resident_profile')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">person</span>
          <span class="font-label-md">Profile</span>
        </button>
      </nav>

      <div class="px-base py-stack-lg border-t border-outline-variant/20">
        <div
          @click="navigateTo('resident_profile')"
          class="w-full flex items-center gap-gutter px-gutter py-stack-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-left cursor-pointer"
        >
          <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {{ props.user?.name?.charAt(0) || 'N' }}
          </div>
          <div class="flex flex-col">
            <span class="font-label-md text-on-surface leading-none text-xs font-bold">{{ props.user?.name || 'Nikhil' }}</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">Resident</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="pl-72">
      <!-- Header -->
      <header class="fixed top-0 left-72 right-0 h-20 bg-surface/90 backdrop-blur-md z-40 flex items-center px-container-margin justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-4">
          <button
            @click="navigateTo('food_details')"
            class="flex items-center gap-2 text-on-surface hover:text-primary transition-colors bg-surface-container px-4 py-2 rounded-full font-label-md font-semibold text-xs cursor-pointer shadow-sm"
          >
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Dish Details</span>
          </button>
        </div>
        <div class="flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
          <span class="material-symbols-outlined text-[16px]">lock</span>
          <span>Atomic Atlas Inventory Protection</span>
        </div>
      </header>

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
                  
                  <div class="absolute top-4 left-4 flex items-center gap-2">
                    <span class="bg-surface/90 backdrop-blur-md text-on-surface text-[12px] px-3 py-1 rounded-full font-bold shadow-sm flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full bg-green-500"></span>
                      Verified Home Kitchen
                    </span>
                  </div>

                  <div class="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <div>
                      <h2 class="text-xl lg:text-2xl text-white font-extrabold">{{ itemName }}</h2>
                      <div class="flex items-center gap-2 text-white/90 mt-1 text-xs">
                        <span class="font-bold">{{ vendorName }}</span>
                        <span>•</span>
                        <span>Bhandup West, Mumbai</span>
                      </div>
                    </div>
                    <div class="text-right bg-surface/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md">
                      <span class="text-lg text-primary font-black">₹{{ itemPrice }}</span>
                      <span class="block text-[10px] text-on-surface-variant font-medium">per portion</span>
                    </div>
                  </div>
                </div>

                <div class="p-5 flex flex-col gap-3 bg-surface-container flex-shrink-0">
                  <p class="text-xs text-on-surface-variant leading-relaxed">
                    Freshly cooked home meal with pure ingredients and hygienic small-batch preparation.
                  </p>
                  <div class="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20">
                    <div class="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-low p-2.5 rounded-xl">
                      <span class="material-symbols-outlined text-primary text-[16px]">verified</span>
                      <span class="font-semibold">Neighborhood Fresh</span>
                    </div>
                    <div class="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container-low p-2.5 rounded-xl">
                      <span class="material-symbols-outlined text-green-600 text-[16px]">eco</span>
                      <span class="font-semibold">No Preservatives</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Controls & Summary -->
            <div class="lg:col-span-6 flex flex-col gap-4">
              <!-- Order Details -->
              <div class="bg-surface rounded-2xl p-5 shadow-sm border border-outline-variant/20 flex flex-col gap-4">
                <h3 class="text-base text-on-surface border-b border-outline-variant/20 pb-3 font-bold">Order Details</h3>
                
                <!-- Quantity Selector -->
                <div class="flex items-center justify-between">
                  <div class="flex flex-col">
                    <span class="text-sm text-on-surface font-bold">Portions to reserve</span>
                    <span class="text-xs text-on-surface-variant font-medium">₹{{ itemPrice }} each</span>
                  </div>
                  <div class="flex items-center bg-surface-container rounded-xl p-1 border border-outline-variant/20">
                    <button
                      @click="decreaseQty"
                      aria-label="Decrease quantity"
                      class="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-variant active:scale-95 transition-all cursor-pointer font-bold"
                    >
                      -
                    </button>
                    <span class="w-10 text-center text-base text-primary font-black">{{ quantity }}</span>
                    <button
                      @click="increaseQty"
                      aria-label="Increase quantity"
                      class="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center shadow-md hover:bg-primary/90 active:scale-95 transition-all cursor-pointer font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <!-- Fulfillment Method -->
                <div class="flex flex-col gap-2 pt-2 border-t border-outline-variant/10">
                  <span class="text-xs uppercase tracking-wider text-on-surface-variant font-bold">Fulfillment Method</span>
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      @click="fulfillment = 'pickup'"
                      :class="fulfillment === 'pickup' ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-outline-variant/30 hover:bg-surface-container'"
                      class="p-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-center cursor-pointer"
                    >
                      <span class="material-symbols-outlined text-[24px]" :class="fulfillment === 'pickup' ? 'text-primary' : 'text-on-surface-variant'">storefront</span>
                      <span class="text-xs font-bold" :class="fulfillment === 'pickup' ? 'text-primary' : 'text-on-surface'">Self Pickup</span>
                      <span class="text-[10px] text-on-surface-variant">Ready in 10-15m (Free)</span>
                    </button>

                    <button
                      type="button"
                      @click="fulfillment = 'delivery'"
                      :class="fulfillment === 'delivery' ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-outline-variant/30 hover:bg-surface-container'"
                      class="p-3 rounded-xl border flex flex-col items-center gap-1 transition-all text-center cursor-pointer"
                    >
                      <span class="material-symbols-outlined text-[24px]" :class="fulfillment === 'delivery' ? 'text-primary' : 'text-on-surface-variant'">directions_bike</span>
                      <span class="text-xs font-bold" :class="fulfillment === 'delivery' ? 'text-primary' : 'text-on-surface'">Direct Delivery</span>
                      <span class="text-[10px] text-on-surface-variant">Est. 20-30m (+₹30)</span>
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
                    <span>Neighbor Runner Fee</span>
                    <span>₹{{ deliveryFee }}</span>
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
