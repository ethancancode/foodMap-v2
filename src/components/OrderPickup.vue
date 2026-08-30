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
  item: props.order?.item || 'Authentic Rajma Chawal',
  vendor: props.order?.vendor || "Anjali's Kitchen",
  qty: props.order?.qty || 2,
  price: props.order?.total || 195
}))

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

function completePickup() {
  emit('navigate', 'order_completed', { order: orderInfo.value })
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
      <!-- Header -->
      <header class="fixed top-0 left-72 right-0 h-20 bg-surface/90 backdrop-blur-md z-40 flex items-center px-container-margin justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-4">
          <button
            @click="navigateTo('order_status')"
            class="flex items-center gap-2 text-on-surface hover:text-primary transition-colors bg-surface-container-high/60 hover:bg-surface-container-high px-4 py-2 rounded-full font-label-md font-semibold"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
            <span>Back to Status</span>
          </button>
        </div>
        <div class="flex items-center gap-2 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
          <span class="material-symbols-outlined text-[16px]">navigation</span>
          <span>Live Route Navigation</span>
        </div>
      </header>

      <main class="relative pt-20 min-h-screen bg-background">
        <div class="flex flex-col w-full h-[calc(100vh-80px)]">
          <div class="grid grid-cols-1 lg:grid-cols-12 h-full bg-background overflow-hidden relative">
            
            <!-- Left Column: Map Route -->
            <div class="lg:col-span-7 xl:col-span-8 relative h-[40vh] lg:h-full overflow-hidden order-2 lg:order-1">
              <div
                class="w-full h-full bg-cover bg-center"
                style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuDFfHUL4JWMwiBEe31VrFZcI4-j7ZtOXY-hbq6AuniEOhsra2OGFxR98ejAe4_z_jm98YYWJ0DW9tkuruQwIVj6V89izucv7uncvV7u_PwkgbfBXm3VN-AqiEfOB7Wyh6ko3AHLI777gLBKTa5KQTjaHZ0g52h0PFlpDiMsSOYbmbGW62D8Q0K32mbetADsgzgM9j7n129nhUHAKh9GpwQE3HPR1cYtRDSshkDOnzVBkB_GwxOvOYDt')"
              ></div>
              
              <!-- Floating Distance Card -->
              <div class="absolute bottom-stack-lg left-stack-lg bg-surface/95 backdrop-blur-md px-gutter py-base rounded-full shadow-lg flex items-center gap-base border border-outline-variant/20">
                <div class="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
                <span class="font-label-md text-on-surface font-semibold text-sm">420 m away • ~5 min walk</span>
              </div>
            </div>

            <!-- Right Column: Info Panel -->
            <div class="lg:col-span-5 xl:col-span-4 h-full bg-surface overflow-y-auto order-1 lg:order-2 custom-scrollbar shadow-[-8px_0_24px_rgba(0,0,0,0.02)] z-10 relative p-container-margin lg:p-stack-lg flex flex-col justify-between">
              <div class="space-y-stack-lg">
                <div class="flex items-center gap-base">
                  <div class="px-3 py-1 rounded-full bg-primary-container/30 text-on-primary-container font-label-sm inline-flex items-center gap-2 font-semibold text-xs">
                    <span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                    Ready at Kitchen Counter
                  </div>
                </div>

                <h1 class="font-display-lg text-headline-lg font-bold text-on-surface tracking-tight">Pick up your order</h1>
                <p class="font-body-lg text-on-surface-variant text-sm">Your homemade meal is ready. Follow the route to collect directly from the maker.</p>

                <!-- Order Summary -->
                <div class="bg-surface-container-lowest rounded-xl p-gutter shadow-sm border border-outline-variant/20">
                  <div class="flex justify-between items-start mb-stack-md">
                    <span class="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Your order</span>
                    <span class="font-label-md text-xs font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded">{{ orderInfo.id }}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <div>
                      <h3 class="font-title-md font-bold text-on-surface">{{ orderInfo.item }}</h3>
                      <p class="font-body-md text-xs text-on-surface-variant mt-0.5">{{ orderInfo.qty }} portions</p>
                    </div>
                    <span class="font-headline-lg text-title-md text-primary font-bold">₹{{ orderInfo.price }}</span>
                  </div>
                </div>

                <!-- Pickup From -->
                <div class="bg-surface-container-low rounded-xl p-gutter border border-outline-variant/20">
                  <h3 class="font-label-sm text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-stack-md">Pickup Address</h3>
                  <div class="flex items-start gap-gutter">
                    <div class="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                      <span class="material-symbols-outlined text-[20px]">storefront</span>
                    </div>
                    <div>
                      <h4 class="font-title-md font-bold text-on-surface flex items-center gap-2">
                        {{ orderInfo.vendor }}
                        <span class="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[10px]">Home Kitchen</span>
                      </h4>
                      <p class="font-body-md text-xs text-on-surface-variant mt-1">Building B, Flat 402, Bhandup West, Mumbai</p>
                      <div class="flex items-center gap-2 mt-stack-sm text-xs text-on-surface-variant">
                        <span class="material-symbols-outlined text-[14px]">directions_walk</span>
                        <span>420 m away (Ground floor entry, lift available)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Maker Contact -->
                <div class="bg-surface-container-lowest rounded-xl p-gutter shadow-sm flex items-center justify-between border border-outline-variant/20">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">AK</div>
                    <div>
                      <h4 class="font-label-md font-bold text-on-surface">{{ orderInfo.vendor }}</h4>
                      <span class="text-xs text-green-600 font-semibold">Ready for handoff</span>
                    </div>
                  </div>
                  <button
                    @click="emit('action', { action: 'toast', payload: { message: 'Calling kitchen...' } })"
                    class="p-2.5 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors"
                  >
                    <span class="material-symbols-outlined text-primary text-[20px]">call</span>
                  </button>
                </div>
              </div>

              <!-- Pickup Complete Action -->
              <div class="pt-stack-lg mt-auto">
                <button
                  @click="completePickup"
                  class="w-full bg-primary hover:bg-primary/90 text-on-primary font-title-md py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 font-bold cursor-pointer"
                >
                  <span class="material-symbols-outlined">check_circle</span>
                  <span>Confirm Order Received</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  </div>
</template>
