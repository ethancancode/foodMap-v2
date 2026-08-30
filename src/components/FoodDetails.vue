<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onFoodAvailabilityUpdated } from '../services/socket.js'
import { foodApi } from '../services/api.js'

const props = defineProps({
  food: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const selectedQty = ref(1)
const currentPortions = ref(props.food?.portions ?? 6)
const isAvailable = ref(props.food?.portions > 0)
const liveFlash = ref(false)

const foodItem = computed(() => ({
  id: props.food?.id || props.food?._id,
  name: props.food?.name || 'Rajma Chawal',
  price: props.food?.price || 80,
  portions: currentPortions.value,
  time: props.food?.time || 'Ready Now',
  distance: props.food?.distance || '420m away',
  vendorName: props.food?.vendorName || "Anjali's Kitchen",
  vendorId: props.food?.vendorId,
  description: props.food?.desc || props.food?.description || 'Authentic homestyle delicacy freshly prepared with traditional spices.',
  image: props.food?.image || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcCn3i8k4gYk-jLV5MXuqSONW-8QpGOpQ4yYcs-5HUarOFUR1kCq3boeWmwl-f7Seo8MV5gGPaYolyo8w_lFVLtdBGN11e9huwwnLqF4wUGtqAbHcuebFi79m5evx_bXkagJMfR6xqZSl0A3UhdKsMtGL_SyAxPz6EhwbTtY7oWANHjY08Msx9WdC5GF0cpXi4h-eS9GA4sfMmh7CCZv7Lu_elTf3lY2oNae4dUF5Fxdr0ktu3Ed5C'
}))

let unsubAvailability

onMounted(async () => {
  if (props.food?.id || props.food?._id) {
    try {
      const res = await foodApi.getFoodById(props.food?.id || props.food?._id)
      if (res?.food) {
        currentPortions.value = res.food.quantity
        isAvailable.value = res.food.isAvailable && res.food.quantity > 0
      }
    } catch (e) {
      console.log('Error refreshing food details:', e)
    }
  }

  unsubAvailability = onFoodAvailabilityUpdated((data) => {
    const targetId = props.food?.id || props.food?._id
    if (data.foodId === targetId || String(data.foodId) === String(targetId)) {
      currentPortions.value = data.quantity
      isAvailable.value = data.isAvailable && data.quantity > 0
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
  if (!isAvailable.value || currentPortions.value <= 0) return
  emit('navigate', 'checkout', {
    food: {
      ...foodItem.value,
      quantity: selectedQty.value,
      totalAmount: foodItem.value.price * selectedQty.value
    }
  })
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface">
    <!-- Left Navigation Sidebar (Desktop only) -->
    <aside class="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex-col border-r border-outline-variant/30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
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
          <span class="font-label-md">My Orders</span>
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
    <div class="pl-0 lg:pl-72">
      <!-- Header -->
      <header class="fixed top-0 left-0 lg:left-72 right-0 h-16 lg:h-20 bg-surface/90 backdrop-blur-xl z-40 flex items-center px-3 sm:px-container-margin justify-between border-b border-outline-variant/20">
        <button
          @click="navigateTo('food_radar')"
          class="flex items-center gap-1.5 text-on-surface hover:text-primary transition-colors bg-surface-container px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-label-md font-semibold text-xs cursor-pointer shadow-sm"
        >
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Radar</span>
        </button>

        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 text-[11px] font-semibold">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span>Live Portions Sync</span>
          </div>
        </div>
      </header>

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
                  <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span class="font-label-md text-on-surface text-xs font-bold">{{ foodItem.time }}</span>
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
                    <span class="text-[10px] text-on-surface-variant">Bhandup West</span>
                  </div>
                  <div class="bg-surface-container-lowest p-3 rounded-2xl shadow-xs border border-outline-variant/20 flex flex-col gap-0.5">
                    <div class="flex items-center gap-1 text-primary text-[11px] font-bold">
                      <span class="material-symbols-outlined text-[16px]">schedule</span>
                      <span>Ready Time</span>
                    </div>
                    <span class="text-xs sm:text-sm font-extrabold text-on-surface">{{ foodItem.time }}</span>
                    <span class="text-[10px] text-on-surface-variant">Fresh batch</span>
                  </div>
                </div>

                <!-- Vendor Profile Link -->
                <div class="flex flex-col gap-1.5">
                  <span class="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">Cook & Kitchen</span>
                  <div
                    @click="navigateTo('vendor_profile')"
                    class="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-container cursor-pointer transition-colors border border-outline-variant/20 bg-surface-container-lowest"
                  >
                    <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      <span class="material-symbols-outlined text-[20px]">soup_kitchen</span>
                    </div>
                    <div class="flex flex-col flex-1">
                      <span class="text-xs sm:text-sm font-bold text-on-surface">{{ foodItem.vendorName }}</span>
                      <span class="text-[11px] text-on-surface-variant">4.9 ★ (42+ reviews)</span>
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
