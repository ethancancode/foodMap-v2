<script setup>
import { computed } from 'vue'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

const props = defineProps({
  order: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

function formatVendorName(val) {
  if (!val) return 'Priya Kitchen'
  if (typeof val === 'string') return val
  return val.businessName || val.name || 'Priya Kitchen'
}

const orderData = computed(() => ({
  id: props.order?.id || '#FM1024',
  item: props.order?.item || 'Rajma Chawal',
  vendor: formatVendorName(props.order?.vendorName || props.order?.vendor),
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
    <!-- Reusable AppSidebar -->
    <AppSidebar
      :role="props.currentRole || (props.user ? 'resident' : 'guest')"
      activeRoute="order_status"
      :user="props.user"
      @navigate="navigateTo"
      @logout="navigateTo('welcome')"
    />

    <!-- Content Area -->
    <div class="lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        title="Order Success"
        :show-back="true"
        back-label="Back to Radar"
        back-route="food_radar"
        :show-sync-badge="false"
        @navigate="navigateTo"
      />

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
          <h1 class="font-display-lg text-display-lg text-on-surface mb-stack-sm font-bold">Order Placed!</h1>
          <p class="font-body-lg text-on-surface-variant mb-stack-lg">Your request has been dispatched to {{ orderData.vendor }}.</p>
          
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
