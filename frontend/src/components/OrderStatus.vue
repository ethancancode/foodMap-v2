<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { orderApi } from '../services/api.js'
import { onOrderStatusChanged } from '../services/socket.js'

const props = defineProps({
  order: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

// 'placed' (0), 'accepted' (1), 'preparing' (2), 'ready_for_pickup' (3), 'completed' (4)
const statusMap = {
  placed: 0,
  accepted: 1,
  preparing: 2,
  ready_for_pickup: 3,
  completed: 4,
  cancelled: -1
}

const liveOrder = ref(props.order || {})
const currentStatus = ref(props.order?.status || 'preparing')

const stepIndex = computed(() => {
  const s = currentStatus.value?.toLowerCase() || 'preparing'
  return statusMap[s] !== undefined ? statusMap[s] : 2
})

const orderInfo = computed(() => ({
  id: liveOrder.value?.orderNumber || liveOrder.value?.id || '#FM1024',
  _id: liveOrder.value?._id,
  item: liveOrder.value?.foodName || liveOrder.value?.item || 'Authentic Rajma Chawal',
  vendor: liveOrder.value?.vendorName || liveOrder.value?.vendor || "Anjali's Kitchen",
  qty: liveOrder.value?.quantity || liveOrder.value?.qty || 2,
  price: liveOrder.value?.totalAmount || liveOrder.value?.total || 195,
  status: currentStatus.value,
  time: liveOrder.value?.time || 'Today, Fresh Batch',
  pickupAddress: liveOrder.value?.pickupAddress || liveOrder.value?.address || 'Building B, Apt 402, Bhandup West, Mumbai'
}))

let unsubOrderStatus

onMounted(async () => {
  // If order id exists, fetch latest order state from MongoDB
  const targetId = props.order?._id || props.order?.id
  if (targetId) {
    try {
      const res = await orderApi.getOrderById(targetId)
      if (res?.order) {
        liveOrder.value = res.order
        currentStatus.value = res.order.status
      }
    } catch (e) {
      console.log('Order fetch error:', e)
    }
  }

  // Socket listener: updates whenever vendor advances order
  unsubOrderStatus = onOrderStatusChanged((data) => {
    const currentId = liveOrder.value?._id || liveOrder.value?.id
    if (data.orderId === currentId || data.orderNumber === liveOrder.value?.orderNumber) {
      currentStatus.value = data.status
      if (data.order) liveOrder.value = data.order
      emit('action', {
        action: 'toast',
        payload: { message: `Order #${orderInfo.value.id} updated to: ${data.status.replace(/_/g, ' ').toUpperCase()}` }
      })
    }
  })
})

onUnmounted(() => {
  if (unsubOrderStatus) unsubOrderStatus()
})

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

async function advanceOrder() {
  const steps = ['placed', 'accepted', 'preparing', 'ready_for_pickup', 'completed']
  const nextIdx = Math.min(steps.length - 1, stepIndex.value + 1)
  const nextStatus = steps[nextIdx]

  try {
    const targetId = liveOrder.value?._id || liveOrder.value?.id || 'FM-1024'
    const res = await orderApi.updateStatus(targetId, nextStatus, 'Progressed by user action')
    if (res?.order) {
      currentStatus.value = res.order.status
      liveOrder.value = res.order
    }
    if (nextStatus === 'completed') {
      setTimeout(() => {
        emit('navigate', 'order_completed', { order: orderInfo.value })
      }, 600)
    }
  } catch (err) {
    console.error('Failed to advance order status:', err)
    // Fallback UI progression
    currentStatus.value = nextStatus
  }
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface pb-20 lg:pb-0">
    <!-- Left Navigation Sidebar (Desktop only) -->
    <aside class="hidden lg:flex fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex-col border-r border-outline-variant/30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div class="p-stack-lg flex items-center gap-base">
        <button @click="navigateTo('food_radar')" class="flex items-center gap-base text-left cursor-pointer">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-on-primary">map</span>
          </div>
          <div class="flex flex-col">
            <span class="font-headline-lg text-title-md tracking-tight text-primary font-bold">FoodMap</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Live Neighborhood</span>
          </div>
        </button>
      </div>

      <nav class="flex-1 px-base space-y-stack-sm mt-2">
        <button
          @click="navigateTo('food_radar')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">explore</span>
          <span class="font-label-md">Live Radar</span>
        </button>
        <button
          @click="navigateTo('order_status')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg transition-all bg-primary text-on-primary font-bold shadow-sm cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">receipt_long</span>
          <span class="font-label-md">My Orders</span>
        </button>
        <button
          @click="navigateTo('resident_profile')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">person</span>
          <span class="font-label-md">Profile</span>
        </button>
      </nav>

      <div class="px-base py-stack-lg border-t border-outline-variant/20">
        <div
          @click="navigateTo('resident_profile')"
          class="w-full flex items-center gap-gutter px-gutter py-stack-md rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-left cursor-pointer"
        >
          <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {{ props.user?.name?.charAt(0) || 'N' }}
          </div>
          <div class="flex flex-col">
            <span class="font-label-md text-on-surface leading-none text-xs font-bold">{{ props.user?.name || 'Nikhil' }}</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">Resident</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="pl-0 lg:pl-72">
      <!-- Header -->
      <header class="fixed top-0 left-0 lg:left-72 right-0 h-16 lg:h-20 bg-surface/90 backdrop-blur-md z-40 flex items-center px-3 sm:px-container-margin justify-between border-b border-outline-variant/20 gap-2">
        <div class="flex items-center gap-2 sm:gap-4">
          <button
            @click="navigateTo('food_radar')"
            class="flex items-center gap-1.5 text-on-surface hover:text-primary transition-colors bg-surface-container px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-label-md font-semibold text-xs cursor-pointer shadow-sm"
          >
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Radar</span>
          </button>
        </div>
        <div class="flex items-center gap-2">
          <!-- Real-time sync badge -->
          <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 text-[11px] font-semibold">
            <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            <span>Live Tracking</span>
          </div>

          <button
            @click="advanceOrder"
            class="text-xs bg-primary text-on-primary px-3 py-1.5 rounded-full font-bold hover:bg-primary/90 transition-all flex items-center gap-1 shadow-sm cursor-pointer shrink-0"
          >
            <span>Next Milestone</span>
            <span class="material-symbols-outlined text-[14px]">fast_forward</span>
          </button>
        </div>
      </header>

      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background">
        <div class="px-4 sm:px-container-margin pb-stack-lg pt-4 sm:pt-section-gap flex flex-col gap-4 sm:gap-5 max-w-[800px] mx-auto w-full">
          <!-- Title & Tag -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex flex-col gap-0.5">
              <span class="text-xl sm:text-2xl font-black text-on-surface">Live Order Tracker</span>
              <span class="text-xs text-on-surface-variant flex items-center gap-2 font-medium">
                Order {{ orderInfo.id }}
                <span class="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
                {{ orderInfo.time }}
              </span>
            </div>
            <div class="px-3 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1.5 border border-primary/20 self-start sm:self-auto">
              <span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
              <span class="text-xs font-bold uppercase tracking-wider">
                {{ currentStatus.replace(/_/g, ' ') }}
              </span>
            </div>
          </div>

          <!-- Status Timeline Container -->
          <div class="bg-surface-container-lowest rounded-3xl p-4 sm:p-6 relative overflow-hidden flex flex-col gap-5 sm:gap-6 shadow-sm border border-outline-variant/20">
            <div class="flex flex-col relative z-10">
              <div class="flex flex-col gap-5 sm:gap-6 relative">
                <div class="absolute left-4 top-4 bottom-4 w-0.5 bg-outline-variant/30 z-0"></div>
                
                <!-- Step 0: Order Placed -->
                <div class="flex gap-3.5 sm:gap-4 items-start relative z-10">
                  <div
                    :class="stepIndex >= 0 ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'"
                    class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md transition-colors"
                  >
                    <span class="material-symbols-outlined text-[16px]">check</span>
                  </div>
                  <div class="flex flex-col pt-0.5">
                    <span class="font-bold text-on-surface text-sm">Order Placed & Persisted</span>
                    <span class="text-xs text-on-surface-variant mt-0.5">Portions atomically reserved in MongoDB</span>
                  </div>
                </div>

                <!-- Step 1: Confirmed -->
                <div class="flex gap-3.5 sm:gap-4 items-start relative z-10">
                  <div
                    :class="stepIndex >= 1 ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface-variant'"
                    class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md transition-colors"
                  >
                    <span class="material-symbols-outlined text-[16px]">check</span>
                  </div>
                  <div class="flex flex-col pt-0.5">
                    <span class="font-bold text-on-surface text-sm">Kitchen Accepted Order</span>
                    <span class="text-xs text-on-surface-variant mt-0.5">{{ stepIndex >= 1 ? `${orderInfo.vendor} received your request` : 'Awaiting cook confirmation' }}</span>
                  </div>
                </div>

                <!-- Step 2: Preparing -->
                <div class="flex gap-3.5 sm:gap-4 items-start relative z-10">
                  <div
                    :class="stepIndex >= 2 ? (stepIndex === 2 ? 'bg-primary ring-4 ring-primary/20 text-on-primary' : 'bg-primary text-on-primary') : 'bg-surface-container-high text-on-surface-variant'"
                    class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all"
                  >
                    <span v-if="stepIndex > 2" class="material-symbols-outlined text-[16px]">check</span>
                    <div v-else-if="stepIndex === 2" class="w-3 h-3 bg-white rounded-full animate-ping"></div>
                    <span v-else class="w-2 h-2 bg-on-surface-variant rounded-full"></span>
                  </div>
                  <div class="flex flex-col pt-0.5 w-full">
                    <span class="font-bold text-sm" :class="stepIndex >= 2 ? 'text-primary' : 'text-on-surface-variant'">Preparing Fresh In Kitchen</span>
                    <span class="text-xs text-on-surface-variant mt-0.5">Homestyle cooking on live stove</span>

                    <!-- Meal Preview Box -->
                    <div class="mt-2.5 bg-surface-container rounded-2xl p-3 flex gap-3 items-center shadow-xs w-full max-w-sm border border-outline-variant/20">
                      <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[20px]">soup_kitchen</span>
                      </div>
                      <div class="flex flex-col w-full">
                        <div class="flex justify-between items-center w-full">
                          <span class="text-xs font-bold text-on-surface">{{ orderInfo.item }}</span>
                          <span class="text-xs font-bold text-primary">x{{ orderInfo.qty }}</span>
                        </div>
                        <span class="text-xs font-semibold text-on-surface-variant mt-0.5">₹{{ orderInfo.price }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 3: Ready for Pickup -->
                <div class="flex gap-3.5 sm:gap-4 items-start relative z-10">
                  <div
                    :class="stepIndex >= 3 ? (stepIndex === 3 ? 'bg-primary ring-4 ring-primary/20 text-on-primary' : 'bg-primary text-on-primary') : 'bg-surface-container-high text-on-surface-variant'"
                    class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all"
                  >
                    <span v-if="stepIndex >= 4" class="material-symbols-outlined text-[16px]">check</span>
                    <div v-else-if="stepIndex === 3" class="w-3 h-3 bg-white rounded-full animate-ping"></div>
                    <span v-else class="w-2 h-2 bg-on-surface-variant rounded-full"></span>
                  </div>
                  <div class="flex flex-col pt-0.5">
                    <span class="font-bold text-sm" :class="stepIndex >= 3 ? 'text-primary' : 'text-on-surface-variant'">Ready for Pickup / Out for Delivery</span>
                    <span class="text-xs text-on-surface-variant mt-0.5">Packed in heat-insulating boxes</span>
                  </div>
                </div>

                <!-- Step 4: Completed -->
                <div class="flex gap-3.5 sm:gap-4 items-start relative z-10">
                  <div
                    :class="stepIndex >= 4 ? 'bg-green-600 text-white' : 'bg-surface-container-high text-on-surface-variant'"
                    class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all"
                  >
                    <span v-if="stepIndex >= 4" class="material-symbols-outlined text-[16px]">done_all</span>
                    <span v-else class="w-2 h-2 bg-on-surface-variant rounded-full"></span>
                  </div>
                  <div class="flex flex-col pt-0.5">
                    <span class="font-bold text-sm" :class="stepIndex >= 4 ? 'text-green-700' : 'text-on-surface-variant'">Order Completed & Picked Up</span>
                    <span class="text-xs text-on-surface-variant mt-0.5">Enjoy your wholesome homemade meal!</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <!-- Bottom Grid: Pickup Location & Map -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div class="bg-surface-container-lowest rounded-3xl p-4 sm:p-5 flex flex-col gap-3 shadow-sm border border-outline-variant/20">
              <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Kitchen Pickup Point</span>
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  <span class="material-symbols-outlined text-[20px]">soup_kitchen</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-xs sm:text-sm font-bold text-on-surface">{{ orderInfo.vendor }}</span>
                  <span class="text-xs text-on-surface-variant">{{ orderInfo.pickupAddress }}</span>
                </div>
              </div>
              <div class="h-px w-full bg-outline-variant/20 my-0.5"></div>
              <div class="flex gap-2.5 mt-auto">
                <button
                  @click="emit('action', { action: 'toast', payload: { message: 'Connecting to cook (+91 98201 45892)...' } })"
                  class="flex-1 bg-surface-container py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 hover:bg-surface-container-high transition-colors font-bold text-xs cursor-pointer"
                >
                  <span class="material-symbols-outlined text-primary text-[18px]">call</span>
                  <span>Call Maker</span>
                </button>
                <button
                  @click="navigateTo('order_pickup', { order: orderInfo })"
                  class="flex-1 bg-primary text-on-primary py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary/90 transition-colors font-bold text-xs cursor-pointer shadow-sm"
                >
                  <span class="material-symbols-outlined text-[18px]">directions</span>
                  <span>Live Route</span>
                </button>
              </div>
            </div>

            <!-- Map Shortcut -->
            <div
              @click="navigateTo('order_pickup', { order: orderInfo })"
              class="bg-surface-container rounded-3xl overflow-hidden shadow-sm h-40 md:h-auto min-h-[150px] relative cursor-pointer border border-outline-variant/20 group"
            >
              <div
                class="w-full h-full bg-cover bg-center absolute inset-0 group-hover:scale-105 transition-transform duration-500"
                style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAmgYv87M6ZS82y69BJ8oD6zbVR1vQIIfN3GZP9eA_X_BJjPdvMx3CUodqBSO0EJ2GMh8mDMYVXh5R-CmHmLdpsHdeWJvcisZ7niwMrbo-cgEHEQtiNqmbgRmqouaOToUe_0hYTrtUGRoBXJWOdi4PJKLTiHUhZnLzDHCRIWCRY8j7p370GZaXuwmYtAWnjTGzY88nlpaIgKbOpMmStX8UjVA2XDBnc0I4rCXsW4ALVWFgUCpbs6niN')"
              ></div>
              <div class="absolute inset-0 bg-gradient-to-t from-surface/90 via-transparent to-transparent flex flex-col justify-end p-3.5">
                <span class="bg-surface/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-on-surface inline-flex self-start items-center gap-1.5 shadow-sm">
                  <span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                  <span>420m away • Open route navigation</span>
                </span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>

    <!-- Mobile Bottom Navigation Bar -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 z-50 flex items-center justify-around px-2 shadow-lg">
      <button
        @click="navigateTo('food_radar')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">explore</span>
        <span class="text-[10px] font-semibold mt-0.5">Radar</span>
      </button>
      <button
        @click="navigateTo('order_status')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">receipt_long</span>
        <span class="text-[10px] font-bold mt-0.5">Orders</span>
      </button>
      <button
        @click="navigateTo('resident_profile')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">person</span>
        <span class="text-[10px] font-semibold mt-0.5">Profile</span>
      </button>
    </nav>
  </div>
</template>
