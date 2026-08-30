<script setup>
import { ref } from 'vue'

const props = defineProps({
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const otp = ref(['1', '0', '2', '4', '', ''])

function handleVerify() {
  emit('action', { action: 'toast', payload: { message: 'Phone number verified successfully!' } })
  emit('navigate', 'food_radar')
}

function handleResend() {
  emit('action', { action: 'toast', payload: { message: 'OTP resent to +91 98765 43210' } })
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface flex items-center justify-center p-container-margin">
    <div class="w-full max-w-[440px] flex flex-col gap-6 bg-surface-container-low p-8 rounded-2xl shadow-md border border-outline-variant/20">
      
      <!-- Header -->
      <div class="flex flex-col items-center text-center gap-2">
        <div class="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
          <span class="material-symbols-outlined text-[28px]">phonelink_ring</span>
        </div>
        <h1 class="font-display-lg text-2xl font-bold text-on-surface">Verify your number</h1>
        <p class="font-body-lg text-xs text-on-surface-variant max-w-[300px]">
          We sent a 6-digit verification code to <span class="font-bold text-on-surface">+91 98765 43210</span>
        </p>
      </div>

      <!-- OTP Form -->
      <form @submit.prevent="handleVerify" class="flex flex-col gap-6">
        <div class="flex justify-center gap-2">
          <input
            v-for="(digit, idx) in otp"
            :key="idx"
            v-model="otp[idx]"
            type="text"
            maxlength="1"
            class="w-12 h-14 bg-surface text-center font-headline-lg text-xl font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary rounded-xl shadow-sm border border-outline-variant/30"
          />
        </div>

        <button
          type="submit"
          class="w-full py-3.5 bg-primary hover:bg-primary/90 text-on-primary font-label-md text-sm font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Verify & Continue</span>
          <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </form>

      <!-- Auxiliary Links -->
      <div class="flex flex-col items-center gap-2 pt-2 text-xs text-on-surface-variant">
        <div class="flex items-center gap-1.5">
          <span>Didn't receive code?</span>
          <button @click="handleResend" class="font-bold text-primary hover:underline cursor-pointer">
            Resend OTP
          </button>
        </div>
        <button
          @click="emit('navigate', 'welcome')"
          class="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer mt-1"
        >
          Change phone number
        </button>
      </div>

    </div>
  </div>
</template>
