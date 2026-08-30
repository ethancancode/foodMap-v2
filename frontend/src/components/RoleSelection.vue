<script setup>
import { ref } from 'vue'

const props = defineProps({
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const selectedRole = ref('resident')

function selectRole(role) {
  selectedRole.value = role
}

function handleContinue() {
  emit('role-switch', selectedRole.value)
  if (selectedRole.value === 'vendor') {
    emit('navigate', 'vendor_dashboard')
  } else {
    emit('navigate', 'food_radar')
  }
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface flex items-center justify-center p-container-margin">
    <div class="max-w-[720px] w-full mx-auto py-12 flex flex-col items-center">
      <!-- Header Section -->
      <div class="text-center mb-10">
        <div class="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 text-on-primary shadow-md">
          <span class="material-symbols-outlined text-[32px]">map</span>
        </div>
        <h1 class="font-display-lg text-3xl font-bold text-on-surface mb-2 tracking-tight">How will you use FoodMap today?</h1>
        <p class="font-body-lg text-sm text-on-surface-variant max-w-md mx-auto">Select your portal mode to enter. Each mode provides a dedicated experience.</p>
      </div>

      <!-- Role Selection Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10 w-full max-w-xl">
        <!-- Resident Card -->
        <button
          @click="selectRole('resident')"
          :class="selectedRole === 'resident' ? 'border-primary ring-2 ring-primary/40 bg-surface' : 'border-outline-variant/30 bg-surface-container hover:bg-surface-container-high'"
          class="relative flex flex-col items-start p-6 rounded-2xl border transition-all duration-200 shadow-sm text-left cursor-pointer"
        >
          <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-2xl">explore</span>
          </div>
          <h2 class="font-title-md font-bold text-base text-on-surface mb-1">Resident Portal</h2>
          <p class="font-body-md text-xs text-on-surface-variant leading-relaxed">Explore neighborhood map, order freshly cooked meals, and track active food radar.</p>
          
          <div
            :class="selectedRole === 'resident' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-variant border-outline-variant'"
            class="absolute top-5 right-5 w-5 h-5 rounded-full border flex items-center justify-center"
          >
            <span v-if="selectedRole === 'resident'" class="material-symbols-outlined text-xs">check</span>
          </div>
        </button>

        <!-- Vendor Card -->
        <button
          @click="selectRole('vendor')"
          :class="selectedRole === 'vendor' ? 'border-primary ring-2 ring-primary/40 bg-surface' : 'border-outline-variant/30 bg-surface-container hover:bg-surface-container-high'"
          class="relative flex flex-col items-start p-6 rounded-2xl border transition-all duration-200 shadow-sm text-left cursor-pointer"
        >
          <div class="w-12 h-12 rounded-xl bg-secondary-container/50 text-secondary flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-2xl">soup_kitchen</span>
          </div>
          <h2 class="font-title-md font-bold text-base text-on-surface mb-1">Kitchen / Vendor Hub</h2>
          <p class="font-body-md text-xs text-on-surface-variant leading-relaxed">Broadcast daily home-cooked portions, accept live orders, and manage kitchen status.</p>
          
          <div
            :class="selectedRole === 'vendor' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-variant border-outline-variant'"
            class="absolute top-5 right-5 w-5 h-5 rounded-full border flex items-center justify-center"
          >
            <span v-if="selectedRole === 'vendor'" class="material-symbols-outlined text-xs">check</span>
          </div>
        </button>
      </div>

      <!-- Action Button -->
      <button
        @click="handleContinue"
        class="bg-primary hover:bg-primary/90 text-on-primary font-label-md text-sm font-bold py-3.5 px-10 rounded-xl shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-2"
      >
        <span>Enter {{ selectedRole === 'vendor' ? 'Vendor Portal' : 'Resident Radar' }}</span>
        <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
      </button>
    </div>
  </div>
</template>
