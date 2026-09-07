<script setup>
import { ref, computed } from 'vue'

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
        <button @click="navigateTo('vendor_dashboard')" class="flex items-center gap-base text-left cursor-pointer">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-on-primary">soup_kitchen</span>
          </div>
          <div class="flex flex-col">
            <span class="font-headline-lg text-title-md tracking-tight text-primary font-bold">FoodMap</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Vendor Portal</span>
          </div>
        </button>
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
          @click="navigateTo('vendor_dashboard')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">dashboard</span>
          <span class="font-label-md">Kitchen Hub</span>
        </button>
        <button
          @click="navigateTo('post_new_food')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">add_circle</span>
          <span class="font-label-md">Post New Food</span>
        </button>
        <button
          @click="navigateTo('new_order')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">notifications_active</span>
          <span class="font-label-md">Incoming Orders</span>
        </button>
        <button
          @click="navigateTo('vendor_profile')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">storefront</span>
          <span class="font-label-md">Kitchen Profile</span>
        </button>
      </nav>

      <!-- Sidebar Footer -->
      <div class="px-base py-stack-lg border-t border-outline-variant/20 space-y-stack-sm">
        <div
          @click="navigateTo('vendor_profile')"
          class="w-full flex items-center gap-gutter px-gutter py-stack-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 transition-colors text-left cursor-pointer"
        >
          <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {{ kitchenDisplayName.charAt(0).toUpperCase() }}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-label-md text-on-surface leading-normal text-xs font-bold truncate">{{ kitchenDisplayName }}</span>
          </div>
        </div>

        <button
          @click="navigateTo('welcome')"
          class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-medium transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="pl-0 lg:pl-72">
      <header class="fixed top-0 left-0 lg:left-72 right-0 h-16 lg:h-20 bg-surface/90 backdrop-blur-md z-40 flex items-center px-3 sm:px-container-margin justify-between border-b border-outline-variant/20 gap-2">
        <!-- Mobile Drawer Toggle -->
        <button
          @click="isMobileSidebarOpen = true"
          class="lg:hidden p-2 rounded-xl text-on-surface hover:bg-surface-container-high focus:outline-none"
          aria-label="Open menu"
        >
          <span class="material-symbols-outlined text-[24px]">menu</span>
        </button>
        <div class="flex items-center gap-2">
          <span class="font-title-md font-bold text-on-surface">Broadcast Active</span>
        </div>
      </header>

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
