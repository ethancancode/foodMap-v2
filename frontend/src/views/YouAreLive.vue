<script setup>
import { ref, computed } from 'vue'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

const props = defineProps({
  food: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const isMobileSidebarOpen = ref(false)

function formatLocationAddress(food, user) {
  const getCleanStr = (val) => {
    if (!val) return null
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return trimmed
      }
    }
    return null
  }

  return (
    getCleanStr(food?.pickupAddress) ||
    getCleanStr(food?.vendorLocation?.pickupAddress) ||
    getCleanStr(food?.vendor?.location?.pickupAddress) ||
    getCleanStr(food?.vendor?.pickupAddress) ||
    getCleanStr(food?.location?.pickupAddress) ||
    getCleanStr(food?.location?.address) ||
    getCleanStr(typeof food?.location === 'string' ? food.location : null) ||
    getCleanStr(user?.vendor?.location?.pickupAddress) ||
    getCleanStr(user?.vendor?.pickupAddress) ||
    getCleanStr(user?.location?.pickupAddress) ||
    getCleanStr(user?.location?.address) ||
    getCleanStr(typeof user?.location === 'string' ? user.location : null) ||
    getCleanStr(user?.address) ||
    'Seawoods, Navi Mumbai'
  )
}

const foodData = computed(() => ({
  name: props.food?.name || 'Fresh Dish',
  portions: props.food?.quantity || props.food?.portions || 1,
  price: props.food?.price || 0,
  time: props.food?.cookingStatus || props.food?.time || 'Ready Now',
  location: formatLocationAddress(props.food, props.user)
}))

const kitchenDisplayName = computed(() => {
  return props.food?.vendorName || props.food?.vendor?.businessName || props.user?.vendor?.businessName || props.user?.name || 'Priya Kitchen'
})

function navigateTo(route, payload = null) {
  isMobileSidebarOpen.value = false
  emit('navigate', route, payload)
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface pb-20 lg:pb-0">
    <!-- Unified Vendor Sidebar -->
    <AppSidebar
      :is-open="isMobileSidebarOpen"
      role="vendor"
      active-route="kitchen_hub"
      :user="props.user"
      @close="isMobileSidebarOpen = false"
      @navigate="navigateTo"
      @logout="navigateTo('welcome')"
    />

    <!-- Main Content Area -->
    <div class="pl-0 lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        title="Broadcast Active"
        :role="props.currentRole || 'vendor'"
        :user="props.user"
        :show-sync-badge="true"
        @toggle-sidebar="isMobileSidebarOpen = true"
        @navigate="navigateTo"
      />

      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background flex items-center justify-center p-container-margin">
        <div class="relative flex flex-col items-center max-w-lg w-full text-center z-10 bg-surface-container-low p-8 rounded-2xl shadow-md border border-outline-variant/20">
          
          <div class="relative w-28 h-28 mb-stack-lg flex items-center justify-center">
            <div class="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-60"></div>
            <div class="relative z-10 w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <span class="material-symbols-outlined text-[40px] text-on-primary">campaign</span>
            </div>
          </div>

          <h1 class="font-display-lg text-display-lg text-on-surface mb-stack-sm tracking-tight font-bold">You're Live!</h1>
          <p class="font-body-lg text-on-surface-variant mb-stack-lg max-w-md text-sm">
            Your <span class="font-bold text-primary">{{ foodData.name }}</span> is now visible on the Live Food Radar for residents in {{ foodData.location }}.
          </p>

          <!-- Listing Details Box -->
          <div class="w-full bg-surface rounded-xl p-stack-md flex flex-row items-center justify-between mb-section-gap shadow-sm border border-outline-variant/20">
            <div class="flex flex-col text-left">
              <span class="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider mb-1 font-semibold">Active Broadcast</span>
              <div class="flex items-center gap-3 font-label-md text-sm text-on-surface font-semibold">
                <span class="flex items-center gap-1 text-primary">
                  <span class="material-symbols-outlined text-[18px]">inventory_2</span>
                  {{ foodData.portions }} Portions
                </span>
                <span>•</span>
                <span class="flex items-center gap-1 text-green-600">
                  <span class="material-symbols-outlined text-[18px]">schedule</span>
                  {{ foodData.time }}
                </span>
                <span>•</span>
                <span class="font-bold text-primary">₹{{ foodData.price }}</span>
              </div>
            </div>
            <span class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-gutter w-full">
            <button
              @click="navigateTo('vendor_dashboard')"
              class="flex-1 py-3.5 px-gutter bg-primary text-on-primary rounded-xl font-label-md shadow-md hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2 font-bold cursor-pointer"
            >
              <span class="material-symbols-outlined text-[20px]">dashboard</span>
              <span>Go to Dashboard</span>
            </button>
            <button
              @click="navigateTo('post_new_food')"
              class="flex-1 py-3.5 px-gutter bg-surface text-on-surface border border-outline-variant rounded-xl font-label-md hover:bg-surface-container active:scale-95 transition-all flex items-center justify-center gap-2 font-semibold cursor-pointer"
            >
              <span class="material-symbols-outlined text-[20px]">add_circle</span>
              <span>Post Another Item</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
