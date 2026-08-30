<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { foodApi, vendorApi } from '../services/api.js'
import {
  onFoodAvailabilityUpdated,
  onFoodNewPosted,
  onFoodUpdated,
  onFoodDeleted,
  onVendorUpdated
} from '../services/socket.js'

const props = defineProps({
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

// Component State
const activeFilter = ref('all') // 'all' | 'Main Course' | 'Breakfast / Snacks' | 'Street Food' | 'Sweets & Breads'
const selectedDiet = ref('all') // 'all' | 'veg' | 'non-veg'
const selectedDistance = ref('500m')
const searchQuery = ref('')
const isLoading = ref(true)
const foods = ref([])
const vendors = ref([])
const selectedMapItem = ref(null)
const liveNotification = ref(null)
const mobileViewMode = ref('feed') // 'feed' | 'map'
const isMobileSidebarOpen = ref(false)

// Haversine distance calculator in meters
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 400
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

const userCoords = computed(() => {
  if (props.user?.location?.coordinates) {
    return {
      lng: props.user.location.coordinates[0],
      lat: props.user.location.coordinates[1]
    }
  }
  return { lng: 72.9355, lat: 19.1468 }
})

// Filtered foods computed list
const filteredFoods = computed(() => {
  return foods.value.filter((item) => {
    // Availability filter
    if (!item.isAvailable && item.quantity <= 0) return false

    // Category filter
    if (activeFilter.value !== 'all') {
      if (item.category !== activeFilter.value && !item.tags?.includes(activeFilter.value)) {
        return false
      }
    }

    // Diet filter
    if (selectedDiet.value !== 'all' && item.diet !== selectedDiet.value) {
      return false
    }

    // Search query filter
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const matchName = item.name?.toLowerCase().includes(q)
      const matchVendor = item.vendorName?.toLowerCase().includes(q)
      const matchDesc = item.description?.toLowerCase().includes(q)
      const matchTag = item.tags?.some((t) => t.toLowerCase().includes(q))
      if (!matchName && !matchVendor && !matchDesc && !matchTag) return false
    }

    // Distance filter
    const distLimit = selectedDistance.value === '500m' ? 600 : (selectedDistance.value === '1km' ? 1200 : 3500)
    const itemCoords = item.location?.coordinates || [72.9342, 19.1458]
    const dist = calculateDistanceMeters(userCoords.value.lat, userCoords.value.lng, itemCoords[1], itemCoords[0])
    return dist <= distLimit
  })
})

async function loadData() {
  try {
    isLoading.value = true
    const [foodsRes, vendorsRes] = await Promise.all([
      foodApi.getFoods(),
      vendorApi.getVendors()
    ])
    if (foodsRes?.foods) foods.value = foodsRes.foods
    if (vendorsRes?.vendors) vendors.value = vendorsRes.vendors
  } catch (err) {
    console.error('Failed to load live foods:', err)
  } finally {
    isLoading.value = false
  }
}

// Socket Subscriptions
let unsubAvailability, unsubNewPosted, unsubUpdated, unsubDeleted, unsubVendor

onMounted(async () => {
  await loadData()

  // Real-time listener: Food portions updated (e.g. resident ordered)
  unsubAvailability = onFoodAvailabilityUpdated((data) => {
    const idx = foods.value.findIndex((f) => f._id === data.foodId || f.id === data.foodId)
    if (idx !== -1) {
      foods.value[idx].quantity = data.quantity
      foods.value[idx].isAvailable = data.isAvailable
      foods.value[idx].status = data.status
      if (data.price) foods.value[idx].price = data.price
    }
  })

  // Real-time listener: New dish posted by neighbor cook
  unsubNewPosted = onFoodNewPosted((newFood) => {
    // Avoid duplicate
    const exists = foods.value.some((f) => f._id === newFood._id)
    if (!exists) {
      foods.value.unshift(newFood)
      liveNotification.value = `Fresh dish just listed: ${newFood.name} by ${newFood.vendorName}!`
      setTimeout(() => {
        liveNotification.value = null
      }, 4000)
    }
  })

  // Real-time listener: Food updated
  unsubUpdated = onFoodUpdated((updatedFood) => {
    const idx = foods.value.findIndex((f) => f._id === updatedFood._id)
    if (idx !== -1) {
      foods.value[idx] = updatedFood
    }
  })

  // Real-time listener: Food deleted
  unsubDeleted = onFoodDeleted((data) => {
    foods.value = foods.value.filter((f) => f._id !== data.foodId)
  })

  // Real-time listener: Vendor details updated
  unsubVendor = onVendorUpdated((updatedVendor) => {
    const idx = vendors.value.findIndex((v) => v._id === updatedVendor._id)
    if (idx !== -1) {
      vendors.value[idx] = updatedVendor
    }
  })
})

onUnmounted(() => {
  if (unsubAvailability) unsubAvailability()
  if (unsubNewPosted) unsubNewPosted()
  if (unsubUpdated) unsubUpdated()
  if (unsubDeleted) unsubDeleted()
  if (unsubVendor) unsubVendor()
})

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

function openFoodDetail(item) {
  const itemCoords = item.location?.coordinates || [72.9342, 19.1458]
  const distM = calculateDistanceMeters(userCoords.value.lat, userCoords.value.lng, itemCoords[1], itemCoords[0])
  emit('navigate', 'food_details', {
    food: {
      id: item._id || item.id,
      name: item.name,
      vendorName: item.vendorName,
      vendorId: item.vendorId,
      price: item.price,
      portions: item.quantity,
      initialPortions: item.initialQuantity || item.quantity,
      time: item.cookingStatus || 'Ready now',
      distance: `${distM}m away`,
      rating: 4.9,
      image: item.image,
      desc: item.description,
      diet: item.diet,
      category: item.category,
      tags: item.tags,
      location: item.location
    }
  })
}

function toggleRole() {
  emit('role-switch', 'vendor')
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

    <!-- Navigation Sidebar (Drawer on Mobile, Fixed Bar on Desktop) -->
    <aside
      :class="isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      class="fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col border-r border-outline-variant/30 shadow-[4px_0_24px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-in-out"
    >
      <div class="p-4 lg:p-stack-lg flex items-center justify-between">
        <div class="flex items-center gap-base">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-on-primary">map</span>
          </div>
          <div class="flex flex-col">
            <span class="font-headline-lg text-title-md tracking-tight text-primary font-bold">FoodMap</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Live Neighborhood Radar</span>
          </div>
        </div>
        <!-- Close button for mobile drawer -->
        <button
          @click="isMobileSidebarOpen = false"
          class="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high"
        >
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <nav class="flex-1 px-base space-y-stack-sm mt-2">
        <button
          @click="navigateTo('food_radar'); isMobileSidebarOpen = false"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg transition-all bg-primary text-on-primary font-bold shadow-sm"
        >
          <span class="material-symbols-outlined mr-gutter">explore</span>
          <span class="font-label-md">Live Radar</span>
        </button>
        <button
          @click="navigateTo('order_status'); isMobileSidebarOpen = false"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
        >
          <span class="material-symbols-outlined mr-gutter">receipt_long</span>
          <span class="font-label-md">My Orders</span>
        </button>
        <button
          @click="navigateTo('resident_profile'); isMobileSidebarOpen = false"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
        >
          <span class="material-symbols-outlined mr-gutter">person</span>
          <span class="font-label-md">Resident Profile</span>
        </button>
      </nav>

      <!-- Sidebar Footer -->
      <div class="px-base py-stack-lg border-t border-outline-variant/20 space-y-stack-sm">
        <div
          @click="navigateTo('resident_profile'); isMobileSidebarOpen = false"
          class="w-full flex items-center gap-gutter px-gutter py-stack-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 transition-colors text-left cursor-pointer"
        >
          <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {{ props.user?.name?.charAt(0) || 'N' }}
          </div>
          <div class="flex flex-col">
            <span class="font-label-md text-on-surface leading-none text-xs font-bold">{{ props.user?.name || 'Nikhil' }}</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5 font-medium">Bhandup West</span>
          </div>
        </div>

        <button
          @click="navigateTo('welcome'); isMobileSidebarOpen = false"
          class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-medium transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">logout</span>
          <span>Switch Account</span>
        </button>
      </div>
    </aside>

    <!-- Content Area (Adaptive left margin for desktop vs mobile) -->
    <div class="pl-0 lg:pl-72">
      <!-- Header (Sticky topbar with Mobile Hamburger, Search and Actions) -->
      <header class="fixed top-0 left-0 lg:left-72 right-0 h-16 lg:h-20 bg-surface/90 backdrop-blur-xl z-40 flex items-center px-3 sm:px-6 justify-between border-b border-outline-variant/20 gap-2">
        <!-- Mobile Sidebar Toggle -->
        <button
          @click="isMobileSidebarOpen = true"
          class="lg:hidden p-2 rounded-xl text-on-surface hover:bg-surface-container-high focus:outline-none shrink-0"
          aria-label="Open menu"
        >
          <span class="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <!-- Search bar -->
        <div class="flex-1 max-w-xl">
          <div class="flex items-center bg-surface-container-high/60 rounded-full px-3 py-1.5 lg:px-gutter lg:py-2 border border-outline-variant/30 hover:border-primary/40 transition-colors">
            <span class="material-symbols-outlined text-primary mr-1.5 text-[18px] lg:text-[20px]">search</span>
            <input
              v-model="searchQuery"
              placeholder="Search dishes, Rajma, Poha..."
              class="bg-transparent border-none outline-none text-xs lg:text-sm text-on-surface font-medium w-full placeholder-on-surface-variant/70"
            />
            <button v-if="searchQuery" @click="searchQuery = ''" class="text-on-surface-variant hover:text-on-surface">
              <span class="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <!-- Active MongoDB Status Indicator (hidden on small mobile) -->
          <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 text-[11px] font-semibold">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span>Live Sync</span>
          </div>

          <button
            @click="navigateTo('order_status')"
            class="flex items-center gap-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl cursor-pointer transition-all border border-outline-variant/20 font-label-md text-xs font-bold"
          >
            <span class="material-symbols-outlined text-primary text-[18px]">receipt_long</span>
            <span class="hidden sm:inline">My Orders</span>
          </button>
        </div>
      </header>

      <!-- Main Content -->
      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background">
        <!-- Real-time Live Popup Banner -->
        <Transition name="slide-fade">
          <div
            v-if="liveNotification"
            class="fixed top-20 lg:top-24 left-1/2 -translate-x-1/2 z-50 bg-primary text-on-primary px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold animate-bounce max-w-[90vw] truncate"
          >
            <span class="material-symbols-outlined text-[18px]">campaign</span>
            <span class="truncate">{{ liveNotification }}</span>
          </div>
        </Transition>

        <div class="flex flex-col w-full">
          <!-- Header Area inside Main -->
          <div class="px-4 sm:px-container-margin py-3 sm:py-stack-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3 z-10 relative bg-background border-b border-outline-variant/10 lg:border-none">
            <div>
              <div class="flex items-center gap-2 mb-0.5">
                <span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                <span class="text-[10px] sm:text-[11px] font-label-sm text-primary tracking-widest uppercase font-bold">Real-time Kitchen Radar</span>
                <span class="text-[11px] text-on-surface-variant font-medium">• Bhandup West</span>
              </div>
              <h1 class="text-xl sm:text-2xl lg:text-3xl font-display-lg text-on-surface font-bold">Food cooking around you now</h1>
            </div>

            <!-- Mobile View Switcher (Feed vs Map) & Filter Pills -->
            <div class="flex items-center justify-between w-full md:w-auto gap-2">
              <!-- Categories Filter Pills (horizontal scroll on mobile) -->
              <div class="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full hide-scrollbar">
                <button
                  @click="activeFilter = 'all'"
                  :class="activeFilter === 'all' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'"
                  class="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-label-md transition-all cursor-pointer"
                >
                  All ({{ foods.length }})
                </button>
                <button
                  @click="activeFilter = 'Main Course'"
                  :class="activeFilter === 'Main Course' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'"
                  class="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-label-md transition-all cursor-pointer"
                >
                  Meals
                </button>
                <button
                  @click="activeFilter = 'Breakfast / Snacks'"
                  :class="activeFilter === 'Breakfast / Snacks' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'"
                  class="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-label-md transition-all cursor-pointer"
                >
                  Snacks
                </button>
                <button
                  @click="activeFilter = 'Street Food'"
                  :class="activeFilter === 'Street Food' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'"
                  class="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-label-md transition-all cursor-pointer"
                >
                  Street Food
                </button>
              </div>

              <!-- Mobile Toggle Button (List vs Map) -->
              <div class="flex lg:hidden shrink-0 bg-surface-container rounded-full p-0.5 border border-outline-variant/30">
                <button
                  @click="mobileViewMode = 'feed'"
                  :class="mobileViewMode === 'feed' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-on-surface-variant'"
                  class="p-1.5 px-2.5 rounded-full text-xs flex items-center gap-1"
                >
                  <span class="material-symbols-outlined text-[16px]">grid_view</span>
                  <span class="hidden xs:inline text-[11px]">Feed</span>
                </button>
                <button
                  @click="mobileViewMode = 'map'"
                  :class="mobileViewMode === 'map' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-on-surface-variant'"
                  class="p-1.5 px-2.5 rounded-full text-xs flex items-center gap-1"
                >
                  <span class="material-symbols-outlined text-[16px]">map</span>
                  <span class="hidden xs:inline text-[11px]">Map</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Main Split View (Food Feed + Interactive Map Radar) -->
          <div class="flex flex-col lg:flex-row flex-1 min-h-[calc(100vh-180px)]">
            <!-- LEFT: Food Feed (Visible on Desktop OR when mobileViewMode is 'feed') -->
            <div
              :class="mobileViewMode === 'feed' ? 'block' : 'hidden lg:block'"
              class="w-full lg:w-[55%] xl:w-[52%] h-full overflow-y-auto px-4 sm:px-container-margin pb-section-gap pt-3"
            >
              <!-- Distance & Diet Sub-filters -->
              <div class="flex items-center justify-between gap-2 mb-4 overflow-x-auto pb-2 hide-scrollbar sticky top-0 bg-background/95 backdrop-blur-md z-20 pt-1 border-b border-outline-variant/10">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-bold text-on-surface-variant mr-1">Radius:</span>
                  <button
                    @click="selectedDistance = '500m'"
                    :class="selectedDistance === '500m' ? 'border-primary text-primary bg-primary/10 font-bold' : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high'"
                    class="whitespace-nowrap px-2.5 py-1 rounded-full border text-xs transition-all cursor-pointer"
                  >
                    500m
                  </button>
                  <button
                    @click="selectedDistance = '1km'"
                    :class="selectedDistance === '1km' ? 'border-primary text-primary bg-primary/10 font-bold' : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high'"
                    class="whitespace-nowrap px-2.5 py-1 rounded-full border text-xs transition-all cursor-pointer"
                  >
                    1 km
                  </button>
                  <button
                    @click="selectedDistance = '3km'"
                    :class="selectedDistance === '3km' ? 'border-primary text-primary bg-primary/10 font-bold' : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high'"
                    class="whitespace-nowrap px-2.5 py-1 rounded-full border text-xs transition-all cursor-pointer"
                  >
                    3 km
                  </button>
                </div>

                <div class="flex items-center gap-1.5">
                  <button
                    @click="selectedDiet = selectedDiet === 'veg' ? 'all' : 'veg'"
                    :class="selectedDiet === 'veg' ? 'bg-green-600 text-white font-bold' : 'bg-surface-container text-on-surface-variant'"
                    class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer"
                  >
                    <span class="w-2 h-2 rounded-full border border-current"></span>
                    <span>Veg only</span>
                  </button>
                </div>
              </div>

              <!-- Loading State -->
              <div v-if="isLoading" class="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
                <div class="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span class="text-xs font-semibold">Scanning live neighborhood kitchens...</span>
              </div>

              <!-- Empty State -->
              <div v-else-if="filteredFoods.length === 0" class="py-12 flex flex-col items-center justify-center text-center p-6 bg-surface-container-low rounded-2xl border border-outline-variant/20">
                <div class="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3">
                  <span class="material-symbols-outlined text-[28px]">search_off</span>
                </div>
                <h3 class="font-bold text-on-surface text-base mb-1">No dishes match your radar criteria</h3>
                <p class="text-xs text-on-surface-variant max-w-sm mb-4">Try widening your distance filter to 1km or 3km to discover more nearby home cooks.</p>
                <button
                  @click="selectedDistance = '3km'; activeFilter = 'all'; searchQuery = ''"
                  class="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold shadow-sm"
                >
                  Expand Radar Radius
                </button>
              </div>

              <!-- Feed Grid (Responsive 1-col on mobile, 2-col on tablet/desktop) -->
              <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-stack-md">
                <div
                  v-for="item in filteredFoods"
                  :key="item._id || item.id"
                  @click="openFoodDetail(item)"
                  class="group flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer border border-outline-variant/20 active:scale-[0.99]"
                >
                  <!-- Dish Photo -->
                  <div class="relative w-full aspect-[16/10] sm:aspect-[4/3] overflow-hidden bg-surface-container">
                    <img
                      :src="item.image"
                      :alt="item.name"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <!-- Live Portions Badge -->
                    <div
                      :class="item.quantity <= 2 ? 'bg-red-600 text-white' : 'bg-surface/95 backdrop-blur-sm text-on-surface'"
                      class="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm text-[11px] font-bold"
                    >
                      <span :class="item.quantity <= 2 ? 'bg-white' : 'bg-primary'" class="w-2 h-2 rounded-full animate-ping"></span>
                      <span>{{ item.quantity }} left</span>
                    </div>

                    <!-- Price Tag -->
                    <div class="absolute bottom-2.5 right-2.5 bg-surface/95 backdrop-blur-md px-3 py-1 rounded-xl shadow-md flex items-center gap-0.5">
                      <span class="text-sm font-bold text-primary">₹{{ item.price }}</span>
                    </div>
                  </div>

                  <!-- Details -->
                  <div class="p-3 sm:p-3.5 flex flex-col gap-2 flex-1">
                    <div>
                      <h3 class="font-bold text-on-surface group-hover:text-primary transition-colors text-sm line-clamp-1">{{ item.name }}</h3>
                      <p class="text-xs text-on-surface-variant line-clamp-2 mt-0.5">{{ item.description }}</p>
                    </div>

                    <div class="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
                      <span class="material-symbols-outlined text-[16px] text-primary">soup_kitchen</span>
                      <span class="truncate font-semibold text-on-surface">{{ item.vendorName }}</span>
                    </div>

                    <!-- Micro-bar attributes -->
                    <div class="mt-auto pt-2 flex items-center justify-between border-t border-outline-variant/10 text-xs">
                      <span class="inline-flex items-center gap-1 text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-md">
                        <span class="material-symbols-outlined text-[14px]">schedule</span>
                        {{ item.cookingStatus || 'Ready now' }}
                      </span>

                      <span class="inline-flex items-center gap-1 text-on-surface-variant font-semibold">
                        <span class="material-symbols-outlined text-[14px]">directions_walk</span>
                        {{ calculateDistanceMeters(userCoords.lat, userCoords.lng, item.location?.coordinates?.[1] || 19.1458, item.location?.coordinates?.[0] || 72.9342) }}m
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT: Interactive Live Map Radar (Full height on mobile if toggled, side-by-side on desktop) -->
            <div
              :class="mobileViewMode === 'map' ? 'flex h-[calc(100vh-140px)]' : 'hidden lg:flex lg:w-[45%] xl:w-[48%] h-full min-h-[620px]'"
              class="w-full relative rounded-none lg:rounded-tl-3xl overflow-hidden shadow-[-8px_0_32px_rgba(0,0,0,0.05)] bg-surface-container flex-col"
            >
              <!-- Top Map Overlay Controls -->
              <div class="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                <div class="bg-surface/90 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md border border-outline-variant/30 flex items-center gap-2 pointer-events-auto">
                  <span class="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
                  <span class="text-xs font-bold text-on-surface">Bhandup West Live Map</span>
                </div>
                <div class="bg-surface/90 backdrop-blur-md px-3 py-1 rounded-full shadow-md text-xs font-semibold text-on-surface-variant pointer-events-auto">
                  {{ filteredFoods.length }} Active Dishes
                </div>
              </div>

              <!-- Map Background Layer -->
              <div
                class="absolute inset-0 w-full h-full bg-cover bg-center"
                style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAmgYv87M6ZS82y69BJ8oD6zbVR1vQIIfN3GZP9eA_X_BJjPdvMx3CUodqBSO0EJ2GMh8mDMYVXh5R-CmHmLdpsHdeWJvcisZ7niwMrbo-cgEHEQtiNqmbgRmqouaOToUe_0hYTrtUGRoBXJWOdi4PJKLTiHUhZnLzDHCRIWCRY8j7p370GZaXuwmYtAWnjTGzY88nlpaIgKbOpMmStX8UjVA2XDBnc0I4rCXsW4ALVWFgUCpbs6niN')"
              ></div>
              <div class="absolute inset-0 bg-gradient-to-b from-surface/25 via-transparent to-surface/40 pointer-events-none"></div>

              <!-- Center: Resident Location Pulsing Radar -->
              <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <!-- Outer Range Ring -->
                <div class="absolute w-[320px] sm:w-[440px] h-[320px] sm:h-[440px] rounded-full border border-primary/25 bg-primary/5"></div>
                <!-- Scanning Radar Sweep -->
                <div
                  class="absolute w-[320px] sm:w-[440px] h-[320px] sm:h-[440px] rounded-full border border-primary/40 origin-center animate-[spin_10s_linear_infinite]"
                  style="background: conic-gradient(from 0deg, transparent 70%, rgba(169, 54, 32, 0.15) 100%); clip-path: polygon(50% 50%, 100% 0, 100% 100%);"
                ></div>
                <!-- User Core Marker -->
                <div class="relative w-7 h-7 bg-primary rounded-full border-4 border-surface shadow-xl z-10 flex items-center justify-center">
                  <div class="absolute w-full h-full rounded-full bg-primary animate-ping opacity-60"></div>
                </div>
                <div class="absolute mt-12 bg-surface/95 backdrop-blur-sm px-2.5 py-0.5 rounded-full shadow-md text-[10px] font-bold text-on-surface border border-outline-variant/20">
                  Your Location
                </div>
              </div>

              <!-- Dynamic Map Pins mapped from actual foods -->
              <div
                v-for="(food, i) in filteredFoods.slice(0, 8)"
                :key="food._id || food.id"
                @click="openFoodDetail(food)"
                :style="{
                  top: `${32 + ((i % 3) * 20) + ((i % 2) * 5)}%`,
                  left: `${20 + ((i * 18) % 60)}%`
                }"
                class="absolute pointer-events-auto cursor-pointer group z-20 transition-transform duration-200 hover:scale-110"
              >
                <!-- Pin Box -->
                <div class="bg-surface/95 backdrop-blur-md rounded-2xl p-1.5 shadow-xl border border-primary/30 group-hover:border-primary flex items-center gap-2 pr-3">
                  <img :src="food.image" class="w-8 h-8 rounded-xl object-cover" />
                  <div class="flex flex-col">
                    <span class="text-[11px] font-bold text-on-surface leading-tight max-w-[100px] truncate">{{ food.name }}</span>
                    <div class="flex items-center gap-1">
                      <span class="text-[10px] font-extrabold text-primary">₹{{ food.price }}</span>
                      <span class="text-[9px] text-green-600 font-bold">• {{ food.quantity }} left</span>
                    </div>
                  </div>
                </div>
                <!-- Pin pointer arrow -->
                <div class="w-2.5 h-2.5 bg-surface rotate-45 border-r border-b border-primary/30 mx-auto -mt-1 shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Mobile Bottom Navigation Bar (Fixed for quick 1-thumb reachability) -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 z-50 flex items-center justify-around px-2 shadow-lg">
      <button
        @click="navigateTo('food_radar')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">explore</span>
        <span class="text-[10px] font-bold mt-0.5">Radar</span>
      </button>
      <button
        @click="mobileViewMode = mobileViewMode === 'map' ? 'feed' : 'map'"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">{{ mobileViewMode === 'map' ? 'grid_view' : 'map' }}</span>
        <span class="text-[10px] font-semibold mt-0.5">{{ mobileViewMode === 'map' ? 'Feed' : 'Map' }}</span>
      </button>
      <button
        @click="navigateTo('order_status')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">receipt_long</span>
        <span class="text-[10px] font-semibold mt-0.5">Orders</span>
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

<style scoped>
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-20px) translateX(-50%);
  opacity: 0;
}
</style>
