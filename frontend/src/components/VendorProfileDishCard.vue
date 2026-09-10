<script setup>
import { computed } from 'vue'
import { getCookingCountdown, currentTimestamp } from '../utils/countdown.js'
import { DEFAULT_FOOD_SVG } from '../utils/defaultFoodImage.js'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  isOwner: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['edit', 'select'])

const isAvailable = computed(() => {
  if (!props.item) return false
  const avail = props.item.isAvailable !== undefined 
    ? props.item.isAvailable 
    : (props.item.available !== undefined ? props.item.available : true)
  return Boolean(avail) && Number(props.item.quantity) > 0
})

const isVegDish = computed(() => {
  return props.item?.isVeg !== false && props.item?.diet !== 'non-veg'
})

const countdownInfo = computed(() => {
  void currentTimestamp.value // reactive dependency
  return getCookingCountdown(props.item)
})

function handleClick() {
  if (props.isOwner) {
    emit('edit', props.item)
  } else {
    emit('select', props.item)
  }
}
</script>

<template>
  <div
    @click="handleClick"
    class="bg-surface-container-lowest rounded-2xl sm:rounded-3xl overflow-hidden border border-outline-variant/20 shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200 flex flex-col group cursor-pointer"
  >
    <!-- Image Area -->
    <div class="relative h-44 w-full bg-surface-container-high overflow-hidden">
      <img
        :src="item.image || DEFAULT_FOOD_SVG"
        :alt="item.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />

      <!-- Dark Gradient for text readability -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none"></div>

      <!-- Live Portion Status Badge (Top-Left) -->
      <div
        :class="!isAvailable ? 'bg-red-600/90 text-white' : 'bg-surface/95 text-on-surface'"
        class="absolute top-3 left-3 text-xs px-2.5 py-1 rounded-full font-bold shadow-md backdrop-blur-md flex items-center gap-1.5"
      >
        <span
          :class="!isAvailable ? 'bg-white' : 'bg-green-500 animate-pulse'"
          class="w-2 h-2 rounded-full"
        ></span>
        <span>{{ !isAvailable ? 'Sold Out' : `${item.quantity} portions left` }}</span>
      </div>

      <!-- Price Pill (Bottom-Left) -->
      <div class="absolute bottom-3 left-3 bg-surface/95 backdrop-blur-md text-on-surface px-3 py-1 rounded-full shadow-md font-black text-sm">
        ₹{{ item.price }}
      </div>

      <!-- Floating Edit Button for Owner (Top-Right) -->
      <button
        v-if="isOwner"
        type="button"
        @click.stop="emit('edit', props.item)"
        class="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface/90 hover:bg-primary text-on-surface hover:text-on-primary backdrop-blur-md flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md hover:scale-105"
        title="Edit Dish"
        aria-label="Edit dish"
      >
        <span class="material-symbols-outlined text-[16px]">edit</span>
      </button>
    </div>

    <!-- Details Section -->
    <div class="p-4 sm:p-5 flex flex-col gap-2.5 flex-1">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <!-- Veg / Non-Veg Icon -->
          <span
            :title="isVegDish ? 'Pure Vegetarian' : 'Non-Vegetarian'"
            class="w-4 h-4 rounded-xs border flex items-center justify-center p-0.5 shrink-0"
            :class="isVegDish ? 'border-green-600' : 'border-red-600'"
          >
            <span class="w-2 h-2 rounded-full" :class="isVegDish ? 'bg-green-600' : 'bg-red-600'"></span>
          </span>
          <h3 class="font-extrabold text-on-surface group-hover:text-primary transition-colors text-base line-clamp-1">
            {{ item.name }}
          </h3>
        </div>
        <span class="text-[11px] text-on-surface-variant px-2.5 py-0.5 rounded-lg bg-surface-container font-semibold shrink-0">
          {{ item.category || 'Main Course' }}
        </span>
      </div>

      <p class="font-body-md text-xs text-on-surface-variant line-clamp-2">
        {{ item.description || item.desc || 'Delicious freshly prepared home-cooked specialty.' }}
      </p>

      <!-- Footer: Time & Action -->
      <div class="mt-auto pt-3 flex items-center justify-between border-t border-outline-variant/10">
        <span
          class="text-xs font-semibold flex items-center gap-1"
          :class="countdownInfo.isReady ? 'text-green-600' : 'text-amber-700 font-mono'"
        >
          <span
            class="material-symbols-outlined text-[16px]"
            :class="countdownInfo.isReady ? '' : 'animate-pulse'"
          >schedule</span>
          <span>{{ countdownInfo.text }}</span>
        </span>

        <button
          v-if="isOwner"
          type="button"
          @click.stop="emit('edit', props.item)"
          class="flex items-center gap-1.5 bg-primary/10 hover:bg-primary hover:text-on-primary text-primary text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer"
        >
          <span class="material-symbols-outlined text-[15px]">edit</span>
          <span>Edit Dish</span>
        </button>
        <button
          v-else
          type="button"
          @click.stop="emit('select', props.item)"
          class="flex items-center gap-1.5 bg-primary text-on-primary text-xs px-3.5 py-1.5 rounded-xl font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
        >
          <span class="material-symbols-outlined text-[15px]">restaurant_menu</span>
          <span>Order Now</span>
        </button>
      </div>
    </div>
  </div>
</template>
