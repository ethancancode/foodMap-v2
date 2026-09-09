<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '',
  },
  showBack: {
    type: Boolean,
    default: false,
  },
  backLabel: {
    type: String,
    default: 'Back',
  },
  backRoute: {
    type: String,
    default: '',
  },
  showSearch: {
    type: Boolean,
    default: false,
  },
  searchModel: {
    type: String,
    default: '',
  },
  searchPlaceholder: {
    type: String,
    default: 'Search dishes, Rajma, Poha...',
  },
  showSyncBadge: {
    type: Boolean,
    default: true,
  },
  syncLabel: {
    type: String,
    default: 'Live Sync',
  },
  showNotifications: {
    type: Boolean,
    default: false,
  },
  pendingOrdersCount: {
    type: Number,
    default: 0,
  },
  role: {
    type: String,
    default: 'resident', // 'vendor' | 'resident' | 'guest'
  },
  user: {
    type: Object,
    default: null,
  },
  showPostFoodButton: {
    type: Boolean,
    default: false,
  },
  showOrdersButton: {
    type: Boolean,
    default: false,
  },
  showSignInButton: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits([
  'toggle-sidebar',
  'back',
  'navigate',
  'open-notifications',
  'update:searchModel',
  'search',
])

const isGuest = computed(() => !props.user || props.role === 'guest')

function handleBack() {
  if (props.backRoute) {
    emit('navigate', props.backRoute)
  } else {
    emit('back')
  }
}
</script>

<template>
  <header
    class="fixed top-0 left-0 lg:left-72 right-0 h-16 lg:h-20 bg-surface/90 backdrop-blur-xl z-40 flex items-center px-3 sm:px-6 justify-between border-b border-outline-variant/20 gap-2 sm:gap-4 transition-all"
  >
    <!-- LEFT SECTION -->
    <div class="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0"> 
      <!-- Mobile Sidebar Drawer Toggle Button -->
      <button
        type="button"
        @click="emit('toggle-sidebar')"
        class="lg:hidden p-2 rounded-xl text-on-surface hover:bg-surface-container-high focus:outline-none shrink-0 cursor-pointer"
        aria-label="Open sidebar menu"
      >
        <span class="material-symbols-outlined text-[24px]">menu</span>
      </button>

      <!-- Optional Back Button -->
      <button
        v-if="showBack"
        type="button"
        @click="handleBack"
        class="flex items-center gap-1.5 sm:gap-2 text-on-surface hover:text-primary transition-colors bg-surface-container hover:bg-surface-container-high px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-label-md font-semibold text-xs cursor-pointer shadow-xs shrink-0"
      >
        <span class="material-symbols-outlined text-[18px]">arrow_back</span>
        <span class="hidden xs:inline">{{ backLabel }}</span>
      </button>

      <!-- Optional Page Title -->
      <h1
        v-if="title"
        class="font-title-md font-bold text-on-surface text-sm sm:text-base lg:text-lg truncate"
      >
        {{ title }}
      </h1>

      <!-- Slot for custom left-aligned controls -->
      <slot name="left"></slot>
    </div>

    <!-- CENTER SECTION: Optional Live Search Bar -->
    <div v-if="showSearch" class="flex-1 max-w-xl mx-2">
      <div
        class="flex items-center bg-surface-container-high/60 rounded-full px-3 py-1.5 lg:px-4 lg:py-2 border border-outline-variant/30 hover:border-primary/40 focus-within:border-primary focus-within:bg-surface-container-highest transition-all"
      >
        <span class="material-symbols-outlined text-primary mr-2 text-[18px] lg:text-[20px] shrink-0">search</span>
        <input
          :value="searchModel"
          @input="emit('update:searchModel', $event.target.value)"
          :placeholder="searchPlaceholder"
          class="bg-transparent border-none outline-none text-xs lg:text-sm text-on-surface font-medium w-full placeholder-on-surface-variant/70"
        />
        <button
          v-if="searchModel"
          type="button"
          @click="emit('update:searchModel', '')"
          class="text-on-surface-variant hover:text-on-surface p-0.5 rounded-full"
        >
          <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
    <div v-else class="flex-1"></div>

    <!-- RIGHT SECTION: Status badges & action buttons -->
    <div class="flex items-center gap-2 sm:gap-3 shrink-0">
      <!-- Live Sync / Sockets Active Badge -->
      <div
        v-if="showSyncBadge"
        class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 text-[11px] font-semibold select-none shrink-0"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
        <span>{{ syncLabel }}</span>
      </div>

      <!-- Notifications Bell (For Vendor incoming orders) -->
      <button
        v-if="showNotifications"
        type="button"
        @click="emit('open-notifications')"
        class="relative p-2 hover:bg-surface-container rounded-full text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        title="Incoming orders"
      >
        <span class="material-symbols-outlined text-[22px]">notifications</span>
        <span
          v-if="pendingOrdersCount > 0"
          class="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-primary rounded-full animate-ping"
        ></span>
        <span
          v-if="pendingOrdersCount > 0"
          class="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-primary rounded-full"
        ></span>
      </button>

      <!-- Post Food Button (For Vendor Dashboard) -->
      <button
        v-if="showPostFoodButton"
        type="button"
        @click="emit('navigate', 'post_new_food')"
        class="flex items-center gap-1.5 bg-primary text-on-primary hover:bg-primary/90 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer shrink-0"
      >
        <span class="material-symbols-outlined text-[18px]">add_circle</span>
        <span>Post Food</span>
      </button>

      <!-- Resident "My Orders" Button -->
      <button
        v-if="showOrdersButton && !isGuest"
        type="button"
        @click="emit('navigate', 'order_status')"
        class="flex items-center gap-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all border border-outline-variant/20 font-label-md text-xs font-bold cursor-pointer shrink-0"
      >
        <span class="material-symbols-outlined text-primary text-[18px]">receipt_long</span>
        <span class="hidden sm:inline">My Orders</span>
      </button>

      <!-- Guest "Sign In" Button -->
      <button
        v-if="showSignInButton && isGuest"
        type="button"
        @click="emit('navigate', 'welcome')"
        class="flex items-center gap-1.5 bg-primary text-on-primary hover:bg-primary/90 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all shadow-xs font-label-md text-xs font-bold cursor-pointer shrink-0"
      >
        <span class="material-symbols-outlined text-[18px]">login</span>
        <span>Sign In</span>
      </button>

      <!-- Custom Actions Slot -->
      <slot name="actions"></slot>
    </div>
  </header>
</template>
