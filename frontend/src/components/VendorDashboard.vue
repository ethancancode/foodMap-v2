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
import { getCookingCountdown, currentTimestamp } from '../utils/countdown.js'

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

let unsubAvail, unsubNewOrder, unsubOrderStatus, unsubFoodNew, unsubFoodDel

async function loadVendorData() {
  try {
    isLoading.value = true
    const myVendorRes = await vendorApi.getMyProfile().catch(() => null)
    if (myVendorRes?.vendor) {
      vendorProfile.value = myVendorRes.vendor
    }
    const vendorId = vendorProfile.value?._id || vendorProfile.value?.id

    const [foodsRes, ordersRes] = await Promise.all([
      vendorId ? foodApi.getFoods({ vendor: vendorId }) : { foods: [] },
      vendorId ? orderApi.getOrders({ vendor: vendorId }).catch(() => null) : orderApi.getOrders().catch(() => null)
    ])

    const rawListings = foodsRes?.foods || foodsRes?.data || []
    listings.value = rawListings.map((item) => ({
      ...item,
      available: item.available !== undefined ? item.available : true,
      isAvailable: isItemAvailable(item)
    }))
    let orders = ordersRes?.orders || ordersRes?.data || []
    const ACTIVE_STATUSES = ['pending', 'placed', 'accepted', 'preparing', 'ready_for_pickup']
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
    const vendorId = vendorProfile.value?._id || vendorProfile.value?.id
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
const isSavingDish = ref(false)
const editFileInput = ref(null)

const categories = ['Main Course', 'Snacks', 'Breakfast', 'Dessert', 'Beverages', 'Specialty']
const cookingTimes = ['Ready now', 'Ready in 15 mins', 'Ready in 30 mins', 'Ready in 45 mins', 'Pre-order tomorrow']

const editForm = ref({
  id: '',
  name: '',
  description: '',
  price: 0,
  quantity: 1,
  category: 'Main Course',
  cookingStatus: 'Ready now',
  image: '',
  customHours: '',
  customMinutes: ''
})

function openEditModal(dish) {
  const rawStatus = (dish.cookingStatus || dish.time || 'Ready now').trim()
  let matchedStatus = 'Ready now'
  let ch = ''
  let cm = ''

  if (/^(ready\s*now|now)$/i.test(rawStatus)) {
    matchedStatus = 'Ready now'
  } else if (/15\s*min/i.test(rawStatus)) {
    matchedStatus = 'Ready in 15 mins'
  } else if (/30\s*min/i.test(rawStatus)) {
    matchedStatus = 'Ready in 30 mins'
  } else if (/45\s*min/i.test(rawStatus)) {
    matchedStatus = 'Ready in 45 mins'
  } else {
    matchedStatus = 'Custom'
    const hrMatch = rawStatus.match(/(\d+)\s*(?:hr|hour|h)/i)
    const minMatch = rawStatus.match(/(\d+)\s*(?:min|m)/i)
    ch = hrMatch ? parseInt(hrMatch[1]) : ''
    cm = minMatch ? parseInt(minMatch[1]) : ''
  }

  editForm.value = {
    id: dish._id || dish.id,
    name: dish.name || '',
    description: dish.description || dish.desc || '',
    price: dish.price || 0,
    quantity: dish.quantity !== undefined ? Number(dish.quantity) : 1,
    category: dish.category || 'Main Course',
    cookingStatus: matchedStatus,
    image: dish.image || '',
    customHours: ch,
    customMinutes: cm
  }
  isEditModalOpen.value = true
}

function closeEditModal() {
  isEditModalOpen.value = false
}

function triggerImageUpload() {
  if (editFileInput.value) {
    editFileInput.value.click()
  }
}

function handleImageChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    emit('action', { action: 'toast', payload: { message: 'Dish photo should be under 5MB' } })
    return
  }
  const reader = new FileReader()
  reader.onload = (event) => {
    editForm.value.image = event.target.result
  }
  reader.readAsDataURL(file)
}

function adjustEditPortion(delta) {
  editForm.value.quantity = Math.max(0, Number(editForm.value.quantity || 0) + delta)
}

