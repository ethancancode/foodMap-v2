<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { orderApi, vendorApi } from '../services/api.js'
import { onLocationUpdated } from '../services/socket.js'
import ResidentLocationModal from '../components/ResidentLocationModal.vue'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

const props = defineProps({
  order: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const vendorProfile = ref(null)
const isUpdating = ref(false)
const isMapModalOpen = ref(false)
const liveResidentLocation = ref(null)
let unsubLocation = null

onMounted(async () => {
  try {
    const res = await vendorApi.getMyProfile().catch(() => null)
    if (res?.vendor) {
      vendorProfile.value = res.vendor
    }
  } catch (e) {
    // ignore
  }

  // Real-time listener for resident moving
  unsubLocation = onLocationUpdated((data) => {
    const o = props.order || {}
    const residentId = o.resident?._id || o.resident?.id || o.resident
    if (data.userId && residentId && String(data.userId) === String(residentId)) {
      if (data.location) {
        liveResidentLocation.value = data.location
      }
    }
  })
})

onUnmounted(() => {
  if (unsubLocation) unsubLocation()
})

const kitchenDisplayName = computed(() => {
  return vendorProfile.value?.businessName || props.user?.vendor?.businessName || props.order?.vendor?.businessName || props.order?.vendorName || props.user?.name || 'Priya Kitchen'
})

const orderData = computed(() => {
  const o = props.order || {}
  const residentObj = o.resident || {}
  const coords = liveResidentLocation.value?.coordinates || o.residentLocation?.coordinates || residentObj.location?.coordinates || o.location?.coordinates || o.residentCoordinates || [73.0188, 19.0225]
  const address = liveResidentLocation.value?.address || o.residentLocation?.address || residentObj.location?.address || o.pickupAddress || o.location?.address || o.deliveryAddress || 'Current Live Location'
  const customerName = o.residentName || o.customer || residentObj.name || 'Resident'
  const customerPhone = o.residentPhone || o.customerPhone || residentObj.phone || ''

  return {
    _id: o._id,
    id: o.orderNumber || o.id || o._id?.slice(-5) || '#0001',
    customer: customerName,
    customerPhone: customerPhone,
    item: o.foodName || o.item || (o.items?.[0]?.food?.name) || 'Order Item',
    qty: o.quantity || o.qty || (o.items?.[0]?.quantity) || 1,
    price: o.totalAmount || o.price || 0,
    type: o.pickupAddress ? 'Self Pickup' : (o.type || 'Self Pickup'),
    time: new Date(o.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    notes: (o.specialInstructions || o.notes || '').trim() || 'None',
    coordinates: coords,
    address: address
  }
})

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

async function markDoneWithPickup() {
  if (isUpdating.value) return
  isUpdating.value = true

  try {
    const targetId = orderData.value._id || orderData.value.id
    if (targetId) {
      await orderApi.updateStatus(targetId, 'completed', 'Order picked up and completed')
    }

    emit('action', { action: 'toast', payload: { message: `🎉 Order #${orderData.value.id} completed!` } })
    emit('navigate', 'vendor_dashboard')
  } catch (err) {
    console.error('Failed to complete order:', err)
    emit('action', { action: 'toast', payload: { message: `🎉 Order #${orderData.value.id} completed!` } })
    emit('navigate', 'vendor_dashboard')
  } finally {
    isUpdating.value = false
  }
}

async function cancelOrder() {
  try {
    const targetId = orderData.value._id || orderData.value.id
    if (targetId) {
      await orderApi.updateStatus(targetId, 'cancelled', 'Cancelled by vendor')
    }
    emit('action', { action: 'toast', payload: { message: 'Order cancelled' } })
  } catch (e) {
    console.log(e)
  }
  emit('navigate', 'vendor_dashboard')
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface">
    <!-- Reusable AppSidebar -->
    <AppSidebar
      role="vendor"
      activeRoute="new_order"
      :kitchenDisplayName="kitchenDisplayName"
      @navigate="navigateTo"
    />

    <!-- Main Content Area -->
    <div class="lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        :show-back="true"
        back-label="Back to Dashboard"
        back-route="vendor_dashboard"
        :show-sync-badge="true"
        sync-label="Live Sockets Active"
        @navigate="navigateTo"
      />

      <main class="relative pt-20 min-h-screen bg-background">
        <div class="px-container-margin py-8 max-w-4xl mx-auto w-full flex-1 flex flex-col gap-6">
          <div class="flex flex-col gap-1 text-center md:text-left">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-800 border border-green-200 font-bold text-xs shadow-sm self-center md:self-start mb-1">
              <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span>Active Order</span>
            </div>
            <h1 class="text-2xl font-black text-on-surface">Order Details</h1>
            <p class="text-xs text-on-surface-variant max-w-2xl">Check resident pickup details or map location. When the customer picks up the food, mark it as done.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 relative">
            <!-- Left Column: Order Content -->
            <div class="lg:col-span-7 flex flex-col gap-4">
              <div class="bg-surface-container-lowest rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden border border-outline-variant/20 shadow-sm">
                <div class="flex items-start justify-between relative z-10">
                  <div class="flex flex-col gap-0.5">
                    <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Order {{ orderData.id }}</span>
                    <h2 class="text-lg font-bold text-on-surface">{{ orderData.item }}</h2>
                  </div>
                  <div class="flex items-center gap-1.5 bg-surface-container rounded-xl px-3 py-1.5 shadow-sm border border-outline-variant/20">
                    <span class="text-xs text-on-surface-variant font-medium">Qty:</span>
                    <span class="text-sm font-black text-primary">{{ orderData.qty }}</span>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3 pt-3 border-t border-outline-variant/20">
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <span class="material-symbols-outlined text-[18px]">shopping_bag</span>
                    </div>
                    <div>
                      <p class="text-[10px] text-on-surface-variant font-bold">Fulfillment</p>
                      <p class="text-xs text-on-surface font-bold">{{ orderData.type }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <span class="material-symbols-outlined text-[18px]">schedule</span>
                    </div>
                    <div>
                      <p class="text-[10px] text-on-surface-variant font-bold">Placed At</p>
                      <p class="text-xs text-on-surface font-bold">{{ orderData.time }}</p>
                    </div>
                  </div>
                </div>

                <!-- Customer Note -->
                <div v-if="orderData.notes" class="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/20">
                  <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-0.5">Customer Note</span>
                  <span class="text-xs text-on-surface font-medium italic">"{{ orderData.notes }}"</span>
                </div>
              </div>
            </div>

            <!-- Right Column: Resident Info, Map & Action -->
            <div class="lg:col-span-5 flex flex-col gap-4 self-start">
              <div class="bg-surface-container-lowest rounded-3xl p-6 flex flex-col gap-4 shadow-sm border border-outline-variant/20">
                <div class="space-y-3">
                  <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ordered By Resident</p>
                  
                  <div class="flex items-center justify-between bg-surface-container p-3.5 rounded-2xl border border-outline-variant/20">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
                        {{ (orderData.customer || 'R').charAt(0).toUpperCase() }}
                      </div>
                      <div class="flex flex-col min-w-0">
                        <span class="text-xs text-on-surface font-extrabold truncate">{{ orderData.customer }}</span>
                        <span v-if="orderData.customerPhone" class="text-[11px] text-on-surface-variant truncate font-medium">{{ orderData.customerPhone }}</span>
                        <span v-else class="text-[10px] text-on-surface-variant italic">Resident Neighbor</span>
                      </div>
                    </div>

                    <button
                      v-if="orderData.customerPhone"
                      @click="emit('action', { action: 'toast', payload: { message: `Calling ${orderData.customer}...` } })"
                      class="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer shrink-0"
                    >
                      <span class="material-symbols-outlined text-[18px]">call</span>
                    </button>
                  </div>

                  <!-- Check Location on Map Button -->
                  <button
                    @click="isMapModalOpen = true"
                    class="w-full py-2.5 px-3 rounded-xl bg-surface-container-low hover:bg-primary/10 border border-outline-variant/30 hover:border-primary/40 text-primary text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <span class="material-symbols-outlined text-[18px]">explore</span>
                    <span>Check Location on Map</span>
                  </button>
                </div>

                <div class="pt-3 border-t border-outline-variant/20 flex items-center justify-between">
                  <span class="text-xs font-bold text-on-surface-variant uppercase">Total Earning</span>
                  <span class="text-2xl text-primary font-black tracking-tight">₹{{ orderData.price }}</span>
                </div>

                <!-- Done with Pickup Button -->
                <button
                  @click="markDoneWithPickup"
                  :disabled="isUpdating"
                  class="mt-2 w-full bg-green-700 hover:bg-green-800 text-white text-xs py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 font-bold cursor-pointer disabled:opacity-50"
                >
                  <span class="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{{ isUpdating ? 'Updating...' : 'Done with Pickup (Completed)' }}</span>
                </button>

                <button
                  @click="cancelOrder"
                  class="w-full bg-transparent border border-outline-variant/30 text-on-surface-variant hover:text-red-600 py-2 rounded-xl hover:bg-surface-container transition-colors text-xs font-semibold cursor-pointer"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>

    <!-- Map Modal -->
    <ResidentLocationModal
      :is-open="isMapModalOpen"
      :coordinates="orderData.coordinates"
      :resident-name="orderData.customer"
      :address="orderData.address"
      @close="isMapModalOpen = false"
    />
  </div>
</template>
