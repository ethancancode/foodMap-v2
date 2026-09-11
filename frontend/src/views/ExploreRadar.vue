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
import LeafletRadar from '../components/LeafletRadar.vue'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

const props = defineProps({
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

// Filter State
const selectedDistance = ref('1km')
const activeFilter = ref('all')
const selectedDiet = ref('all')
const isMobileSidebarOpen = ref(false)
const liveCoords = ref(null)
const foods = ref([])
const vendors = ref([])
const locationName = ref('')
const liveNotification = ref(null)

let geoWatchId = null
let unsubAvailability, unsubNewPosted, unsubUpdated, unsubDeleted, unsubVendor

// Distance calculator
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 400
  const R = 6371e3
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

const DEMO_LOC_KEY = 'foodmap_active_demo_location'
const RUIA_LAT = 19.02298
const RUIA_LNG = 72.85592

const manualCoords = ref(null)

// Initialize demo coords from sessionStorage if previously set
try {
  const saved = sessionStorage.getItem(DEMO_LOC_KEY)
  if (saved) {
    manualCoords.value = JSON.parse(saved)
  }
} catch (e) {}

function handleLocationUpdate(coords) {
  manualCoords.value = coords
  liveCoords.value = coords
  if (coords) {
    sessionStorage.setItem(DEMO_LOC_KEY, JSON.stringify(coords))
  } else {
    sessionStorage.removeItem(DEMO_LOC_KEY)
  }
}

const userCoords = computed(() => {
  if (manualCoords.value) {
    return manualCoords.value
  }
  if (props.user?.location?.coordinates && Array.isArray(props.user.location.coordinates) && props.user.location.coordinates.length === 2) {
    return {
      lng: props.user.location.coordinates[0],
      lat: props.user.location.coordinates[1]
    }
  }
  if (liveCoords.value) return liveCoords.value
  return { lng: RUIA_LNG, lat: RUIA_LAT }
})

function getDistanceLimit(distStr) {
  if (distStr === '500m') return 500
  if (distStr === '1km') return 1000
  if (distStr === '3km') return 3000
  return 5000
}

function getFoodCoords(item) {
  if (item.location?.coordinates && Array.isArray(item.location.coordinates)) {
    return item.location.coordinates
  }
  const vendor = vendors.value.find((v) => v._id === item.vendorId || v._id === item.vendor?._id)
  if (vendor?.location?.coordinates) {
    return vendor.location.coordinates
  }
  return [72.85592, 19.02298]
}

const filteredFoods = computed(() => {
  const distLimit = getDistanceLimit(selectedDistance.value)

  return foods.value
    .map((item) => {
      const coords = getFoodCoords(item)
      const dist = calculateDistanceMeters(userCoords.value.lat, userCoords.value.lng, coords[1], coords[0])
      return {
        ...item,
        location: {
          type: 'Point',
          coordinates: coords
        },
        calculatedDistance: dist
      }
    })
    .filter((item) => {
      if (!item.isAvailable && item.quantity <= 0) return false
      if (activeFilter.value !== 'all' && item.category !== activeFilter.value && !item.tags?.includes(activeFilter.value)) {
        return false
      }
      if (selectedDiet.value !== 'all' && item.diet !== selectedDiet.value) {
        return false
      }
      return item.calculatedDistance <= distLimit
    })
})

function requestLiveLocation() {
  // If user has an explicit saved location, do not override with browser GPS
  if (props.user?.location?.coordinates) return

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        liveCoords.value = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }
      },
      (err) => {
        console.warn('Geolocation access declined or unavailable', err.message)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    geoWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        liveCoords.value = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        }
      },
      (err) => console.warn('Live location watch error:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
  }
}

async function loadData() {
  try {
    const [foodsRes, vendorsRes] = await Promise.all([
      foodApi.getFoods(),
      vendorApi.getVendors()
    ])

    const rawFoods = foodsRes?.foods || foodsRes?.data || foodsRes || []
    foods.value = rawFoods.map((f) => {
      const vName = typeof f.vendor === 'string' ? f.vendor : (f.vendor?.businessName || f.vendorName || 'Home Kitchen')
      return {
        ...f,
        vendorName: vName,
        isAvailable: f.isAvailable !== false && f.available !== false && f.quantity > 0
      }
    })

    vendors.value = vendorsRes?.vendors || vendorsRes?.data || vendorsRes || []
  } catch (err) {
    console.error('Failed to load Explore Radar data:', err)
  }
}