async function saveDish() {
  if (!editForm.value.name?.trim()) {
    emit('action', { action: 'toast', payload: { message: 'Please provide a dish name' } })
    return
  }
  if (editForm.value.price === undefined || editForm.value.price === null || Number(editForm.value.price) < 0) {
    emit('action', { action: 'toast', payload: { message: 'Please provide a valid price' } })
    return
  }

  isSavingDish.value = true
  try {
    const qty = Number(editForm.value.quantity) || 0
    let finalStatus = editForm.value.cookingStatus
    if (finalStatus === 'Custom') {
      const h = parseInt(editForm.value.customHours) || 0
      const m = parseInt(editForm.value.customMinutes) || 0
      if (h > 0 && m > 0) finalStatus = `Ready in ${h} hr ${m} mins`
      else if (h > 0) finalStatus = `Ready in ${h} hr`
      else if (m > 0) finalStatus = `Ready in ${m} mins`
      else finalStatus = 'Ready soon'
    }

    let readyAt = null
    if (editForm.value.cookingStatus === 'Ready in 15 mins') readyAt = new Date(Date.now() + 15 * 60 * 1000)
    else if (editForm.value.cookingStatus === 'Ready in 30 mins') readyAt = new Date(Date.now() + 30 * 60 * 1000)
    else if (editForm.value.cookingStatus === 'Ready in 45 mins') readyAt = new Date(Date.now() + 45 * 60 * 1000)
    else if (editForm.value.cookingStatus === 'Custom') {
      const h = parseInt(editForm.value.customHours) || 0
      const m = parseInt(editForm.value.customMinutes) || 0
      const totalM = h * 60 + m
      if (totalM > 0) readyAt = new Date(Date.now() + totalM * 60 * 1000)
    }

    const payload = {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim(),
      price: Number(editForm.value.price),
      quantity: qty,
      category: editForm.value.category,
      cookingStatus: finalStatus,
      timeReady: finalStatus,
      readyAt: readyAt ? readyAt.toISOString() : null,
      image: editForm.value.image,
      available: qty > 0,
      isAvailable: qty > 0
    }

    await foodApi.updateFood(editForm.value.id, payload)

    const idx = listings.value.findIndex((d) => d._id === editForm.value.id || d.id === editForm.value.id)
    if (idx !== -1) {
      listings.value[idx] = {
        ...listings.value[idx],
        ...payload
      }
    }

    emit('action', {
      action: 'toast',
      payload: { message: `🎉 ${payload.name} updated successfully!` }
    })
    closeEditModal()
  } catch (err) {
    console.error('Failed to update dish:', err)
    const msg = err.response?.data?.message || err.message || 'Failed to update dish'
    emit('action', { action: 'toast', payload: { message: msg } })
  } finally {
    isSavingDish.value = false
  }
}

