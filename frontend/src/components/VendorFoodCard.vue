<script setup>
import { computed } from 'vue'
import { getCookingCountdown, currentTimestamp } from '../utils/countdown.js'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['edit', 'delete', 'adjust-portion', 'toggle-sold-out'])

// Reactive countdown that updates smoothly with shared ticker
const countdownInfo = computed(() => {
  void currentTimestamp.value // reactive dependency
  return getCookingCountdown(props.item)
})

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

function onEdit() {
  emit('edit', props.item)
}

function onDelete() {
  emit('delete', props.item)
}

function onAdjustPortion(delta) {
  emit('adjust-portion', { item: props.item, delta })
}

function onToggleSoldOut() {
  emit('toggle-sold-out', props.item)
}
</script>

<template>
  <div
    class="group flex flex-col bg-surface-container-lowest rounded-2xl sm:rounded-3xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden border border-outline-variant/20 hover:border-primary/30"
  >
    <!-- Image & Overlay Section -->
    <div class="relative w-full aspect-[16/10] bg-surface-container-high overflow-hidden">
      <img
        :src="item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'"
        :alt="item.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />

      <!-- Dark Gradient Overlay for readability -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none"></div>

      <!-- Live Portion Status Badge (Top-Left) -->
      <div
        :class="!isAvailable ? 'bg-red-600/90 text-white' : 'bg-surface/95 text-on-surface'"
        class="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold shadow-md backdrop-blur-md flex items-center gap-1.5"
      >
        <span
          :class="!isAvailable ? 'bg-white' : 'bg-green-500 animate-pulse'"
          class="w-2 h-2 rounded-full"
        ></span>
        <span>{{ !isAvailable ? 'Sold Out' : `${item.quantity} portion${item.quantity === 1 ? '' : 's'} left` }}</span>
      </div>

      <!-- Quick Action Buttons (Top-Right) -->
      <div class="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        <!-- Quick Edit -->
        <button
          type="button"
          @click.stop="onEdit"
          class="w-8 h-8 rounded-full bg-surface/90 hover:bg-primary text-on-surface hover:text-on-primary backdrop-blur-md flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md hover:scale-105"
          title="Edit dish details"
          aria-label="Edit dish"
        >
          <span class="material-symbols-outlined text-[16px]">edit</span>
        </button>

        <!-- Quick Delete -->
        <button
          type="button"
          @click.stop="onDelete"
          class="w-8 h-8 rounded-full bg-surface/90 hover:bg-red-600 text-on-surface hover:text-white backdrop-blur-md flex items-center justify-center transition-all duration-200 cursor-pointer shadow-md hover:scale-105"
          title="Delete dish"
          aria-label="Delete dish"
        >
          <span class="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </div>
    </div>

    <!-- Content Body -->
    <div class="p-4 sm:p-5 flex flex-col flex-1 gap-3">
      <!-- Title & Price -->
      <div class="flex justify-between items-start gap-2">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <!-- Veg / Non-Veg Icon -->
          <span
            :title="isVegDish ? 'Pure Vegetarian' : 'Non-Vegetarian'"
            class="w-4 h-4 rounded-xs border flex items-center justify-center p-0.5 shrink-0"
            :class="isVegDish ? 'border-green-600' : 'border-red-600'"
          >
            <span class="w-2 h-2 rounded-full" :class="isVegDish ? 'bg-green-600' : 'bg-red-600'"></span>
          </span>
          <h3
            @click="onEdit"
            class="font-extrabold text-on-surface text-base sm:text-lg line-clamp-1 hover:text-primary transition-colors cursor-pointer"
            :title="item.name"
          >
            {{ item.name }}
          </h3>
        </div>
        <span class="text-base sm:text-lg font-black text-primary shrink-0">₹{{ item.price }}</span>
      </div>

      <!-- Cooking Status & Category -->
      <div class="flex items-center gap-2 text-xs text-on-surface-variant flex-wrap">
        <span
          class="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md"
          :class="countdownInfo.isReady ? 'bg-green-500/10 text-green-700' : 'bg-amber-500/10 text-amber-700 font-mono'"
        >
          <span
            class="material-symbols-outlined text-[15px]"
            :class="countdownInfo.isReady ? 'text-green-600' : 'text-amber-600 animate-pulse'"
          >schedule</span>
          <span>{{ countdownInfo.text }}</span>
        </span>
        <span>•</span>
        <span class="font-medium text-on-surface-variant">{{ item.category || 'Main Course' }}</span>
      </div>

      <!-- Live Portion Quick Stepper -->
      <div class="flex items-center justify-between p-2.5 bg-surface-container rounded-2xl border border-outline-variant/10">
        <span class="text-xs font-bold text-on-surface-variant">Live Portions:</span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="onAdjustPortion(-1)"
            :disabled="item.quantity <= 0"
            class="w-8 h-8 rounded-xl bg-surface-container-lowest hover:bg-surface-container-high text-on-surface flex items-center justify-center font-bold text-sm disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-xs transition-colors"
            title="Decrease portion"
            aria-label="Decrease portion"
          >
            -
          </button>
          <span class="font-black text-sm text-primary w-7 text-center">{{ item.quantity || 0 }}</span>
          <button
            type="button"
            @click="onAdjustPortion(1)"
            class="w-8 h-8 rounded-xl bg-primary text-on-primary hover:bg-primary/90 flex items-center justify-center font-bold text-sm cursor-pointer shadow-xs transition-colors"
            title="Increase portion"
            aria-label="Increase portion"
          >
            +
          </button>
        </div>
      </div>

      <!-- Footer Buttons -->
      <div class="mt-auto pt-2 flex items-center gap-2 border-t border-outline-variant/10">
        <button
          type="button"
          @click="onEdit"
          class="py-2 px-3.5 rounded-xl text-xs bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
        >
          <span class="material-symbols-outlined text-[16px]">edit</span>
          <span>Edit</span>
        </button>

        <button
          type="button"
          @click="onToggleSoldOut"
          :class="!isAvailable ? 'bg-green-600/15 text-green-700 hover:bg-green-600/25 font-bold' : 'bg-surface-container text-on-surface hover:bg-surface-container-high font-semibold'"
          class="flex-1 py-2 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">{{ !isAvailable ? 'restart_alt' : 'block' }}</span>
          <span>{{ !isAvailable ? 'Re-stock & Go Live' : 'Mark as Sold Out' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
