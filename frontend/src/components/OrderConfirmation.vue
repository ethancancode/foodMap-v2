<script setup>
import { computed } from 'vue'

const props = defineProps({
  order: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const orderData = computed(() => ({
  id: props.order?.id || '#FM1024',
  item: props.order?.item || 'Rajma Chawal',
  vendor: props.order?.vendor || "Anjali's Kitchen",
  qty: props.order?.qty || 2,
  total: props.order?.total || 195,
  fulfillment: props.order?.fulfillment || 'pickup'
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
        <button @click="navigateTo('food_radar')" class="flex items-center gap-base text-left">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <span class="material-symbols-outlined text-on-primary">map</span>
          </div>
          <span class="font-headline-lg text-title-md tracking-tight text-primary">FoodMap</span>
        </button>
      </div>

      <nav class="flex-1 px-base space-y-stack-sm">
        <button
          @click="navigateTo('food_radar')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all"
        >
          <span class="material-symbols-outlined mr-gutter">home</span>
          <span class="font-label-md">Home</span>
        </button>
        <button
          @click="navigateTo('food_radar')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all"
        >
          <span class="material-symbols-outlined mr-gutter">explore</span>
          <span class="font-label-md">Explore</span>
        </button>
        <button
          @click="navigateTo('order_status')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg transition-all bg-primary-container text-on-primary-container font-bold"
        >
          <span class="material-symbols-outlined mr-gutter">receipt_long</span>
          <span class="font-label-md">Orders</span>
        </button>
        <button
          @click="navigateTo('resident_profile')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all"
        >
          <span class="material-symbols-outlined mr-gutter">person</span>
          <span class="font-label-md">Profile</span>
        </button>
      </nav>

      <div class="px-base py-stack-lg border-t border-outline-variant/20 space-y-stack-sm">
        <button
          @click="navigateTo('resident_profile')"
          class="w-full flex items-center gap-gutter px-gutter py-stack-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-left"
        >
          <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span class="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>
          <div class="flex flex-col">
            <span class="font-label-md text-on-surface leading-none">{{ props.user?.name || 'Nikhil' }}</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider">Resident</span>
          </div>
        </button>
      </div>
    </aside>

    <!-- Content Area -->
    <div class="pl-72">
      <header class="fixed top-0 left-72 right-0 h-20 bg-surface/90 backdrop-blur-md z-40 flex items-center px-container-margin justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-2">
          <span class="font-title-md font-bold text-on-surface">Order Success</span>
        </div>
      </header>

      <main class="relative pt-20 min-h-screen bg-background flex items-center justify-center p-container-margin">
        <div class="flex flex-col w-full max-w-lg items-center text-center p-8 bg-surface-container-low rounded-2xl shadow-md border border-outline-variant/20 relative overflow-hidden">
          <div class="absolute w-96 h-96 rounded-full bg-primary/5 blur-3xl top-0 -left-20 pointer-events-none"></div>

          <!-- Success Icon -->
          <div class="relative z-10 flex items-center justify-center w-24 h-24 mb-stack-lg">
            <div class="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-60"></div>
            <div class="relative bg-primary text-on-primary w-20 h-20 rounded-full flex items-center justify-center shadow-lg">
              <span class="material-symbols-outlined text-[40px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
            </div>
          </div>

          <!-- Header -->
          <h1 class="font-display-lg text-display-lg text-on-surface mb-stack-sm font-bold">Order Confirmed!</h1>
          <p class="font-body-lg text-on-surface-variant mb-stack-lg">Your meal from {{ orderData.vendor }} is locked in.</p>
          
          <div class="bg-surface px-4 py-1.5 rounded-full text-on-surface font-label-md tracking-wider mb-stack-lg flex items-center gap-2 border border-outline-variant/30 font-bold text-sm">
            <span class="material-symbols-outlined text-[18px] text-primary">receipt_long</span>
            <span>ORDER {{ orderData.id }}</span>
          </div>

          <!-- Summary Card -->
          <div class="w-full bg-surface shadow-sm rounded-xl p-stack-lg mb-section-gap border border-outline-variant/20 text-left">
            <div class="flex items-start justify-between w-full mb-stack-md border-b border-outline-variant/20 pb-stack-md">
              <div>
                <span class="font-title-md font-bold text-on-surface block">{{ orderData.item }}</span>
                <span class="font-body-md text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                  <span class="material-symbols-outlined text-[14px]">storefront</span>
                  {{ orderData.vendor }}
                </span>
              </div>
              <div class="text-right">
                <span class="font-title-md font-bold text-primary">₹{{ orderData.total }}</span>
                <span class="font-label-sm text-[11px] text-primary px-2 py-0.5 bg-primary/10 rounded-full block mt-1 uppercase font-semibold">
                  {{ orderData.fulfillment === 'delivery' ? 'Delivery' : 'Self Pickup' }}
                </span>
              </div>
            </div>
            <div class="flex justify-between items-center w-full text-sm">
              <span class="text-on-surface-variant">Portions</span>
              <span class="font-bold text-on-surface bg-surface-container px-3 py-1 rounded-full">x {{ orderData.qty }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row w-full gap-stack-md">
            <button
              @click="navigateTo('order_status', { order: orderData })"
              class="flex-1 bg-primary text-on-primary font-title-md py-3.5 px-gutter rounded-xl shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-bold cursor-pointer"
            >
              <span class="material-symbols-outlined">route</span>
              <span>Track Order</span>
            </button>
            <button
              @click="navigateTo('food_radar')"
              class="flex-1 bg-surface text-on-surface font-title-md py-3.5 px-gutter rounded-xl shadow-sm border border-outline-variant hover:bg-surface-container active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-semibold cursor-pointer"
            >
              <span class="material-symbols-outlined">home</span>
              <span>Back to Radar</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
