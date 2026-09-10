<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { foodApi, orderApi, vendorApi } from '../services/api.js'
import {
  onFoodAvailabilityUpdated,
  onFoodNewPosted,
  onFoodUpdated,
  onFoodDeleted,
  onNewIncomingOrder,
  onOrderStatusChanged,
  onVendorUpdated,
  onVendorReviewAdded,
  subscribeToVendor
} from '../services/socket.js'
import { getCookingCountdown, currentTimestamp } from '../utils/countdown.js'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'
import VendorFoodCard from '../components/VendorFoodCard.vue'
import VendorIncomingOrderRow from '../components/VendorIncomingOrderRow.vue'
import EditDishModal from '../components/EditDishModal.vue'

// Computed that re-evaluates every second as currentTimestamp ticks
const countdown = computed(() => {
  void currentTimestamp.value // establish reactive dep
  return (item) => getCookingCountdown(item)
})

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

function isItemAvailable(item) {
  if (!item) return false
  const avail = item.isAvailable !== undefined ? item.isAvailable : (item.available !== undefined ? item.available : true)
  return Boolean(avail) && Number(item.quantity) > 0
}

const pendingOrdersCount = computed(() => {
  return incomingOrders.value.filter((o) => {
    const s = (o.status || '').toLowerCase()
    return s === 'pending' || s === 'placed' || s === 'accepted' || s === 'preparing'
  }).length
})

const totalPortionsActive = computed(() => {
  return listings.value.reduce((acc, item) => acc + (isItemAvailable(item) ? (item.quantity || 0) : 0), 0)
})

const activeOrdersList = computed(() => {
  return incomingOrders.value.filter((o) => {
    const s = (o.status || '').toLowerCase()
    return s !== 'completed' && s !== 'cancelled' && s !== 'rejected'
  })
})

function getOrderStatusLabel(status) {
  const s = (status || '').toLowerCase()
  if (s === 'accepted' || s === 'pending' || s === 'placed') return 'Order In'
  if (s === 'preparing') return 'Cooking on Stove'
  if (s === 'ready_for_pickup') return 'Ready for Pickup'
  if (s === 'completed') return 'Completed'
  return status || 'Confirmed'
}

function openLatestOrder() {
  const activeOrder = activeOrdersList.value[0] || incomingOrders.value[0]
  if (activeOrder) {
    navigateTo('new_order', { order: activeOrder })
  } else {
    navigateTo('new_order')
  }
}

let unsubAvail, unsubNewOrder, unsubOrderStatus, unsubFoodNew, unsubFoodDel, unsubVendor, unsubReview

async function loadVendorData() {
  try {
    isLoading.value = true
    const myVendorRes = await vendorApi.getMyProfile().catch(() => null)
    if (myVendorRes?.vendor) {
      vendorProfile.value = myVendorRes.vendor
    }
    const vendorId = vendorProfile.value?._id || vendorProfile.value?.id || props.user?.vendor?._id || props.user?.vendor?.id || props.user?.vendor
    if (vendorId) {
      subscribeToVendor(vendorId)
    }

    const [foodsRes, ordersRes] = await Promise.all([
      vendorId ? foodApi.getFoods({ vendor: vendorId }) : foodApi.getFoods(),
      vendorId ? orderApi.getOrders({ vendor: vendorId }).catch(() => null) : orderApi.getOrders().catch(() => null)
    ])

    const rawListings = foodsRes?.foods || foodsRes?.data || []
    listings.value = rawListings.map((item) => ({
      ...item,
      available: item.available !== undefined ? item.available : true,
      isAvailable: isItemAvailable(item)
    }))
    let orders = ordersRes?.orders || ordersRes?.data || []
    const ACTIVE_STATUSES = ['pending', 'placed', 'accepted', 'preparing', 'ready_for_pickup', 'ready']
    incomingOrders.value = (orders || [])
      .filter((o) => ACTIVE_STATUSES.includes((o.status || '').toLowerCase()))
      .sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()))
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
      const avail = data.isAvailable !== undefined ? data.isAvailable : (data.available !== undefined ? data.available : true)
      listings.value[idx].quantity = data.quantity
      listings.value[idx].available = avail
      listings.value[idx].isAvailable = Boolean(avail) && Number(data.quantity) > 0
      listings.value[idx].status = data.status
    }
  })

  // Real-time listener: New incoming order from resident
  unsubNewOrder = onNewIncomingOrder((newOrder) => {
    const vendorId = vendorProfile.value?._id || vendorProfile.value?.id || props.user?.vendor?._id || props.user?.vendor?.id || props.user?.vendor
    const orderVendorId = newOrder.vendor?._id || newOrder.vendor?.id || newOrder.vendor
    if (vendorId && orderVendorId && String(vendorId) !== String(orderVendorId)) {
      return
    }
    const idx = incomingOrders.value.findIndex(o => (o._id && o._id === newOrder._id) || (o.orderNumber && o.orderNumber === newOrder.orderNumber))
    if (idx !== -1) {
      incomingOrders.value[idx] = newOrder
    } else {
      incomingOrders.value.unshift(newOrder)
    }
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
    const vendorId = vendorProfile.value?._id || vendorProfile.value?.id
    const foodVendorId = food.vendor?._id || food.vendor?.id || food.vendor
    if (vendorId && foodVendorId && String(vendorId) !== String(foodVendorId)) {
      return
    }
    const normalized = {
      ...food,
      available: food.available !== undefined ? food.available : true,
      isAvailable: isItemAvailable(food)
    }
    if (!listings.value.some((f) => f._id === normalized._id)) {
      listings.value.unshift(normalized)
    }
  })

  // Real-time listener: Food deleted
  unsubFoodDel = onFoodDeleted((data) => {
    listings.value = listings.value.filter((f) => f._id !== data.foodId)
  })

  // Real-time listener: Vendor rating or profile updated
  unsubVendor = onVendorUpdated((data) => {
    const updated = data.vendor || data
    const myId = vendorProfile.value?._id || vendorProfile.value?.id
    if (updated && (updated._id === myId || updated.id === myId)) {
      vendorProfile.value = { ...vendorProfile.value, ...updated }
    }
  })

  // Real-time listener: New Review submitted by resident
  unsubReview = onVendorReviewAdded((data) => {
    const myId = vendorProfile.value?._id || vendorProfile.value?.id
    if (data && String(data.vendorId) === String(myId)) {
      if (data.vendor) {
        vendorProfile.value = { ...vendorProfile.value, ...data.vendor }
      }
      emit('action', {
        action: 'toast',
        payload: {
          message: `⭐ New Review Received! ${data.review?.userName || 'A neighbor'} rated your kitchen ${data.review?.rating || 5} ★`
        }
      })
    }
  })
})

