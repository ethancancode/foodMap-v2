<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { foodApi, orderApi, vendorApi } from '../services/api.js'
import {
  onFoodAvailabilityUpdated,
  onFoodNewPosted,
  onFoodUpdated,
  onFoodDeleted,
  onNewIncomingOrder,
  onOrderStatusChanged
} from '../services/socket.js'

const props = defineProps({
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const listings = ref([])
const incomingOrders = ref([])
const isLoading = ref(true)
const vendorProfile = ref(null)
const isMobileSidebarOpen = ref(false)

const pendingOrdersCount = computed(() => {
  return incomingOrders.value.filter((o) => o.status === 'placed' || o.status === 'accepted' || o.status === 'preparing').length
})

const totalPortionsActive = computed(() => {
  return listings.value.reduce((acc, item) => acc + (item.isAvailable ? (item.quantity || 0) : 0), 0)
})

let unsubAvail, unsubNewOrder, unsubOrderStatus, unsubFoodNew, unsubFoodDel

async function loadVendorData() {
  try {
    isLoading.value = true
    const [foodsRes, ordersRes, vendorsRes] = await Promise.all([
      foodApi.getFoods(),
      orderApi.getOrders(),
      vendorApi.getVendors()
    ])

    if (foodsRes?.foods) {
      listings.value = foodsRes.foods
    }
    if (ordersRes?.orders) {
      incomingOrders.value = ordersRes.orders
    }
    if (vendorsRes?.vendors?.length > 0) {
      vendorProfile.value = vendorsRes.vendors[0]
    }
  } catch (err) {
    console.error('Vendor data loading error:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await loadVendorData()

  // Real-time listener: Food portions or availability update
  unsubAvail = onFoodAvailabilityUpdated((data) => {
    const idx = listings.value.findIndex((f) => f._id === data.foodId || f.id === data.foodId)
    if (idx !== -1) {
      listings.value[idx].quantity = data.quantity
      listings.value[idx].isAvailable = data.isAvailable
      listings.value[idx].status = data.status
    }
  })

  // Real-time listener: New incoming order from resident
  unsubNewOrder = onNewIncomingOrder((newOrder) => {
    incomingOrders.value.unshift(newOrder)
    emit('action', {
      action: 'toast',
      payload: { message: `🔔 New Order #${newOrder.orderNumber}! ${newOrder.foodName} (x${newOrder.quantity})` }
    })
  })

  // Real-time listener: Order status update
  unsubOrderStatus = onOrderStatusChanged((data) => {
    const idx = incomingOrders.value.findIndex((o) => o._id === data.orderId || o.orderNumber === data.orderNumber)
    if (idx !== -1) {
      incomingOrders.value[idx].status = data.status
    }
  })

  // Real-time listener: New food added
  unsubFoodNew = onFoodNewPosted((food) => {
    if (!listings.value.some((f) => f._id === food._id)) {
      listings.value.unshift(food)
    }
  })

  // Real-time listener: Food deleted
  unsubFoodDel = onFoodDeleted((data) => {
    listings.value = listings.value.filter((f) => f._id !== data.foodId)
  })
})

onUnmounted(() => {
  if (unsubAvail) unsubAvail()
  if (unsubNewOrder) unsubNewOrder()
  if (unsubOrderStatus) unsubOrderStatus()
  if (unsubFoodNew) unsubFoodNew()
  if (unsubFoodDel) unsubFoodDel()
})

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

function toggleRole() {
  emit('role-switch', 'resident')
}

async function adjustPortion(item, delta) {
  const newQty = Math.max(0, (item.quantity || 0) + delta)
  try {
    const res = await foodApi.updateFood(item._id || item.id, {
      quantity: newQty,
      isAvailable: newQty > 0
    })
    if (res?.food) {
      const idx = listings.value.findIndex((f) => f._id === res.food._id)
      if (idx !== -1) listings.value[idx] = res.food
    }
    emit('action', {
      action: 'toast',
      payload: { message: `Updated portions for ${item.name} to ${newQty}` }
    })
  } catch (e) {
    console.error('Failed to update portion:', e)
  }
}

async function toggleSoldOut(item) {
  const newAvailable = !item.isAvailable
  const newQty = newAvailable ? (item.initialQuantity || 8) : 0
  try {
    const res = await foodApi.updateFood(item._id || item.id, {
      isAvailable: newAvailable,
      quantity: newQty,
      status: newAvailable ? 'ready' : 'sold_out'
    })
    if (res?.food) {
      const idx = listings.value.findIndex((f) => f._id === res.food._id)
      if (idx !== -1) listings.value[idx] = res.food
    }
    emit('action', {
      action: 'toast',
      payload: { message: newAvailable ? `${item.name} is now back live on radar!` : `${item.name} marked as sold out` }
    })
  } catch (e) {
    console.error('Failed to toggle sold out:', e)
  }
}

async function deleteFoodItem(item) {
  if (!confirm(`Are you sure you want to remove ${item.name}?`)) return
  try {
    await foodApi.deleteFood(item._id || item.id)
    listings.value = listings.value.filter((f) => f._id !== (item._id || item.id))
    emit('action', {
      action: 'toast',
      payload: { message: `${item.name} removed from radar` }
    })
  } catch (e) {
    console.error('Failed to delete food:', e)
  }
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
        <button @click="navigateTo('vendor_dashboard'); isMobileSidebarOpen = false" class="flex items-center gap-base text-left cursor-pointer">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-on-primary">soup_kitchen</span>
          </div>
          <div class="flex flex-col">
            <span class="font-headline-lg text-title-md tracking-tight text-primary font-bold">FoodMap</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Vendor & Cook Portal</span>
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
          @click="navigateTo('vendor_dashboard'); isMobileSidebarOpen = false"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg transition-all bg-primary text-on-primary font-bold shadow-sm cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">dashboard</span>
          <span class="font-label-md">Kitchen Hub</span>
        </button>
        <button
          @click="navigateTo('post_new_food'); isMobileSidebarOpen = false"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">add_circle</span>
          <span class="font-label-md">Post New Food</span>
        </button>
        <button
          @click="navigateTo('new_order'); isMobileSidebarOpen = false"
          class="w-full flex items-center justify-between px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all cursor-pointer"
        >
          <div class="flex items-center">
            <span class="material-symbols-outlined mr-gutter">notifications_active</span>
            <span class="font-label-md">Live Orders</span>
          </div>
          <span v-if="pendingOrdersCount > 0" class="w-5 h-5 bg-primary text-on-primary text-[10px] font-bold rounded-full flex items-center justify-center">
            {{ pendingOrdersCount }}
          </span>
        </button>
        <button
          @click="navigateTo('vendor_profile'); isMobileSidebarOpen = false"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">storefront</span>
          <span class="font-label-md">Kitchen Profile</span>
        </button>
      </nav>

      <!-- Sidebar Footer -->
      <div class="px-base py-stack-lg border-t border-outline-variant/20 space-y-stack-sm">
        <div
          @click="navigateTo('vendor_profile'); isMobileSidebarOpen = false"
          class="w-full flex items-center gap-gutter px-gutter py-stack-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 transition-colors text-left cursor-pointer"
        >
          <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {{ vendorProfile?.ownerName?.charAt(0) || 'A' }}
          </div>
          <div class="flex flex-col">
            <span class="font-label-md text-on-surface leading-none text-xs font-bold">{{ vendorProfile?.kitchenName || "Anjali's Kitchen" }}</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">Verified Home Chef</span>
          </div>
        </div>

        <button
          @click="navigateTo('welcome'); isMobileSidebarOpen = false"
          class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-medium transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">logout</span>
          <span>Switch Account</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="pl-0 lg:pl-72">
      <!-- Header -->
      <header class="fixed top-0 left-0 lg:left-72 right-0 h-16 lg:h-20 bg-surface/90 backdrop-blur-xl z-40 flex items-center px-3 sm:px-container-margin justify-between border-b border-outline-variant/20 gap-2">
        <div class="flex items-center gap-2">
          <!-- Mobile Drawer Toggle -->
          <button
            @click="isMobileSidebarOpen = true"
            class="lg:hidden p-2 rounded-xl text-on-surface hover:bg-surface-container-high focus:outline-none shrink-0"
            aria-label="Open menu"
          >
            <span class="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <span class="font-title-md font-bold text-on-surface text-sm sm:text-base">Kitchen Management</span>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
          <!-- MongoDB Atlas Live Connection Badge (hidden on smallest screens) -->
          <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 text-[11px] font-semibold">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span>Live Sync</span>
          </div>

          <button
            @click="navigateTo('new_order')"
            class="relative p-2 hover:bg-surface-container rounded-full text-on-surface-variant cursor-pointer"
            title="Incoming orders"
          >
            <span class="material-symbols-outlined text-[22px]">notifications</span>
            <span v-if="pendingOrdersCount > 0" class="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full animate-ping"></span>
          </button>

          <button
            @click="navigateTo('post_new_food')"
            class="flex items-center gap-1 bg-primary hover:bg-primary/90 text-on-primary px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl cursor-pointer transition-all shadow-sm text-xs font-bold shrink-0"
          >
            <span class="material-symbols-outlined text-[16px] sm:text-[18px]">add_circle</span>
            <span>Post Food</span>
          </button>
        </div>
      </header>

      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background">
        <div class="flex flex-col w-full">
          <div class="flex flex-col gap-5 px-4 sm:px-container-margin pb-section-gap max-w-5xl mx-auto w-full pt-4 sm:pt-6">
            
            <!-- Welcome & Stats Banner -->
            <section class="flex flex-col gap-4 relative z-10 w-full">
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
                <div class="flex flex-col">
                  <h1 class="text-xl sm:text-2xl lg:text-3xl font-extrabold text-on-surface tracking-tight">
                    Good day, {{ vendorProfile?.ownerName || 'Anjali' }}
                  </h1>
                  <p class="text-xs text-on-surface-variant mt-0.5">
                    Managing {{ vendorProfile?.kitchenName || "Anjali's Kitchen" }} • Bhandup West
                  </p>
                </div>
                <div class="flex gap-2 w-full sm:w-auto">
                  <div class="flex-1 sm:flex-initial bg-surface-container-lowest px-3.5 py-2 rounded-2xl border border-outline-variant/20 flex flex-col items-center">
                    <span class="text-[11px] text-on-surface-variant font-bold">Active Portions</span>
                    <span class="text-base sm:text-lg font-black text-primary">{{ totalPortionsActive }}</span>
                  </div>
                  <div class="flex-1 sm:flex-initial bg-surface-container-lowest px-3.5 py-2 rounded-2xl border border-outline-variant/20 flex flex-col items-center">
                    <span class="text-[11px] text-on-surface-variant font-bold">Pending Orders</span>
                    <span class="text-base sm:text-lg font-black text-amber-600">{{ pendingOrdersCount }}</span>
                  </div>
                </div>
              </div>

              <!-- Incoming Order Alert Banner if any orders waiting -->
              <div
                v-if="pendingOrdersCount > 0"
                @click="navigateTo('new_order')"
                class="w-full bg-primary/10 border border-primary/30 hover:bg-primary/15 transition-colors rounded-2xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer shadow-sm"
              >
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center animate-bounce shrink-0">
                    <span class="material-symbols-outlined text-[18px]">receipt_long</span>
                  </div>
                  <div>
                    <span class="font-bold text-on-surface text-xs sm:text-sm block">{{ pendingOrdersCount }} Active Order(s) In Progress!</span>
                    <span class="text-[11px] sm:text-xs text-on-surface-variant">Tap to view live customer orders & update kitchen preparation milestones</span>
                  </div>
                </div>
                <span class="material-symbols-outlined text-primary text-[20px]">arrow_forward</span>
              </div>

              <!-- Hero Post Food CTA -->
              <button
                @click="navigateTo('post_new_food')"
                class="group relative w-full overflow-hidden rounded-3xl bg-primary text-on-primary shadow-md hover:shadow-lg transition-all duration-300 transform active:scale-[0.99] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 text-center sm:text-left min-h-[120px] sm:min-h-[140px] cursor-pointer"
              >
                <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-md shadow-inner">
                  <span class="material-symbols-outlined text-[28px] sm:text-[32px] text-white">add</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xl sm:text-2xl font-extrabold text-white leading-tight">Post fresh food cooking now</span>
                  <span class="text-xs text-white/90 mt-1 font-medium">Broadcast your small batch menu to neighbours on the live radar immediately.</span>
                </div>
              </button>
            </section>

            <!-- Active Listings Section -->
            <section class="flex flex-col gap-3 relative z-10 w-full mt-1">
              <div class="flex items-center justify-between">
                <div>
                  <h2 class="text-base sm:text-lg font-extrabold text-on-surface">Your Live Radar Batches</h2>
                  <span class="text-xs text-on-surface-variant">All updates sync in real-time across residents</span>
                </div>
                <div class="flex items-center gap-1.5 text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full text-xs font-bold">
                  <span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  <span>{{ listings.length }} Dishes</span>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
                <div
                  v-for="item in listings"
                  :key="item._id || item.id"
                  class="flex flex-col bg-surface-container-lowest rounded-2xl shadow-xs hover:shadow-md transition-all overflow-hidden border border-outline-variant/20"
                >
                  <div class="relative w-full aspect-[16/10] bg-surface-container-high overflow-hidden">
                    <img :src="item.image" :alt="item.name" class="w-full h-full object-cover" />
                    <!-- Live Portion Badge -->
                    <div
                      :class="!item.isAvailable || item.quantity <= 0 ? 'bg-red-600 text-white' : 'bg-surface/95 text-on-surface'"
                      class="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm backdrop-blur-sm flex items-center gap-1.5"
                    >
                      <span :class="!item.isAvailable || item.quantity <= 0 ? 'bg-white' : 'bg-green-500'" class="w-1.5 h-1.5 rounded-full"></span>
                      <span>{{ !item.isAvailable || item.quantity <= 0 ? 'Sold Out' : `${item.quantity} portions left` }}</span>
                    </div>

                    <!-- Delete button -->
                    <button
                      @click.stop="deleteFoodItem(item)"
                      class="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete dish"
                    >
                      <span class="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>

                  <div class="p-3.5 sm:p-4 flex flex-col flex-1 gap-2.5">
                    <div class="flex justify-between items-start gap-2">
                      <h3 class="font-bold text-on-surface text-sm line-clamp-1">{{ item.name }}</h3>
                      <span class="text-sm font-black text-primary shrink-0">₹{{ item.price }}</span>
                    </div>
                    
                    <p class="text-xs text-on-surface-variant flex items-center gap-1">
                      <span class="material-symbols-outlined text-[15px] text-primary">schedule</span>
                      <span>{{ item.cookingStatus || 'Ready now' }}</span>
                      <span class="mx-1">•</span>
                      <span>{{ item.category || 'Main Course' }}</span>
                    </p>

                    <!-- Real-time Quantity Quick Stepper -->
                    <div class="flex items-center justify-between p-2 bg-surface-container rounded-xl">
                      <span class="text-xs font-bold text-on-surface-variant">Live Portions:</span>
                      <div class="flex items-center gap-2">
                        <button
                          @click="adjustPortion(item, -1)"
                          :disabled="item.quantity <= 0"
                          class="w-7 h-7 rounded-lg bg-surface flex items-center justify-center text-on-surface hover:bg-surface-variant font-bold text-xs disabled:opacity-30 cursor-pointer shadow-sm"
                        >
                          -
                        </button>
                        <span class="font-black text-xs text-primary w-6 text-center">{{ item.quantity || 0 }}</span>
                        <button
                          @click="adjustPortion(item, 1)"
                          class="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-xs cursor-pointer shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div class="mt-auto pt-2 flex gap-2 border-t border-outline-variant/10">
                      <button
                        @click="toggleSoldOut(item)"
                        :class="!item.isAvailable || item.quantity <= 0 ? 'bg-green-600/15 text-green-700 font-bold' : 'bg-surface-container text-on-surface font-semibold'"
                        class="w-full py-2 px-3 rounded-xl text-xs hover:opacity-80 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span class="material-symbols-outlined text-[16px]">{{ !item.isAvailable || item.quantity <= 0 ? 'restart_alt' : 'block' }}</span>
                        <span>{{ !item.isAvailable || item.quantity <= 0 ? 'Re-stock & Go Live' : 'Mark as Sold Out' }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>

    <!-- Mobile Bottom Navigation Bar -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 z-50 flex items-center justify-around px-2 shadow-lg">
      <button
        @click="navigateTo('vendor_dashboard')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">dashboard</span>
        <span class="text-[10px] font-bold mt-0.5">Kitchen</span>
      </button>
      <button
        @click="navigateTo('post_new_food')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">add_circle</span>
        <span class="text-[10px] font-semibold mt-0.5">Post Dish</span>
      </button>
      <button
        @click="navigateTo('new_order')"
        class="relative flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">notifications_active</span>
        <span v-if="pendingOrdersCount > 0" class="absolute top-0.5 right-1/4 w-2 h-2 bg-primary rounded-full animate-ping"></span>
        <span class="text-[10px] font-semibold mt-0.5">Orders</span>
      </button>
      <button
        @click="navigateTo('vendor_profile')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">storefront</span>
        <span class="text-[10px] font-semibold mt-0.5">Profile</span>
      </button>
    </nav>
  </div>
</template>
