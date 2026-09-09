<script setup>
import { ref } from 'vue'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

const props = defineProps({
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const notificationsEnabled = ref(true)
const isMobileSidebarOpen = ref(false)

function navigateTo(route, payload = null) {
  isMobileSidebarOpen.value = false
  emit('navigate', route, payload)
}

function handleLogout() {
  isMobileSidebarOpen.value = false
  emit('action', { action: 'logout' })
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface pb-20 lg:pb-0">
    <!-- Reusable AppSidebar -->
    <AppSidebar
      :is-open="isMobileSidebarOpen"
      :role="props.currentRole || 'resident'"
      activeRoute="resident_profile"
      :user="props.user"
      @close="isMobileSidebarOpen = false"
      @navigate="navigateTo"
      @logout="handleLogout"
    />

    <!-- Main Content Area -->
    <div class="pl-0 lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        :show-back="true"
        back-label="Radar"
        back-route="food_radar"
        :show-sync-badge="false"
        @toggle-sidebar="isMobileSidebarOpen = true"
        @navigate="navigateTo"
      >
        <template #actions>
          <span class="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">Resident Account</span>
        </template>
      </AppHeader>

      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background">
        <div class="max-w-4xl mx-auto px-4 sm:px-container-margin py-4 sm:py-stack-lg flex flex-col gap-4 sm:gap-section-gap">
          
          <!-- Profile Header Section -->
          <section class="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-stack-lg w-full bg-surface-container-lowest p-4 sm:p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
            <div class="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-md ring-4 ring-surface flex-shrink-0 relative flex items-center justify-center bg-primary/20">
              <img
                v-if="props.user?.avatar"
                alt="Profile photo"
                class="w-full h-full object-cover"
                :src="props.user.avatar"
                @error="$event.target.style.display = 'none'"
              />
              <span v-else class="text-3xl sm:text-4xl font-bold text-primary">
                {{ (props.user?.name || 'U').charAt(0).toUpperCase() }}
              </span>
            </div>
            <div class="flex flex-col items-center sm:items-start text-center sm:text-left flex-grow gap-1">
              <div class="flex items-center gap-2 text-primary font-label-sm text-xs font-bold uppercase tracking-wider">
                <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                FoodMap Verified Resident
              </div>
              <h2 class="font-display-lg text-lg sm:text-title-md font-bold text-on-surface">{{ props.user?.name || 'Resident' }}</h2>
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-xs text-on-surface-variant mt-1">
                <span v-if="props.user?.phone" class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[16px]">call</span>
                  {{ props.user.phone }}
                </span>
                <span v-if="props.user?.phone && props.user?.location?.address" class="hidden sm:inline">•</span>
                <span v-if="props.user?.location?.address" class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[16px]">location_on</span>
                  {{ props.user.location.address }}
                </span>
              </div>
            </div>
            <div class="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 text-xs font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">verified</span>
              <span>Active</span>
            </div>
          </section>

          <!-- Stats Grid -->
          <section class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-gutter w-full">
            <div class="bg-surface-container-lowest rounded-xl p-3 sm:p-4 shadow-sm border border-outline-variant/20 flex flex-col justify-between">
              <span class="text-[11px] sm:text-xs text-on-surface-variant uppercase font-semibold">Active Orders</span>
              <p class="font-headline-lg text-xl sm:text-2xl font-bold text-primary mt-1 sm:mt-2">1</p>
            </div>
            <div class="bg-surface-container-lowest rounded-xl p-3 sm:p-4 shadow-sm border border-outline-variant/20 flex flex-col justify-between">
              <span class="text-[11px] sm:text-xs text-on-surface-variant uppercase font-semibold">Completed</span>
              <p class="font-headline-lg text-xl sm:text-2xl font-bold text-on-surface mt-1 sm:mt-2">12</p>
            </div>
            <div class="bg-surface-container-lowest rounded-xl p-3 sm:p-4 shadow-sm border border-outline-variant/20 flex flex-col justify-between">
              <span class="text-[11px] sm:text-xs text-on-surface-variant uppercase font-semibold">Kitchens Visited</span>
              <p class="font-headline-lg text-xl sm:text-2xl font-bold text-on-surface mt-1 sm:mt-2">8</p>
            </div>
            <div class="bg-surface-container-lowest rounded-xl p-3 sm:p-4 shadow-sm border border-outline-variant/20 flex flex-col justify-between">
              <span class="text-[11px] sm:text-xs text-on-surface-variant uppercase font-semibold">Vouches Given</span>
              <p class="font-headline-lg text-xl sm:text-2xl font-bold text-on-surface mt-1 sm:mt-2">5</p>
            </div>
          </section>

          <!-- Recent Orders & Preferences -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-gutter">
            <!-- Left: Orders -->
            <div class="lg:col-span-7 flex flex-col gap-3 sm:gap-4">
              <h3 class="font-title-md font-bold text-on-surface text-sm sm:text-base flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">receipt_long</span>
                <span>Active & Recent Orders</span>
              </h3>

              <div class="bg-surface-container-lowest rounded-xl p-3.5 sm:p-4 shadow-sm border border-outline-variant/20 flex items-center justify-between gap-2">
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="font-title-md font-bold text-on-surface text-xs sm:text-sm">Authentic Rajma Chawal</h4>
                    <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">Ready</span>
                  </div>
                  <p class="text-[11px] sm:text-xs text-on-surface-variant mt-0.5">Priya Kitchen • 2 portions • ₹195</p>
                </div>
                <button
                  @click="navigateTo('order_status')"
                  class="px-3 py-1.5 bg-primary text-on-primary font-label-md text-xs font-bold rounded-lg hover:bg-primary/90 transition-all cursor-pointer shrink-0"
                >
                  Track
                </button>
              </div>

              <div class="bg-surface-container-lowest rounded-xl p-3.5 sm:p-4 shadow-sm border border-outline-variant/20 flex items-center justify-between gap-2 opacity-80">
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="font-title-md font-bold text-on-surface text-xs sm:text-sm">Spicy Garlic Noodles</h4>
                    <span class="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[10px]">Delivered</span>
                  </div>
                  <p class="text-[11px] sm:text-xs text-on-surface-variant mt-0.5">Corner Stall • 1 portion • ₹120</p>
                </div>
                <button
                  @click="navigateTo('food_radar')"
                  class="px-3 py-1.5 bg-surface text-on-surface border border-outline-variant font-label-md text-xs font-semibold rounded-lg hover:bg-surface-container transition-all cursor-pointer shrink-0"
                >
                  Reorder
                </button>
              </div>
            </div>

            <!-- Right: Settings & Vouches -->
            <div class="lg:col-span-5 flex flex-col gap-3 sm:gap-4">
              <h3 class="font-title-md font-bold text-on-surface text-sm sm:text-base flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">star</span>
                <span>Vouched Kitchens</span>
              </h3>

              <div
                @click="navigateTo('vendor_profile')"
                class="bg-surface-container-lowest rounded-xl p-3 sm:p-3.5 shadow-sm border border-outline-variant/20 flex items-center justify-between cursor-pointer hover:border-primary/40 transition-colors"
              >
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">PK</div>
                  <div>
                    <h4 class="font-label-md font-bold text-on-surface text-xs">Priya Kitchen</h4>
                    <span class="text-[10px] sm:text-[11px] text-on-surface-variant">North Indian Home Cook • 4.9 ★</span>
                  </div>
                </div>
                <span class="material-symbols-outlined text-primary text-[18px]">chevron_right</span>
              </div>

              <!-- Preferences Box -->
              <div class="bg-surface-container-low rounded-xl p-3.5 sm:p-4 border border-outline-variant/20 space-y-2.5">
                <span class="font-label-sm text-xs font-bold uppercase tracking-wider text-on-surface-variant">Preferences</span>
                
                <div class="flex items-center justify-between text-xs">
                  <span class="text-on-surface font-medium">Radar Distance Limit</span>
                  <span class="font-bold text-primary">500 meters</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-on-surface font-medium">Order Notifications</span>
                  <input type="checkbox" v-model="notificationsEnabled" class="accent-primary w-4 h-4 cursor-pointer" />
                </div>
              </div>

              <!-- Logout Button -->
              <button
                @click="handleLogout"
                class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-outline-variant text-red-600 font-label-md text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer"
              >
                <span class="material-symbols-outlined text-[16px]">logout</span>
                <span>Log Out</span>
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>

    <!-- Mobile Bottom Navigation Bar -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 z-40 flex items-center justify-around px-2 shadow-lg">
      <button
        @click="navigateTo('food_radar')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">explore</span>
        <span class="text-[10px] font-semibold mt-0.5">Radar</span>
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
        class="flex flex-col items-center justify-center flex-1 py-1 text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">person</span>
        <span class="text-[10px] font-bold mt-0.5">Profile</span>
      </button>
    </nav>
  </div>
</template>
