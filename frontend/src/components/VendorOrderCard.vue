<script setup>
import { computed } from 'vue'

const props = defineProps({
  order: {
    type: Object,
    required: true
  },
  isUpdating: {
    type: Boolean,
    default: false
  },
  showCompleteButton: {
    type: Boolean,
    default: true
  },
  showDashboardButton: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['accept', 'cancel', 'complete', 'open-map', 'back-to-dashboard'])

const orderStatus = computed(() => {
  return String(props.order?.status || 'PENDING').toUpperCase()
})

const isPending = computed(() => {
  return orderStatus.value === 'PENDING' || orderStatus.value === 'PLACED'
})

const isOutForDelivery = computed(() => {
  return orderStatus.value === 'OUT_FOR_DELIVERY'
})

function handleAccept() {
  emit('accept', props.order)
}

function handleCancel() {
  emit('cancel', props.order)
}

function handleComplete() {
  emit('complete', props.order)
}

function handleOpenMap() {
  emit('open-map', props.order)
}

function handleBackToDashboard() {
  emit('back-to-dashboard')
}
</script>

<template>
  <div class="bg-surface-container-lowest rounded-3xl shadow-sm p-5 sm:p-6 relative overflow-hidden border border-outline-variant/20 transition-all">
    <div class="flex flex-col md:flex-row gap-5 mb-5">
      
      <!-- Left: Order Details -->
      <div class="flex-1 space-y-3.5">
        <div class="flex justify-between items-start gap-2">
          <div>
            <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">
              ORDER {{ order.id }}
            </p>
            <h2 class="text-lg sm:text-xl font-extrabold text-on-surface">
              {{ order.item }}
            </h2>
          </div>
          <div class="flex items-center gap-1.5 bg-surface-container rounded-xl px-3 py-1.5 shadow-2xs border border-outline-variant/20 shrink-0">
            <span class="text-xs text-on-surface-variant font-medium">Qty:</span> 
            <span class="text-sm font-black text-primary">{{ order.qty }}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 pt-3 border-t border-outline-variant/20">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span class="material-symbols-outlined text-[18px]">shopping_bag</span>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] text-on-surface-variant font-bold">Fulfillment</p>
              <p class="text-xs text-on-surface font-bold truncate">{{ order.type || 'Self Pickup' }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <span class="material-symbols-outlined text-[18px]">schedule</span>
            </div>
            <div class="min-w-0">
              <p class="text-[10px] text-on-surface-variant font-bold">Placed At</p>
              <p class="text-xs text-on-surface font-bold truncate">{{ order.time }}</p>
            </div>
          </div>
        </div>

        <!-- Customer Note -->
        <div class="p-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
          <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Customer Note</span>
          <span class="text-xs text-on-surface font-medium italic">"{{ order.notes || 'None' }}"</span>
        </div>
      </div>

      <!-- Right: Resident Info & Location Map CTA -->
      <div class="flex-shrink-0 w-full md:w-64 bg-surface-container rounded-2xl p-4 flex flex-col justify-between shadow-sm border border-outline-variant/20 gap-3">
        <div class="space-y-2">
          <p class="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ordered By Resident</p>
          
          <div class="flex items-center gap-3 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20">
            <div class="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm shrink-0">
              {{ (order.customer || 'R').charAt(0).toUpperCase() }}
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-xs text-on-surface font-extrabold truncate">{{ order.customer }}</span>
              <span v-if="order.customerPhone" class="text-[11px] text-on-surface-variant truncate font-medium">{{ order.customerPhone }}</span>
              <span v-else class="text-[10px] text-on-surface-variant italic">Resident Neighbor</span>
            </div>
          </div>

          <!-- Check Location on Map Button -->
          <button
            type="button"
            @click="handleOpenMap"
            class="w-full py-2.5 px-3 rounded-xl bg-surface-container-lowest hover:bg-primary/10 border border-outline-variant/30 hover:border-primary/40 text-primary text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <span class="material-symbols-outlined text-[18px]">explore</span>
            <span>Check Location on Map</span>
          </button>
        </div>

        <div class="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
          <span class="text-[11px] font-bold text-on-surface-variant uppercase">Earning</span>
          <span class="text-xl text-primary font-black tracking-tight">₹{{ order.price }}</span>
        </div>
      </div>

    </div>

    <!-- Actions Footer -->
    <div class="flex flex-col sm:flex-row gap-3 mt-4 border-t border-outline-variant/20 pt-4">
      <button
        v-if="showDashboardButton"
        type="button"
        @click="handleBackToDashboard"
        class="flex-1 py-3.5 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface-variant border border-outline-variant/30 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer"
      >
        <span class="material-symbols-outlined text-[16px]">arrow_back</span>
        <span>Chef Dashboard</span>
      </button>

      <!-- PENDING STATE: Cancel (Reject with optional reason) & Accept buttons -->
      <template v-if="isPending">
        <button
          type="button"
          @click="handleCancel"
          :disabled="isUpdating"
          class="flex-1 py-3.5 px-4 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 font-bold cursor-pointer disabled:opacity-50"
        >
          <span class="material-symbols-outlined text-[18px]">cancel</span>
          <span>Cancel Order</span>
        </button>

        <button
          type="button"
          @click="handleAccept"
          :disabled="isUpdating"
          class="flex-[2] py-3.5 px-4 bg-green-700 hover:bg-green-800 text-white text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 font-bold cursor-pointer disabled:opacity-50"
        >
          <span class="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{{ isUpdating ? 'Accepting...' : 'Accept Order' }}</span>
        </button>
      </template>

      <!-- ACCEPTED / DISPATCHED STATE: Out for delivery indicator or Complete button -->
      <template v-else>
        <!-- If order is already Sent Out for Delivery, show a clean grey indicator waiting for resident to confirm receipt -->
        <div
          v-if="isOutForDelivery"
          class="flex-[2] py-3.5 px-4 text-xs rounded-xl bg-surface-container-high text-on-surface-variant border border-outline-variant/30 flex items-center justify-center gap-2 font-bold select-none"
        >
          <span class="material-symbols-outlined text-[18px] text-primary animate-pulse">hourglass_top</span>
          <span>Dispatched • Waiting for customer to confirm receipt</span>
        </div>

        <button
          v-else-if="showCompleteButton"
          type="button"
          @click="handleComplete"
          :disabled="isUpdating"
          :class="[
            order.isDelivery || order.type === 'Direct Delivery'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-green-700 hover:bg-green-800 text-white',
            'flex-[2] py-3.5 px-4 text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 font-bold cursor-pointer disabled:opacity-50'
          ]"
        >
          <span class="material-symbols-outlined text-[18px]">
            {{ (order.isDelivery || order.type === 'Direct Delivery') ? 'local_shipping' : 'check_circle' }}
          </span>
          <span>
            {{ isUpdating ? 'Updating...' : ((order.isDelivery || order.type === 'Direct Delivery') ? 'Sent Out for Delivery' : 'Done with Pickup (Completed)') }}
          </span>
        </button>
      </template>
    </div>
  </div>
</template>
