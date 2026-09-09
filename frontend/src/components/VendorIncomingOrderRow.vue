<script setup>
const props = defineProps({
  order: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['select'])

function getOrderStatusLabel(status) {
  const s = (status || '').toLowerCase()
  if (s === 'accepted' || s === 'pending' || s === 'placed') return 'Order In'
  if (s === 'preparing') return 'Cooking on Stove'
  if (s === 'ready_for_pickup') return 'Ready for Pickup'
  if (s === 'completed') return 'Completed'
  return status || 'Confirmed'
}

function handleClick() {
  emit('select', props.order)
}
</script>

<template>
  <div
    @click="handleClick"
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
        type="button"
        class="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 flex items-center gap-1 transition-transform group-hover:translate-x-0.5 shrink-0 cursor-pointer shadow-xs"
      >
        <span>View Order</span>
        <span class="material-symbols-outlined text-[15px]">arrow_forward</span>
      </button>
    </div>
  </div>
</template>
