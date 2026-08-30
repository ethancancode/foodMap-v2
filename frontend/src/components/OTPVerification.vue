<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore.js'

const props = defineProps({
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const authStore = useAuthStore()
const otp = ref(['', '', '', '', '', ''])
const isSubmitting = ref(false)
const errorMessage = ref('')

const isOtpComplete = computed(() => otp.value.every((d) => d.trim() !== ''))

async function handleVerify() {
  if (!isOtpComplete.value) return
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    const code = otp.value.join('')
    await authStore.verifyOtp({
      phone: props.user?.phone || '+919876543210',
      otp: code,
    })
    emit('action', { action: 'toast', payload: { message: 'Authentication successful!' } })
    if (authStore.currentRole === 'vendor') {
      emit('navigate', 'vendor_dashboard')
    } else {
      emit('navigate', 'food_radar')
    }
  } catch (err) {
    errorMessage.value = err.message || 'Invalid verification code. Please try again.'
    otp.value = ['', '', '', '', '', '']
  } finally {
    isSubmitting.value = false
  }
}

function handleResend() {
  emit('navigate', 'welcome')
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
        <h1 class="font-display-lg text-2xl font-bold text-on-surface">
          {{ authStore.isEnrolled ? 'Enter Authenticator Code' : 'Google Authenticator Setup' }}
        </h1>
        <p class="font-body-lg text-xs text-on-surface-variant max-w-[300px]">
          {{ authStore.isEnrolled ? 'Open Google Authenticator and enter your 6-digit code' : 'Scan the QR code with Google Authenticator to connect' }}
        </p>
      </div>

      <!-- QR Code if unenrolled -->
      <div v-if="!authStore.isEnrolled && authStore.qrCode" class="flex flex-col items-center gap-2 p-3 bg-surface rounded-xl border border-outline-variant/30 text-center">
        <img :src="authStore.qrCode" alt="QR Code" class="w-36 h-36 bg-white p-2 rounded-lg shadow-sm" />
        <span class="text-[11px] text-on-surface-variant">Scan with Google Authenticator to receive 6-digit codes.</span>
      </div>

      <!-- OTP Form -->
      <form @submit.prevent="handleVerify" class="flex flex-col gap-5">
        <div class="flex justify-center gap-2">
          <input
            v-for="(digit, idx) in otp"
            :key="idx"
            v-model="otp[idx]"
            type="text"
            inputmode="numeric"
            maxlength="1"
            class="w-11 h-14 bg-surface text-center font-headline-lg text-xl font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary rounded-xl shadow-sm border border-outline-variant/30"
          />
        </div>

        <span v-if="errorMessage" class="text-xs text-red-600 text-center font-medium">{{ errorMessage }}</span>

        <button
          type="submit"
          :disabled="!isOtpComplete || isSubmitting"
          class="w-full py-3.5 bg-primary hover:bg-primary/90 text-on-primary font-label-md text-sm font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <span v-if="!isSubmitting">Verify & Continue</span>
          <span v-else>Verifying...</span>
          <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
        </button>
      </form>

      <!-- Auxiliary Links -->
      <div class="flex flex-col items-center gap-2 pt-2 text-xs text-on-surface-variant">
        <button
          @click="emit('navigate', 'welcome')"
          class="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer mt-1"
        >
          Back to sign in
        </button>
      </div>

    </div>
  </div>
</template>
