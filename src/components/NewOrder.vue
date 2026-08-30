<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { orderApi } from '../services/api.js'
import { onNewIncomingOrder, onOrderStatusChanged } from '../services/socket.js'

const props = defineProps({
  order: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const isAccepting = ref(false)
const ordersList = ref([])
const activeIndex = ref(0)

const currentOrder = computed(() => {
  if (ordersList.value.length > 0 && ordersList.value[activeIndex.value]) {
    const o = ordersList.value[activeIndex.value]
    return {
      _id: o._id,
      id: o.orderNumber || o._id?.slice(-5) || '#8842',
      item: o.foodName || 'Authentic Punjabi Rajma Chawal',
      customer: o.residentName || 'Aryan R.',
      customerPhone: o.residentPhone || '+91 9876543210',
      qty: o.quantity || 2,
      price: o.totalAmount || 160,
      type: o.pickupAddress ? 'Self Pickup' : 'Delivery',
      status: o.status || 'placed',
      time: new Date(o.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: o.specialInstructions || 'None provided'
    }
  }
  return {
    id: '#8842',
    item: 'Authentic Punjabi Rajma Chawal',
    customer: 'Aryan R.',
    customerPhone: '+91 9876543210',
    qty: 2,
    price: 160,
    type: 'Self Pickup',
    status: 'placed',
    time: 'Just now',
    notes: 'Please pack in eco-box'
  }
})

let unsubNew, unsubStatus

onMounted(async () => {
  try {
    const res = await orderApi.getOrders()
    if (res?.orders?.length > 0) {
      ordersList.value = res.orders
    }
  } catch (err) {
    console.error('Failed to load incoming orders:', err)
  }

  unsubNew = onNewIncomingOrder((order) => {
    ordersList.value.unshift(order)
    activeIndex.value = 0
    emit('action', {
      action: 'toast',
      payload: { message: `🔔 New Order #${order.orderNumber} incoming!` }
    })
  })

  unsubStatus = onOrderStatusChanged((data) => {
    const idx = ordersList.value.findIndex((o) => o._id === data.orderId || o.orderNumber === data.orderNumber)
    if (idx !== -1) {
      ordersList.value[idx].status = data.status
    }
  })
})

onUnmounted(() => {
  if (unsubNew) unsubNew()
  if (unsubStatus) unsubStatus()
})

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

async function acceptOrder() {
  isAccepting.value = true
  try {
    const targetId = currentOrder.value._id || currentOrder.value.id
    if (targetId) {
      await orderApi.updateStatus(targetId, 'accepted', 'Accepted by kitchen')
    }
    isAccepting.value = false
    emit('navigate', 'vendor_order_confirmed', { order: currentOrder.value })
  } catch (err) {
    isAccepting.value = false
    console.error('Failed to accept order:', err)
    emit('navigate', 'vendor_order_confirmed', { order: currentOrder.value })
  }
}

async function declineOrder() {
  try {
    const targetId = currentOrder.value._id || currentOrder.value.id
    if (targetId) {
      await orderApi.updateStatus(targetId, 'cancelled', 'Declined by vendor')
    }
    emit('action', { action: 'toast', payload: { message: 'Order declined and customer notified' } })
    emit('navigate', 'vendor_dashboard')
  } catch (err) {
    emit('navigate', 'vendor_dashboard')
  }
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface">
    <!-- Left Navigation Sidebar -->
    <aside class="fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col border-r border-outline-variant/30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div class="p-stack-lg flex items-center gap-base">
        <button @click="navigateTo('vendor_dashboard')" class="flex items-center gap-base text-left cursor-pointer">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-on-primary">soup_kitchen</span>
          </div>
          <div class="flex flex-col">
            <span class="font-headline-lg text-title-md tracking-tight text-primary font-bold">FoodMap</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Vendor Portal</span>
          </div>
        </button>
      </div>

      <nav class="flex-1 px-base space-y-stack-sm mt-2">
        <button
          @click="navigateTo('vendor_dashboard')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer font-medium"
        >
          <span class="material-symbols-outlined mr-gutter">dashboard</span>
          <span class="font-label-md">Kitchen Hub</span>
        </button>
        <button
          @click="navigateTo('post_new_food')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer font-medium"
        >
          <span class="material-symbols-outlined mr-gutter">add_circle</span>
          <span class="font-label-md">Post New Food</span>
        </button>
        <button
          @click="navigateTo('new_order')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg transition-all bg-primary text-on-primary font-bold shadow-sm cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">notifications_active</span>
          <span class="font-label-md">Incoming Orders ({{ ordersList.length || 1 }})</span>
        </button>
        <button
          @click="navigateTo('vendor_profile')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer font-medium"
        >
          <span class="material-symbols-outlined mr-gutter">storefront</span>
          <span class="font-label-md">Kitchen Profile</span>
        </button>
      </nav>

      <div class="px-base py-stack-lg border-t border-outline-variant/20 space-y-stack-sm">
        <button
          @click="navigateTo('vendor_profile')"
          class="w-full flex items-center gap-gutter px-gutter py-stack-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 transition-colors text-left cursor-pointer"
        >
          <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            A
          </div>
          <div class="flex flex-col">
            <span class="font-label-md text-on-surface leading-none text-xs font-bold">Anjali's Kitchen</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">Home Chef</span>
          </div>
        </button>

        <button
          @click="navigateTo('welcome')"
          class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-medium transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">logout</span>
          <span>Switch Account</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="pl-72">
      <!-- Header -->
      <header class="fixed top-0 left-72 right-0 h-20 bg-surface/90 backdrop-blur-md z-40 flex items-center px-container-margin justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-4">
          <button
            @click="navigateTo('vendor_dashboard')"
            class="flex items-center gap-2 text-on-surface hover:text-primary transition-colors bg-surface-container px-4 py-2 rounded-full font-label-md font-semibold text-xs cursor-pointer shadow-sm"
          >
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Dashboard</span>
          </button>
        </div>
        <div class="flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
          <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>Live Sockets Active</span>
        </div>
      </header>

      <main class="relative pt-20 min-h-screen bg-background">
        <div class="w-full max-w-3xl mx-auto px-container-margin py-8 flex-1 flex flex-col justify-center min-h-[calc(100vh-80px)]">
          
          <!-- Header Alert -->
          <div class="mb-6 flex flex-col items-center text-center">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs shadow-sm mb-2 animate-pulse">
              <span class="material-symbols-outlined text-[16px]">notifications_active</span>
              <span>Incoming Order Dispatch</span>
            </div>
            <h1 class="text-2xl font-black text-on-surface mb-1">Direct Order from Neighbor</h1>
            <p class="text-xs text-on-surface-variant max-w-md mx-auto">Confirm the portion readiness to notify customer in real-time.</p>
          </div>

          <!-- Order Card -->
          <div class="bg-surface-container-lowest rounded-3xl shadow-sm p-6 relative overflow-hidden border border-outline-variant/20">
            <div class="flex flex-col md:flex-row gap-5 mb-5">
              
              <!-- Left: Order Details -->
              <div class="flex-1 space-y-3">
                <div class="flex justify-between items-start">
                  <div>
                    <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">Order {{ currentOrder.id }}</p>
                    <h2 class="text-lg font-bold text-on-surface">{{ currentOrder.item }}</h2>
                  </div>
                  <div class="flex items-center gap-1.5 bg-surface-container rounded-xl px-3 py-1.5 shadow-sm border border-outline-variant/20">
                    <span class="text-xs text-on-surface-variant font-medium">Qty:</span>
                    <span class="text-sm font-black text-primary">{{ currentOrder.qty }}</span>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3 pt-3 border-t border-outline-variant/20">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <span class="material-symbols-outlined text-[18px]">shopping_bag</span>
                    </div>
                    <div>
                      <p class="text-[10px] text-on-surface-variant font-bold">Fulfillment</p>
                      <p class="text-xs text-on-surface font-bold">{{ currentOrder.type }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <span class="material-symbols-outlined text-[18px]">schedule</span>
                    </div>
                    <div>
                      <p class="text-[10px] text-on-surface-variant font-bold">Placed At</p>
                      <p class="text-xs text-on-surface font-bold">{{ currentOrder.time }}</p>
                    </div>
                  </div>
                </div>

                <!-- Customer Note -->
                <div v-if="currentOrder.notes" class="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                  <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Customer Note</span>
                  <span class="text-xs text-on-surface font-medium italic">"{{ currentOrder.notes }}"</span>
                </div>
              </div>

              <!-- Right: Customer & Price -->
              <div class="flex-shrink-0 w-full md:w-48 bg-surface-container rounded-2xl p-4 flex flex-col justify-between shadow-sm border border-outline-variant/20">
                <div class="mb-3">
                  <p class="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Customer</p>
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
                      {{ currentOrder.customer?.charAt(0) || 'A' }}
                    </div>
                    <div class="flex flex-col">
                      <span class="text-xs text-on-surface font-bold">{{ currentOrder.customer }}</span>
                      <span class="text-[10px] text-on-surface-variant">{{ currentOrder.customerPhone }}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p class="text-[10px] font-bold text-on-surface-variant uppercase mb-0.5">Total Earning</p>
                  <p class="text-2xl text-primary font-black tracking-tight">₹{{ currentOrder.price }}</p>
                </div>
              </div>

            </div>

            <!-- Actions -->
            <div class="flex flex-col sm:flex-row gap-3 mt-4 border-t border-outline-variant/20 pt-4">
              <button
                @click="declineOrder"
                class="flex-1 py-3 px-4 bg-surface-container hover:bg-red-50 hover:text-red-700 text-on-surface-variant border border-outline-variant/30 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer"
              >
                <span class="material-symbols-outlined text-[16px]">close</span>
                <span>Decline Order</span>
              </button>
              <button
                @click="acceptOrder"
                :disabled="isAccepting"
                class="flex-[2] py-3 px-4 bg-primary hover:bg-primary/90 text-on-primary text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 font-bold cursor-pointer disabled:opacity-50"
              >
                <span v-if="!isAccepting" class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[18px]">check</span>
                  <span>Accept Order & Start Cooking</span>
                </span>
                <span v-else class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                  <span>Confirming to Resident...</span>
                </span>
              </button>
            </div>
          </div>

          <!-- Multiple orders switcher if multiple orders exist -->
          <div v-if="ordersList.length > 1" class="mt-4 flex items-center justify-center gap-2">
            <span class="text-xs text-on-surface-variant font-medium">Viewing order {{ activeIndex + 1 }} of {{ ordersList.length }}</span>
            <button
              v-for="(_, idx) in ordersList"
              :key="idx"
              @click="activeIndex = idx"
              :class="activeIndex === idx ? 'bg-primary text-on-primary font-bold' : 'bg-surface-container text-on-surface'"
              class="w-6 h-6 rounded-full text-xs flex items-center justify-center cursor-pointer"
            >
              {{ idx + 1 }}
            </button>
          </div>

        </div>
      </main>
    </div>
  </div>
</template>