onMounted(() => {
  requestLiveLocation()
  loadData()

  unsubAvailability = onFoodAvailabilityUpdated((data) => {
    const target = foods.value.find((f) => f._id === data.foodId)
    if (target) {
      target.quantity = data.quantity
      target.isAvailable = data.isAvailable !== false && data.quantity > 0
    }
  })

  unsubNewPosted = onFoodNewPosted((newFood) => {
    foods.value.unshift({
      ...newFood,
      isAvailable: true,
      quantity: newFood.quantity || newFood.portions || 5
    })
    liveNotification.value = `New Dish Live: ${newFood.name}!`
    setTimeout(() => {
      liveNotification.value = null
    }, 4500)
  })

  unsubUpdated = onFoodUpdated((updatedFood) => {
    const idx = foods.value.findIndex((f) => f._id === updatedFood._id)
    if (idx !== -1) foods.value[idx] = { ...foods.value[idx], ...updatedFood }
  })

  unsubDeleted = onFoodDeleted((data) => {
    foods.value = foods.value.filter((f) => f._id !== data.foodId)
  })

  unsubVendor = onVendorUpdated((updatedVendor) => {
    const idx = vendors.value.findIndex((v) => v._id === updatedVendor._id)
    if (idx !== -1) vendors.value[idx] = updatedVendor
  })
})

onUnmounted(() => {
  if (geoWatchId !== null && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(geoWatchId)
  }
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
  const vRating = item.vendor?.rating !== undefined ? item.vendor.rating : (item.rating !== undefined ? item.rating : 0)
  const vReviews = item.vendor?.totalReviews !== undefined ? item.vendor.totalReviews : (item.reviews !== undefined ? item.reviews : 0)
  emit('navigate', 'food_details', {
    food: {
      ...item,
      id: item._id || item.id,
      portions: item.quantity,
      initialPortions: item.initialQuantity || item.quantity,
      time: item.cookingStatus || item.timeReady || 'Ready now',
      cookingStatus: item.cookingStatus || item.timeReady || 'Ready now',
      readyAt: item.readyAt || null,
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null,
      distance: `${distM}m away`,
      rating: vRating,
      vendorRating: vRating,
      vendorReviews: vReviews,
      totalReviews: vReviews,
    }
  })
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface">
    <!-- Reusable AppSidebar -->
    <AppSidebar
      :is-open="isMobileSidebarOpen"
      :role="props.currentRole || (props.user ? 'resident' : 'guest')"
      activeRoute="explore_radar"
      :user="props.user"
      @close="isMobileSidebarOpen = false"
      @navigate="navigateTo"
      @sign-in="navigateTo('welcome')"
      @logout="navigateTo('welcome')"
    />

    <!-- Main Content Area -->
    <div class="pl-0 lg:pl-72 flex flex-col h-screen overflow-hidden pt-16 lg:pt-20">
      <!-- Unified Header -->
      <AppHeader
        title="Explore Live Neighborhood Radar"
        :show-sync-badge="false"
        @toggle-sidebar="isMobileSidebarOpen = true"
        @navigate="navigateTo"
      >
        <template #actions>
          <!-- Radius Filter -->
          <div class="flex items-center bg-surface-container rounded-full p-0.5 border border-outline-variant/20 text-xs">
            <button
              @click="selectedDistance = '500m'"
              :class="selectedDistance === '500m' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:text-on-surface'"
              class="px-2.5 py-1 rounded-full transition-all cursor-pointer"
            >
              500m
            </button>
            <button
              @click="selectedDistance = '1km'"
              :class="selectedDistance === '1km' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:text-on-surface'"
              class="px-2.5 py-1 rounded-full transition-all cursor-pointer"
            >
              1 km
            </button>
            <button
              @click="selectedDistance = '3km'"
              :class="selectedDistance === '3km' ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:text-on-surface'"
              class="px-2.5 py-1 rounded-full transition-all cursor-pointer"
            >
              3 km
            </button>
          </div>

          <button
            @click="navigateTo('food_radar')"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-xs font-bold transition-colors cursor-pointer border border-outline-variant/20"
          >
            <span class="material-symbols-outlined text-[16px]">grid_view</span>
            <span class="hidden sm:inline">Dishes Feed</span>
          </button>
        </template>
      </AppHeader>

      <!-- Full-Screen Interactive Leaflet Map -->
      <main class="flex-1 relative w-full h-[calc(100vh-4rem)] lg:h-[calc(100vh-5rem)]">
        <LeafletRadar
          :userCoords="userCoords"
          :foods="filteredFoods"
          :radius="selectedDistance"
          @select-food="openFoodDetail"
          @update-location="handleLocationUpdate"
        />
      </main>
    </div>
  </div>
</template>
