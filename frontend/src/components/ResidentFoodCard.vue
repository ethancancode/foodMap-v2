<script setup>
import { computed } from 'vue'
import { getCookingCountdown, currentTimestamp } from '../utils/countdown.js'
import { DEFAULT_FOOD_SVG } from '../utils/defaultFoodImage.js'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['select'])

const countdown = computed(() => {
  void currentTimestamp.value
  return getCookingCountdown(props.item)
})
</script>

<template>
  <div
    @click="emit('select', item)"
    class="group flex flex-col bg-surface-container-lowest rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-outline-variant/20 active:scale-[0.99]"
  >
    <!-- Dish Photo -->
    <div class="relative w-full aspect-[4/3] overflow-hidden bg-surface-container">
      <img
        :src="item.image || DEFAULT_FOOD_SVG"
        :alt="item.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />
      <!-- Live Portions Badge -->
      <div
        :class="item.quantity <= 2 ? 'bg-red-600 text-white' : 'bg-surface/95 backdrop-blur-sm text-on-surface'"
        class="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm text-[11px] font-bold"
      >
        <span :class="item.quantity <= 2 ? 'bg-white' : 'bg-primary'" class="w-2 h-2 rounded-full animate-ping"></span>
        <span>{{ item.quantity }} left</span>
      </div>

      <!-- Fulfillment Highlight Badge (Pickup only or Delivery only) -->
      <div
        v-if="item.fulfillmentOptions === 'PICKUP_ONLY'"
        class="absolute top-2.5 right-2.5 bg-amber-500/95 text-white backdrop-blur-md px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 text-[10px] font-bold tracking-wide"
      >
        <span class="material-symbols-outlined text-[13px]">storefront</span>
        <span>Pickup Only</span>
      </div>
      <div
        v-else-if="item.fulfillmentOptions === 'DELIVERY_ONLY'"
        class="absolute top-2.5 right-2.5 bg-blue-600/95 text-white backdrop-blur-md px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 text-[10px] font-bold tracking-wide"
      >
        <span class="material-symbols-outlined text-[13px]">directions_bike</span>
        <span>Delivery Only</span>
      </div>

      <!-- Price Tag -->
      <div class="absolute bottom-2.5 right-2.5 bg-surface/95 backdrop-blur-md px-3 py-1 rounded-xl shadow-md flex items-center gap-0.5">
        <span class="text-sm font-bold text-primary">₹{{ item.price }}</span>
      </div>
    </div>

    <!-- Details -->
    <div class="p-4 flex flex-col gap-2.5 flex-1">
      <div>
        <h3 class="font-bold text-on-surface group-hover:text-primary transition-colors text-sm sm:text-base line-clamp-1">
          {{ item.name }}
        </h3>
        <p class="text-xs text-on-surface-variant line-clamp-2 mt-0.5">
          {{ item.description }}
        </p>
      </div>

      <div class="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
        <span class="material-symbols-outlined text-[16px] text-primary">soup_kitchen</span>
        <span class="truncate font-semibold text-on-surface">{{ item.vendorName }}</span>
      </div>

      <!-- Micro-bar attributes -->
      <div class="mt-auto pt-3 flex items-center justify-between border-t border-outline-variant/10 text-xs">
        <span
          :class="countdown.isReady ? 'text-green-700 bg-green-50' : 'text-amber-800 bg-amber-50 font-mono'"
          class="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md"
        >
          <span
            class="material-symbols-outlined text-[14px]"
            :class="countdown.isReady ? '' : 'animate-pulse text-amber-600'"
          >schedule</span>
          {{ countdown.text }}
        </span>

        <span class="inline-flex items-center gap-1 text-on-surface-variant font-semibold">
          <span class="material-symbols-outlined text-[14px]">directions_walk</span>
          {{ item.calculatedDistance !== undefined ? `${item.calculatedDistance}m` : (item.distance || '400m') }}
        </span>
      </div>
    </div>
  </div>
</template>
