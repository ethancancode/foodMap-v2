<script setup>
import { computed } from 'vue'

const props = defineProps({
  order: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const orderInfo = computed(() => ({
  id: props.order?.id || '#FM1024',
  item: props.order?.item || 'Rajma Chawal',
  vendor: props.order?.vendor || "Anjali's Kitchen",
  qty: props.order?.qty || 2,
  price: props.order?.total || 195
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

    <!-- Main Content Area -->
    <div class="pl-72">
      <header class="fixed top-0 left-72 right-0 h-20 bg-surface/90 backdrop-blur-md z-40 flex items-center px-container-margin justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-4">
          <button
            @click="navigateTo('food_radar')"
            class="flex items-center gap-2 text-on-surface hover:text-primary transition-colors bg-surface-container-high/60 hover:bg-surface-container-high px-4 py-2 rounded-full font-label-md font-semibold"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
            <span>Back to Radar</span>
          </button>
        </div>
      </header>

      <main class="relative pt-20 min-h-screen bg-background">
        <div class="flex flex-col w-full h-full justify-center items-center py-section-gap px-container-margin relative overflow-hidden bg-gradient-to-b from-surface to-background min-h-[calc(100vh-5rem)]">
          <div class="w-full max-w-3xl z-10 flex flex-col items-center">
            
            <div class="flex flex-col items-center text-center mb-section-gap">
              <div class="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-stack-lg shadow-lg relative">
                <span class="material-symbols-outlined text-[48px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
              </div>
              <h1 class="font-display-lg text-headline-lg font-bold text-primary mb-stack-sm tracking-tight">Order Fulfilled</h1>
              <p class="font-body-lg text-on-surface-variant max-w-md text-sm">Hope you loved the homemade meal! Thank you for supporting neighborhood home chefs.</p>
            </div>

            <!-- Order Details Grid -->
            <div class="w-full grid grid-cols-1 md:grid-cols-12 gap-stack-lg mb-section-gap">
              <div class="md:col-span-7 flex flex-col gap-stack-lg">
                <div class="bg-surface-container-lowest rounded-2xl p-stack-lg shadow-sm border border-outline-variant/20 relative overflow-hidden">
                  <div class="flex justify-between items-start mb-stack-md">
                    <div>
                      <span class="font-label-sm text-xs text-on-surface-variant uppercase tracking-widest block mb-1">Order Reference</span>
                      <h2 class="font-headline-lg text-title-md font-bold text-on-surface">{{ orderInfo.id }}</h2>
                    </div>
                    <div class="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                      <span class="font-label-md text-xs text-primary font-bold">Collected</span>
                    </div>
                  </div>

                  <div class="h-px bg-outline-variant/20 w-full my-stack-md"></div>

                  <div class="flex items-center gap-gutter mb-stack-md">
                    <div class="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span class="material-symbols-outlined text-primary text-[28px]">restaurant</span>
                    </div>
                    <div class="flex-1">
                      <h3 class="font-title-md font-bold text-on-surface leading-tight">{{ orderInfo.item }}</h3>
                      <p class="font-body-md text-xs text-on-surface-variant mt-0.5">{{ orderInfo.qty }} portions • {{ orderInfo.vendor }}</p>
                    </div>
                    <span class="font-title-md font-bold text-primary">₹{{ orderInfo.price }}</span>
                  </div>

                  <div class="flex items-center gap-2 text-on-surface-variant font-label-md text-xs bg-surface-container-low p-2 rounded-lg w-fit">
                    <span class="material-symbols-outlined text-[16px]">schedule</span>
                    <span>Completed just now</span>
                  </div>
                </div>

                <!-- Rating CTA -->
                <div class="bg-surface-container-low rounded-2xl p-stack-lg shadow-sm border border-outline-variant/20 text-center">
                  <span class="font-label-md font-bold text-on-surface block mb-2">Rate {{ orderInfo.vendor }}</span>
                  <div class="flex items-center justify-center gap-2 text-[#F59E0B]">
                    <span
                      v-for="star in 5"
                      :key="star"
                      @click="emit('action', { action: 'toast', payload: { message: `Rated ${star} stars!` } })"
                      class="material-symbols-outlined text-[28px] cursor-pointer hover:scale-125 transition-transform"
                      style="font-variation-settings: 'FILL' 1;"
                    >
                      star
                    </span>
                  </div>
                </div>
              </div>

              <!-- Lifecycle Summary -->
              <div class="md:col-span-5 bg-surface-container rounded-2xl p-stack-lg shadow-sm flex flex-col border border-outline-variant/20">
                <h3 class="font-label-sm text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-stack-md">Order Complete</h3>
                <div class="space-y-3 font-body-md text-xs text-on-surface">
                  <div class="flex items-center gap-2 text-green-600 font-semibold">
                    <span class="material-symbols-outlined text-[18px]">check</span>
                    <span>Order Placed</span>
                  </div>
                  <div class="flex items-center gap-2 text-green-600 font-semibold">
                    <span class="material-symbols-outlined text-[18px]">check</span>
                    <span>Accepted by Kitchen</span>
                  </div>
                  <div class="flex items-center gap-2 text-green-600 font-semibold">
                    <span class="material-symbols-outlined text-[18px]">check</span>
                    <span>Prepared & Packed</span>
                  </div>
                  <div class="flex items-center gap-2 text-green-600 font-semibold">
                    <span class="material-symbols-outlined text-[18px]">check</span>
                    <span>Handed Over</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="w-full max-w-xl flex flex-col sm:flex-row gap-gutter">
              <button
                @click="navigateTo('food_radar')"
                class="flex-1 bg-primary text-on-primary font-label-md py-3.5 px-6 rounded-xl shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 font-bold cursor-pointer"
              >
                <span class="material-symbols-outlined text-[20px]">explore</span>
                <span>Explore More Dishes</span>
              </button>
              <button
                @click="navigateTo('order_status')"
                class="flex-1 bg-surface-container-high text-on-surface font-label-md py-3.5 px-6 rounded-xl hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2 font-semibold cursor-pointer border border-outline-variant/20"
              >
                <span class="material-symbols-outlined text-[20px]">receipt_long</span>
                <span>View My Orders</span>
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  </div>
</template>
