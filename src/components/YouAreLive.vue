<script setup>
import { computed } from 'vue'

const props = defineProps({
  food: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const foodData = computed(() => ({
  name: props.food?.name || 'Authentic Punjabi Rajma Chawal',
  portions: props.food?.portions || 8,
  price: props.food?.price || 120,
  time: props.food?.time || 'Ready Now',
  location: props.food?.location || 'Bhandup West, Mumbai'
}))

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface">
    <!-- Left Navigation Sidebar -->
    <aside class="fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col border-r border-outline-variant/30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div class="p-stack-lg flex items-center gap-base">
        <button @click="navigateTo('vendor_dashboard')" class="flex items-center gap-base text-left">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <span class="material-symbols-outlined text-on-primary">soup_kitchen</span>
          </div>
          <span class="font-headline-lg text-title-md tracking-tight text-primary">FoodMap</span>
        </button>
      </div>

      <nav class="flex-1 px-base space-y-stack-sm">
        <button
          @click="navigateTo('vendor_dashboard')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all"
        >
          <span class="material-symbols-outlined mr-gutter">dashboard</span>
          <span class="font-label-md">Vendor Dashboard</span>
        </button>
        <button
          @click="navigateTo('post_new_food')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all"
        >
          <span class="material-symbols-outlined mr-gutter">add_circle</span>
          <span class="font-label-md">Post New Food</span>
        </button>
        <button
          @click="navigateTo('new_order')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all"
        >
          <span class="material-symbols-outlined mr-gutter">notifications_active</span>
          <span class="font-label-md">Incoming Orders</span>
        </button>
        <button
          @click="navigateTo('vendor_profile')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all"
        >
          <span class="material-symbols-outlined mr-gutter">storefront</span>
          <span class="font-label-md">Kitchen Profile</span>
        </button>
      </nav>

      <div class="px-base py-stack-lg border-t border-outline-variant/20 space-y-stack-sm">
        <button
          @click="navigateTo('edit_vendor_profile')"
          class="w-full flex items-center gap-gutter px-gutter py-stack-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-left"
        >
          <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span class="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>
          <div class="flex flex-col">
            <span class="font-label-md text-on-surface leading-none">Anjali Sharma</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider">Home Chef</span>
          </div>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="pl-72">
      <header class="fixed top-0 left-72 right-0 h-20 bg-surface/90 backdrop-blur-md z-40 flex items-center px-container-margin justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-2">
          <span class="font-title-md font-bold text-on-surface">Broadcast Active</span>
        </div>
      </header>

      <main class="relative pt-20 min-h-screen bg-background flex items-center justify-center p-container-margin">
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

          <!-- Quick Preview Link -->
          <button
            @click="navigateTo('food_radar')"
            class="mt-4 text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>See how it looks on resident radar</span>
            <span class="material-symbols-outlined text-[14px]">open_in_new</span>
          </button>
        </div>
      </main>
    </div>
  </div>
</template>
