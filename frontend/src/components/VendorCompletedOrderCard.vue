<script setup>
const props = defineProps({
  order: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['open-map'])

function handleOpenMap() {
  emit('open-map', props.order)
}
</script>

<template>
  <div
    class="group bg-surface-container-lowest rounded-2xl p-4 sm:p-5 border border-outline-variant/20 shadow-xs hover:shadow-sm hover:border-primary/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
  >
    <div class="flex items-start sm:items-center gap-3.5 min-w-0">
      <div class="w-10 h-10 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center font-bold shrink-0">
        <span class="material-symbols-outlined text-[20px]">task_alt</span>
      </div>
      <div class="flex flex-col min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            ORDER {{ order.id }}
          </span>
          <span class="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[10px] font-bold">
            Picked Up & Fulfilled
          </span>
        </div>
        <h3 class="text-sm sm:text-base font-extrabold text-on-surface truncate mt-0.5">
          {{ order.item }}
        </h3>
        <p class="text-[11px] text-on-surface-variant mt-0.5">
          Customer: <strong class="font-bold text-on-surface">{{ order.customer }}</strong>
          • {{ order.qty }} portion{{ order.qty > 1 ? 's' : '' }}
          • {{ order.date }} at {{ order.time }}
        </p>
      </div>
    </div>

    <div class="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-outline-variant/10">
      <div class="text-left sm:text-right">
        <span class="text-[10px] font-bold text-on-surface-variant uppercase block">Earned</span>
        <span class="text-base sm:text-lg font-black text-primary">₹{{ order.price }}</span>
      </div>
    </div>
  </div>
</template>