onUnmounted(() => {
  if (unsubAvail) unsubAvail()
  if (unsubNewOrder) unsubNewOrder()
  if (unsubOrderStatus) unsubOrderStatus()
  if (unsubFoodNew) unsubFoodNew()
  if (unsubFoodDel) unsubFoodDel()
  if (unsubVendor) unsubVendor()
  if (unsubReview) unsubReview()
})

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

function toggleRole() {
  emit('role-switch', 'resident')
}

async function adjustPortion(item, delta) {
  const newQty = Math.max(0, (item.quantity || 0) + delta)
  const newAvail = newQty > 0
  try {
    const res = await foodApi.updateFood(item._id || item.id, {
      quantity: newQty,
      isAvailable: newAvail,
      available: newAvail
    })
    const updated = res?.food || res?.data || res
    const idx = listings.value.findIndex((f) => f._id === (updated?._id || item._id))
    if (idx !== -1) {
      listings.value[idx] = {
        ...listings.value[idx],
        ...updated,
        quantity: newQty,
        available: newAvail,
        isAvailable: newAvail
      }
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
  const currentActive = isItemAvailable(item)
  const newAvailable = !currentActive
  const newQty = newAvailable ? (item.initialQuantity || 8) : 0
  try {
    const res = await foodApi.updateFood(item._id || item.id, {
      isAvailable: newAvailable,
      available: newAvailable,
      quantity: newQty,
      status: newAvailable ? 'AVAILABLE' : 'SOLD_OUT'
    })
    const updated = res?.food || res?.data || res
    const idx = listings.value.findIndex((f) => f._id === (updated?._id || item._id))
    if (idx !== -1) {
      listings.value[idx] = {
        ...listings.value[idx],
        ...updated,
        isAvailable: newAvailable && newQty > 0,
        available: newAvailable,
        quantity: newQty
      }
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

const isEditModalOpen = ref(false)
const selectedDishForEdit = ref(null)

function openEditModal(dish) {
  selectedDishForEdit.value = dish
  isEditModalOpen.value = true
}

function handleDishSaved(updatedDish) {
  const id = updatedDish._id || updatedDish.id
  const idx = listings.value.findIndex((d) => (d._id && d._id === id) || (d.id && d.id === id))
  if (idx !== -1) {
    listings.value[idx] = {
      ...listings.value[idx],
      ...updatedDish,
    }
  }
}

function handleDishDeleted(dishId) {
  listings.value = listings.value.filter((d) => d._id !== dishId && d.id !== dishId)
}

function handleToast(message) {
  emit('action', { action: 'toast', payload: { message } })
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface pb-20 lg:pb-0">
    <!-- Unified Vendor Sidebar -->
    <AppSidebar
      :is-open="isMobileSidebarOpen"
      role="vendor"
      active-route="vendor_dashboard"
      :user="props.user"
      :vendor-profile="vendorProfile"
      :pending-orders-count="pendingOrdersCount"
      @close="isMobileSidebarOpen = false"
      @navigate="navigateTo"
      @logout="navigateTo('welcome')"
    />

    <!-- Main Content Area -->
    <div class="pl-0 lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        title="Kitchen Management"
        :show-notifications="true"
        :pending-orders-count="pendingOrdersCount"
        :show-post-food-button="true"
        :show-sync-badge="true"
        sync-label="Live Sync"
        @toggle-sidebar="isMobileSidebarOpen = true"
        @open-notifications="openLatestOrder"
        @navigate="navigateTo"
      />

      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background">
        <div class="flex flex-col w-full">
          <div class="flex flex-col gap-5 px-4 sm:px-container-margin pb-section-gap max-w-5xl mx-auto w-full pt-4 sm:pt-6">
            
            <!-- Welcome & Stats Banner -->
            <section class="flex flex-col gap-4 relative z-10 w-full">
              <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
                <div class="flex flex-col">
                  <h1 class="text-xl sm:text-2xl lg:text-3xl font-extrabold text-on-surface tracking-tight">
                    Good day, {{ props.user?.name || vendorProfile?.ownerName || 'Chef' }}
                  </h1>
                  <div class="flex items-center gap-2 flex-wrap mt-0.5">
                    <p class="text-xs text-on-surface-variant">
                      Managing {{ vendorProfile?.businessName || props.user?.vendor?.businessName || "Priya Kitchen" }}<template v-if="vendorProfile?.location?.pickupAddress"> • {{ vendorProfile.location.pickupAddress }}</template>
                    </p>
                    <span class="text-xs text-on-surface-variant/40 hidden sm:inline">•</span>
                    <!-- Dynamic Star Rating & Review Badge -->
                    <div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-2xs cursor-pointer hover:bg-amber-500/15 transition-all"
                      :class="[
                        (vendorProfile?.totalReviews && vendorProfile.totalReviews > 0)
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/25'
                          : 'bg-surface-container text-on-surface-variant border border-outline-variant/30'
                      ]"
                      @click="navigateTo('vendor_profile')"
                      title="View customer reviews in profile"
                    >
                      <span class="material-symbols-outlined text-[15px] text-amber-500" style="font-variation-settings: 'FILL' 1;">star</span>
                      <span v-if="vendorProfile?.totalReviews && vendorProfile.totalReviews > 0">
                        {{ vendorProfile.rating ? vendorProfile.rating.toFixed(1) : '5.0' }} ({{ vendorProfile.totalReviews }} review{{ vendorProfile.totalReviews > 1 ? 's' : '' }})
                      </span>
                      <span v-else>New Kitchen</span>
                    </div>
                  </div>
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

              <!-- Incoming Orders Notification Bar (shown whenever there are active, non-completed orders) -->
              <section v-if="activeOrdersList.length > 0" class="w-full bg-surface-container-lowest border border-primary/25 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                      <span class="material-symbols-outlined text-[20px]">receipt_long</span>
                    </div>
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="text-sm sm:text-base font-extrabold text-on-surface">Incoming Orders Feed</span>
                        <span class="px-2 py-0.5 rounded-full bg-primary text-on-primary text-[10px] font-black uppercase tracking-wider">
                          {{ activeOrdersList.length }} Active
                        </span>
                      </div>
                      <p class="text-[11px] text-on-surface-variant">
                        Orders are auto-confirmed in real-time.
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Notification Bar with Listed Orders -->
                <div class="divide-y divide-outline-variant/15 flex flex-col">
                  <VendorIncomingOrderRow
                    v-for="order in activeOrdersList.slice(0, 5)"
                    :key="order._id || order.id || order.orderNumber"
                    :order="order"
                    @select="navigateTo('new_order', { order })"
                  />
                </div>
              </section>

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
                <!-- Empty State -->
                <div
                  v-if="listings.length === 0"
                  class="col-span-full py-12 px-6 flex flex-col items-center justify-center text-center bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/50"
                >
                  <div class="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <span class="material-symbols-outlined text-[28px]">soup_kitchen</span>
                  </div>
                  <h3 class="text-base font-bold text-on-surface">No Live Food Batches Posted Yet</h3>
                  <p class="text-xs text-on-surface-variant max-w-sm mt-1 mb-4">
                    Ready to start cooking? Tap the button above to broadcast your fresh home meals to nearby residents in real-time.
                  </p>
                  <button
                    @click="navigateTo('post_new_food')"
                    class="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span class="material-symbols-outlined text-[16px]">add_circle</span>
                    <span>Post First Dish</span>
                  </button>
                </div>

                <VendorFoodCard
                  v-for="item in listings"
                  :key="item._id || item.id"
                  :item="item"
                  @edit="openEditModal"
                  @delete="deleteFoodItem"
                  @adjust-portion="({ item, delta }) => adjustPortion(item, delta)"
                  @toggle-sold-out="toggleSoldOut"
                />
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

    <!-- Edit Dish Modal Component -->
    <EditDishModal
      :is-open="isEditModalOpen"
      :dish="selectedDishForEdit"
      @close="isEditModalOpen = false"
      @saved="handleDishSaved"
      @deleted="handleDishDeleted"
      @toast="handleToast"
    />
  </div>
</template>