async function handleDeleteDish(dishId) {
  if (!confirm('Are you sure you want to remove this dish from your kitchen radar?')) return
  try {
    await foodApi.deleteFood(dishId)
    listings.value = listings.value.filter((d) => d._id !== dishId && d.id !== dishId)
    emit('action', { action: 'toast', payload: { message: 'Dish removed successfully' } })
    closeEditModal()
  } catch (err) {
    emit('action', { action: 'toast', payload: { message: 'Failed to delete dish' } })
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
          @click="openLatestOrder(); isMobileSidebarOpen = false"
          class="w-full flex items-center justify-between px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all cursor-pointer"
        >
          <div class="flex items-center">
            <span class="material-symbols-outlined mr-gutter">notifications_active</span>
            <span class="font-label-md">Incoming Orders</span>
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
            {{ (vendorProfile?.businessName || props.user?.vendor?.businessName || props.user?.name || 'P').charAt(0).toUpperCase() }}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-label-md text-on-surface leading-normal text-xs font-bold truncate">{{ vendorProfile?.businessName || props.user?.vendor?.businessName || props.user?.name || "Priya Kitchen" }}</span>
          </div>
        </div>

        <button
          @click="navigateTo('welcome'); isMobileSidebarOpen = false"
          class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-medium transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">logout</span>
          <span>Sign Out</span>
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
            @click="openLatestOrder"
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
                    Good day, {{ props.user?.name || vendorProfile?.ownerName || 'Chef' }}
                  </h1>
                  <div class="flex items-center gap-2 flex-wrap mt-0.5">
                    <p class="text-xs text-on-surface-variant">
                      Managing {{ vendorProfile?.businessName || props.user?.vendor?.businessName || "Priya Kitchen" }}<template v-if="vendorProfile?.location?.pickupAddress"> • {{ vendorProfile.location.pickupAddress }}</template>
                    </p>
                    <span v-if="vendorProfile?.experience" class="text-[11px] bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                      <span class="material-symbols-outlined text-[13px]">military_tech</span>
                      {{ vendorProfile.experience }}
                    </span>
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

              <!-- Incoming Orders Notification Bar (only shown when there are active, non-completed orders AND active dishes) -->
              <section v-if="activeOrdersList.length > 0 && listings.length > 0" class="w-full bg-surface-container-lowest border border-primary/25 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
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
                        Orders are auto-confirmed. Tap any order below to track cooking & readiness milestones.
                      </p>
                    </div>
                  </div>
                  <span class="text-[11px] font-bold text-primary hidden md:inline">
                    Tap order to view milestones →
                  </span>
                </div>

                <!-- Notification Bar with Listed Orders -->
                <div class="divide-y divide-outline-variant/15 flex flex-col">
                  <div
                    v-for="order in activeOrdersList.slice(0, 5)"
                    :key="order._id || order.id || order.orderNumber"
                    @click="navigateTo('new_order', { order })"
                    class="group py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container/40 px-3 -mx-2 rounded-2xl transition-all cursor-pointer border border-transparent hover:border-primary/20"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:bg-primary group-hover:text-on-primary transition-colors shrink-0">
                        <span class="material-symbols-outlined text-[18px]">dinner_dining</span>
                      </div>
                      <div class="flex flex-col min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-extrabold text-xs sm:text-sm text-on-surface group-hover:text-primary transition-colors truncate">
                            {{ order.orderNumber || '#Order' }} • {{ order.foodName || order.itemSummary || 'Dish Order' }}
                          </span>
                          <span class="text-[10px] font-black px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {{ order.quantity || 1 }} portion{{ (order.quantity || 1) > 1 ? 's' : '' }}
                          </span>
                        </div>
                        <div class="flex items-center gap-2 text-[11px] text-on-surface-variant mt-0.5 flex-wrap">
                          <span>Resident: <strong class="text-on-surface font-semibold">{{ order.residentName || 'Resident' }}</strong></span>
                          <span>•</span>
                          <span class="font-bold text-on-surface">₹{{ order.totalAmount || order.price || 0 }}</span>
                          <template v-if="order.orderType">
                            <span>•</span>
                            <span class="uppercase text-[10px] font-bold tracking-wider">{{ order.orderType }}</span>
                          </template>
                          <template v-if="order.specialInstructions">
                            <span>•</span>
                            <span class="italic truncate max-w-[150px]">"{{ order.specialInstructions }}"</span>
                          </template>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-outline-variant/10">
                      <!-- Status Pill -->
                      <span
                        class="text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                        :class="{
                          'bg-green-100 text-green-800 border border-green-200': ['accepted', 'pending', 'placed'].includes((order.status || '').toLowerCase()),
                          'bg-amber-100 text-amber-800 border border-amber-200': (order.status || '').toLowerCase() === 'preparing',
                          'bg-blue-100 text-blue-800 border border-blue-200': (order.status || '').toLowerCase() === 'ready_for_pickup',
                          'bg-gray-100 text-gray-700': (order.status || '').toLowerCase() === 'completed'
                        }"
                      >
                        <span
                          class="w-1.5 h-1.5 rounded-full"
                          :class="{
                            'bg-green-600 animate-pulse': ['accepted', 'pending', 'placed'].includes((order.status || '').toLowerCase()),
                            'bg-amber-600 animate-pulse': (order.status || '').toLowerCase() === 'preparing',
                            'bg-blue-600': (order.status || '').toLowerCase() === 'ready_for_pickup',
                            'bg-gray-500': (order.status || '').toLowerCase() === 'completed'
                          }"
                        ></span>
                        <span>{{ getOrderStatusLabel(order.status) }}</span>
                      </span>

                      <button
                        class="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1 transition-transform group-hover:translate-x-0.5 shrink-0 cursor-pointer shadow-sm"
                      >
                        <span>View Order</span>
                        <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
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

                <div
                  v-for="item in listings"
                  :key="item._id || item.id"
                  class="flex flex-col bg-surface-container-lowest rounded-2xl shadow-xs hover:shadow-md transition-all overflow-hidden border border-outline-variant/20"
                >
                  <div class="relative w-full aspect-[16/10] bg-surface-container-high overflow-hidden">
                    <img :src="item.image" :alt="item.name" class="w-full h-full object-cover" />
                    <!-- Live Portion Badge -->
                    <div
                      :class="!isItemAvailable(item) ? 'bg-red-600 text-white' : 'bg-surface/95 text-on-surface'"
                      class="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm backdrop-blur-sm flex items-center gap-1.5"
                    >
                      <span :class="!isItemAvailable(item) ? 'bg-white' : 'bg-green-500'" class="w-1.5 h-1.5 rounded-full"></span>
                      <span>{{ !isItemAvailable(item) ? 'Sold Out' : `${item.quantity} portions left` }}</span>
                    </div>

                    <!-- Edit button -->
                    <button
                      @click.stop="openEditModal(item)"
                      class="absolute top-2.5 right-11 w-7 h-7 rounded-full bg-black/60 hover:bg-primary text-white flex items-center justify-center transition-colors cursor-pointer"
                      title="Edit dish"
                    >
                      <span class="material-symbols-outlined text-[15px]">edit</span>
                    </button>

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
                      <h3
                        @click="openEditModal(item)"
                        class="font-bold text-on-surface text-sm line-clamp-1 hover:text-primary transition-colors cursor-pointer"
                        title="Click to edit dish"
                      >
                        {{ item.name }}
                      </h3>
                      <span class="text-sm font-black text-primary shrink-0">₹{{ item.price }}</span>
                    </div>
                    
                    <p class="text-xs text-on-surface-variant flex items-center gap-1">
                      <span class="material-symbols-outlined text-[15px]" :class="countdown(item).isReady ? 'text-green-600' : 'text-primary animate-pulse'">schedule</span>
                      <span :class="countdown(item).isReady ? 'text-green-700 font-bold' : 'text-amber-700 font-bold font-mono'">{{ countdown(item).text }}</span>
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
                        @click="openEditModal(item)"
                        class="py-2 px-3 rounded-xl text-xs bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Edit details"
                      >
                        <span class="material-symbols-outlined text-[15px]">edit</span>
                        <span>Edit</span>
                      </button>
                      <button
                        @click="toggleSoldOut(item)"
                        :class="!isItemAvailable(item) ? 'bg-green-600/15 text-green-700 font-bold' : 'bg-surface-container text-on-surface font-semibold'"
                        class="flex-1 py-2 px-3 rounded-xl text-xs hover:opacity-80 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span class="material-symbols-outlined text-[16px]">{{ !isItemAvailable(item) ? 'restart_alt' : 'block' }}</span>
                        <span>{{ !isItemAvailable(item) ? 'Re-stock & Go Live' : 'Mark as Sold Out' }}</span>
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

    <!-- Edit Dish Modal -->
    <div
      v-if="isEditModalOpen"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      @click.self="closeEditModal"
    >
      <div
        class="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col p-5 sm:p-6 gap-5 my-auto"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div class="flex flex-col">
            <h3 class="text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[22px]">edit_note</span>
              <span>Edit Dish Details</span>
            </h3>
            <span class="text-xs text-on-surface-variant">Update photo, portions, pricing & recipe info</span>
          </div>
          <button
            @click="closeEditModal"
            class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Dish Image Preview & Upload -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Dish Photo</label>
          <div class="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-surface-variant border border-outline-variant/30 group">
            <img
              v-if="editForm.image"
              :src="editForm.image"
              :alt="editForm.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex flex-col items-center justify-center text-on-surface-variant">
              <span class="material-symbols-outlined text-[36px] mb-1">restaurant</span>
              <span class="text-xs">No photo available</span>
            </div>

            <!-- Upload overlay button -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                @click="triggerImageUpload"
                class="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[16px]">photo_camera</span>
                <span>Change Photo</span>
              </button>
              <button
                v-if="editForm.image"
                type="button"
                @click="editForm.image = ''"
                class="px-3 py-2 rounded-xl bg-red-600/90 text-white text-xs font-bold shadow-md hover:bg-red-600 transition-all flex items-center gap-1 cursor-pointer"
                title="Remove photo"
              >
                <span class="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          </div>
          <input
            ref="editFileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleImageChange"
          />
          <div class="flex items-center justify-between">
            <button
              type="button"
              @click="triggerImageUpload"
              class="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span class="material-symbols-outlined text-[15px]">upload</span>
              <span>Upload new photo from device</span>
            </button>
            <span class="text-[11px] text-on-surface-variant">JPG, PNG up to 5MB</span>
          </div>
        </div>

        <!-- Dish Name -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Dish Name</label>
          <input
            v-model="editForm.name"
            type="text"
            placeholder="e.g. Homemade Dal Pakwan"
            class="w-full px-3.5 py-2.5 bg-surface border border-outline-variant/40 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary transition-colors text-on-surface"
          />
        </div>

        <!-- Price & Portions Grid -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Price -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Price (₹)</label>
            <div class="relative flex items-center">
              <span class="absolute left-3.5 text-sm font-bold text-on-surface-variant">₹</span>
              <input
                v-model.number="editForm.price"
                type="number"
                min="0"
                step="5"
                placeholder="120"
                class="w-full pl-8 pr-3 py-2 bg-surface border border-outline-variant/40 rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-colors text-on-surface"
              />
            </div>
          </div>

          <!-- Portions Stepper -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Live Portions</label>
            <div class="flex items-center justify-between p-1 bg-surface border border-outline-variant/40 rounded-xl h-[38px]">
              <button
                type="button"
                @click="adjustEditPortion(-1)"
                :disabled="editForm.quantity <= 0"
                class="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center font-bold text-sm disabled:opacity-30 cursor-pointer"
              >
                -
              </button>
              <input
                v-model.number="editForm.quantity"
                type="number"
                min="0"
                class="w-12 text-center text-sm font-black text-primary bg-transparent focus:outline-none"
              />
              <button
                type="button"
                @click="adjustEditPortion(1)"
                class="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <!-- Category & Cooking Time -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Category -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Category</label>
            <select
              v-model="editForm.category"
              class="w-full px-3 py-2 bg-surface border border-outline-variant/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary transition-colors text-on-surface cursor-pointer"
            >
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>

          <!-- Cooking Status / Time -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Serving Status</label>
            <select
              v-model="editForm.cookingStatus"
              class="w-full px-3 py-2 bg-surface border border-outline-variant/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary transition-colors text-on-surface cursor-pointer"
            >
              <option value="Ready now">Now (Ready now)</option>
              <option value="Ready in 15 mins">15 mins (Ready in 15 mins)</option>
              <option value="Ready in 30 mins">30 mins (Ready in 30 mins)</option>
              <option value="Ready in 45 mins">45 mins (Ready in 45 mins)</option>
              <option value="Custom">Custom...</option>
            </select>

            <!-- Custom Hours & Mins Input (shown when Custom is selected in dropdown) -->
            <div v-if="editForm.cookingStatus === 'Custom'" class="flex items-center gap-2 p-2 bg-surface-container rounded-xl border border-outline-variant/30 mt-1.5">
              <span class="text-xs font-bold text-on-surface-variant flex items-center gap-1 shrink-0">
                <span class="material-symbols-outlined text-[15px] text-primary">timer</span>
                <span class="text-[11px]">Set:</span>
              </span>
              <div class="flex items-center gap-1 bg-surface border border-outline-variant/40 rounded-lg px-2 py-1 flex-1 focus-within:border-primary">
                <input
                  v-model.number="editForm.customHours"
                  type="number"
                  min="0"
                  max="24"
                  placeholder="Hours"
                  class="w-full bg-transparent text-center font-bold text-xs text-on-surface focus:outline-none"
                />
                <span class="text-[10px] font-bold text-on-surface-variant">hr</span>
              </div>
              <span class="text-xs font-bold text-on-surface-variant">:</span>
              <div class="flex items-center gap-1 bg-surface border border-outline-variant/40 rounded-lg px-2 py-1 flex-1 focus-within:border-primary">
                <input
                  v-model.number="editForm.customMinutes"
                  type="number"
                  min="0"
                  max="59"
                  placeholder="Mins"
                  class="w-full bg-transparent text-center font-bold text-xs text-on-surface focus:outline-none"
                />
                <span class="text-[10px] font-bold text-on-surface-variant">min</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Description & Ingredients</label>
          <textarea
            v-model="editForm.description"
            rows="3"
            placeholder="Describe the flavors, spices, or special preparation..."
            class="w-full p-3 bg-surface border border-outline-variant/40 rounded-xl text-xs font-medium focus:outline-none focus:border-primary transition-colors text-on-surface resize-none"
          ></textarea>
        </div>

        <!-- Modal Actions -->
        <div class="flex items-center justify-between pt-3 border-t border-outline-variant/20 gap-3">
          <button
            type="button"
            @click="handleDeleteDish(editForm.id)"
            class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-600/10 text-xs font-bold transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[17px]">delete</span>
            <span>Delete Dish</span>
          </button>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="closeEditModal"
              class="px-4 py-2 rounded-xl border border-outline-variant/40 text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="isSavingDish"
              @click="saveDish"
              class="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span v-if="isSavingDish" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span v-else class="material-symbols-outlined text-[16px]">save</span>
              <span>{{ isSavingDish ? 'Saving...' : 'Save Changes' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
