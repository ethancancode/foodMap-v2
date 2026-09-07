<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '../stores/authStore.js'
import { authApi, vendorApi } from '../services/api.js'
import LocationPickerModal from './LocationPickerModal.vue'

const emit = defineEmits(['auth-success', 'explore-guest', 'role-selected'])

const authStore = useAuthStore()

// State Management
const currentStep = ref('roles') // 'roles' | 'phone' | 'otp' | 'vendor-onboarding' | 'success'
const selectedRole = ref('resident') // 'resident' | 'vendor'
const phoneNumber = ref('')
const phoneError = ref('')
const otpError = ref('')
const onboardingError = ref('')
const isSubmitting = ref(false)
const OTP_LENGTH = 6
const otpDigits = ref(Array(OTP_LENGTH).fill(''))
const otpInputs = ref([])
const resendTimer = ref(30)
let timerInterval = null

// Custom in-app Toast Notification state (replaces native HTML5 browser popups)
const toast = ref({
  show: false,
  message: '',
  type: 'warning',
  timer: null,
})

const formErrors = ref({
  chefName: false,
  kitchenName: false,
  pickupAddress: false,
})

function showToast(message, type = 'warning') {
  if (toast.value.timer) clearTimeout(toast.value.timer)
  toast.value = {
    show: true,
    message,
    type,
    timer: setTimeout(() => {
      toast.value.show = false
    }, 3800),
  }
}

// New Vendor Onboarding Details (Prompted ONLY for new vendor accounts after OTP)
const chefName = ref('')
const kitchenName = ref('')
const specialties = ref('')
const pickupAddress = ref('')
const coordinates = ref([73.0188, 19.0225])
const isLocating = ref(false)
const isMapModalOpen = ref(false)

// Step 5: Trust & Kitchen Story (Bio & Experience)
const experience = ref('')
const bio = ref('')

// Step 6: Kitchen Photos (PFP and Cover Banner)
const avatarImage = ref('')
const coverImage = ref('')
const avatarFileInput = ref(null)
const coverFileInput = ref(null)

const hasStoryContent = computed(() => {
  return Boolean(experience.value.trim() || bio.value.trim())
})

const hasPhotoContent = computed(() => {
  return Boolean(avatarImage.value || coverImage.value)
})

function handleAvatarFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    onboardingError.value = 'Profile picture should be less than 5MB'
    return
  }
  const reader = new FileReader()
  reader.onload = (event) => {
    avatarImage.value = event.target.result
  }
  reader.readAsDataURL(file)
}

function handleCoverFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    onboardingError.value = 'Cover banner should be less than 5MB'
    return
  }
  const reader = new FileReader()
  reader.onload = (event) => {
    coverImage.value = event.target.result
  }
  reader.readAsDataURL(file)
}

function removeAvatar() {
  avatarImage.value = ''
  if (avatarFileInput.value) avatarFileInput.value.value = ''
}

function removeCover() {
  coverImage.value = ''
  if (coverFileInput.value) coverFileInput.value.value = ''
}

function openMapModal() {
  isMapModalOpen.value = true
}

function handleLocationConfirmed(loc) {
  coordinates.value = loc.coordinates
  pickupAddress.value = loc.address
  formErrors.value.pickupAddress = false
  isMapModalOpen.value = false
}

async function detectCurrentLocation() {
  if (!('geolocation' in navigator)) return
  isLocating.value = true
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      coordinates.value = [lng, lat]
      try {
        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        )
        if (bdcRes.ok) {
          const data = await bdcRes.json()
          const locality = data.locality || data.neighbourhood || data.quarter || ''
          const city = data.city || data.principalSubdivision || 'Navi Mumbai'
          pickupAddress.value = locality ? `${locality}, ${city}` : city
        }
      } catch (e) {
        pickupAddress.value = 'Seawoods, Navi Mumbai'
      } finally {
        isLocating.value = false
      }
    },
    (err) => {
      console.warn('Geolocation declined', err.message)
      pickupAddress.value = 'Seawoods, Navi Mumbai'
      isLocating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

function formattedPhone() {
  return `+91${phoneNumber.value}`
}

const isOtpComplete = computed(() => {
  return otpDigits.value.every((digit) => digit.trim() !== '')
})

function selectRole(role) {
  selectedRole.value = role
  phoneError.value = ''
  currentStep.value = 'phone'
  emit('role-selected', role)
}

function goToRoles() {
  currentStep.value = 'roles'
  phoneError.value = ''
}

function sanitizePhone(e) {
  phoneNumber.value = e.target.value.replace(/\D/g, '').slice(0, 10)
  if (phoneError.value) phoneError.value = ''
}

function startResendCountdown() {
  resendTimer.value = 30
  clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    if (resendTimer.value > 0) {
      resendTimer.value--
    } else {
      clearInterval(timerInterval)
    }
  }, 1000)
}

async function requestOtp() {
  if (phoneNumber.value.length !== 10) {
    phoneError.value = 'Please enter a valid 10-digit mobile number'
    return
  }

  isSubmitting.value = true
  phoneError.value = ''
  try {
    await authStore.requestOtp({
      phone: formattedPhone(),
      role: selectedRole.value,
    })
    currentStep.value = 'otp'
    otpError.value = ''
    otpDigits.value = Array(OTP_LENGTH).fill('')
    startResendCountdown()
    await nextTick()
    if (otpInputs.value[0]) {
      otpInputs.value[0].focus()
    }
  } catch (err) {
    phoneError.value = err.message || 'Could not initiate authentication. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

function setOtpInputRef(el, index) {
  if (el) {
    otpInputs.value[index] = el
  }
}

function handleOtpInput(event, index) {
  const value = event.target.value.replace(/\D/g, '')
  otpDigits.value[index] = value.slice(-1)

  if (value && index < OTP_LENGTH - 1) {
    const nextInput = otpInputs.value[index + 1]
    if (nextInput) nextInput.focus()
  }
}

function handleOtpBackspace(event, index) {
  if (!otpDigits.value[index] && index > 0) {
    const prevInput = otpInputs.value[index - 1]
    if (prevInput) {
      prevInput.focus()
      otpDigits.value[index - 1] = ''
    }
  }
}

function handleOtpPaste(event) {
  event.preventDefault()
  const pastedData = (event.clipboardData || window.clipboardData)
    .getData('text')
    .replace(/\D/g, '')
    .slice(0, OTP_LENGTH)

  if (pastedData) {
    pastedData.split('').forEach((char, idx) => {
      if (idx < OTP_LENGTH) otpDigits.value[idx] = char
    })
    const lastIdx = Math.min(pastedData.length, OTP_LENGTH - 1)
    if (otpInputs.value[lastIdx]) {
      otpInputs.value[lastIdx].focus()
    }
  }
}

async function resendOtp() {
  otpDigits.value = Array(OTP_LENGTH).fill('')
  otpError.value = ''
  try {
    await authStore.requestOtp({
      phone: formattedPhone(),
      role: selectedRole.value,
    })
  } catch (err) {
    otpError.value = err.message || 'Could not refresh setup. Please try again.'
  }
  startResendCountdown()
  if (otpInputs.value[0]) {
    otpInputs.value[0].focus()
  }
}

async function verifyOtp() {
  if (!isOtpComplete.value) return
  isSubmitting.value = true
  otpError.value = ''

  try {
    const res = await authStore.verifyOtp({
      phone: formattedPhone(),
      otp: otpDigits.value.join(''),
    })

    const isNewUser = Boolean(res?.isNewUser)
    const isVendor = (authStore.user?.role === 'vendor' || selectedRole.value === 'vendor')

    // If it's a new vendor account, prompt for kitchen setup before entering
    if (isNewUser && isVendor) {
      currentStep.value = 'vendor-onboarding'
      if (!pickupAddress.value) {
        detectCurrentLocation()
      }
    } else {
      // Returning user or resident: go straight to dashboard/app
      currentStep.value = 'success'
      emit('auth-success', {
        role: authStore.user?.role || selectedRole.value,
        phone: phoneNumber.value,
      })
    }
  } catch (err) {
    otpError.value = err.message || 'Invalid verification code. Please try again.'
    otpDigits.value = Array(OTP_LENGTH).fill('')
    if (otpInputs.value[0]) {
      otpInputs.value[0].focus()
    }
  } finally {
    isSubmitting.value = false
  }
}

function proceedToStory() {
  formErrors.value = {
    chefName: false,
    kitchenName: false,
    pickupAddress: false,
  }

  if (!kitchenName.value.trim() && !chefName.value.trim()) {
    formErrors.value.chefName = true
    formErrors.value.kitchenName = true
    onboardingError.value = 'Please enter your name or kitchen name'
    showToast('Please enter your name or kitchen name to continue', 'warning')
    return
  }

  if (!pickupAddress.value.trim()) {
    formErrors.value.pickupAddress = true
    onboardingError.value = 'Please choose your kitchen pickup location'
    showToast('Please set your kitchen pickup location', 'warning')
    return
  }

  onboardingError.value = ''
  currentStep.value = 'vendor-story'
}

function proceedToPhotos(skipStory = false) {
  if (skipStory) {
    experience.value = ''
    bio.value = ''
  }
  onboardingError.value = ''
  currentStep.value = 'vendor-photos'
}

async function finalizeVendorSetup({ skipPhotos = false } = {}) {
  isSubmitting.value = true
  onboardingError.value = ''

  try {
    const payload = {
      name: chefName.value.trim() || undefined,
      businessName: kitchenName.value.trim() || (chefName.value.trim() ? `${chefName.value.trim()}'s Kitchen` : 'My Kitchen'),
      category: specialties.value.trim() || 'Home Cook • Homemade Specialties',
      pickupAddress: pickupAddress.value.trim(),
      coordinates: coordinates.value && coordinates.value.length === 2 ? coordinates.value : [73.0188, 19.0225],
      experience: experience.value.trim() || undefined,
      bio: bio.value.trim() || undefined,
      avatar: skipPhotos ? '' : (avatarImage.value || ''),
      coverImage: skipPhotos ? '' : (coverImage.value || ''),
    }

    // Atomically finalizes the vendor account in DB and saves session token
    await authStore.completeOnboarding(payload)

    currentStep.value = 'success'
    emit('auth-success', {
      role: 'vendor',
      phone: phoneNumber.value,
    })
  } catch (err) {
    onboardingError.value = err.response?.data?.message || err.message || 'Could not save kitchen profile. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}

function handleGuestExplore() {
  emit('explore-guest')
}

function handleComplete() {
  emit('auth-success', {
    role: selectedRole.value,
    phone: phoneNumber.value,
  })
}

onMounted(() => {
  // Inject Google Fonts dynamically if not already in document
  if (!document.getElementById('foodmap-fonts')) {
    const link = document.createElement('link')
    link.id = 'foodmap-fonts'
    link.rel = 'stylesheet'
    link.href =
      'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:wght,FILL@300..700,0..1&display=swap'
    document.head.appendChild(link)
  }
})

onBeforeUnmount(() => {
  clearInterval(timerInterval)
})
</script>

<template>
<div class="welcome-container">
    <!-- Ambient Background Lighting Orbs -->
    <div class="ambient-orb ambient-orb-1"></div>
    <div class="ambient-orb ambient-orb-2"></div>

    <main class="main-wrapper">
      <div class="card-shell">
        <!-- LEFT COLUMN: Editorial Visual Banner -->
        <div class="visual-pane">
          <!-- Background Image with Scrim Overlay -->
          <div class="hero-image-layer">
            <div class="hero-image"></div>
            <div class="gradient-scrim-vertical"></div>
            <div class="gradient-scrim-horizontal"></div>
          </div>

          <!-- Animated Topographic / Radar Lines -->
          <div class="map-overlay">
            <svg class="map-svg" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" stroke="rgba(255, 255, 255, 0.25)" stroke-width="1.5">
                <path d="M100,100 C200,300 400,100 600,400 S800,200 900,500" stroke-dasharray="6,6" class="animated-path"></path>
                <path d="M50,400 C150,500 300,300 500,600 S700,400 850,700" stroke-dasharray="6,6" class="animated-path-reverse"></path>
                <circle class="radar-dot dot-1" cx="600" cy="400" r="5" fill="#f26b50"></circle>
                <circle class="radar-ring ring-1" cx="600" cy="400" r="14" stroke="#f26b50" stroke-width="1.5"></circle>
                <circle class="radar-dot dot-2" cx="300" cy="500" r="6" fill="#f26b50"></circle>
                <circle class="radar-ring ring-2" cx="300" cy="500" r="18" stroke="#f26b50" stroke-width="1.5"></circle>
              </g>
            </svg>
          </div>

          <!-- Editorial Text Content -->
          <div class="visual-content">
            <div class="content-limit">
              <div class="live-pill">
                <span class="live-icon-badge">
                  <span class="material-symbols-outlined icon-sm">my_location</span>
                </span>
                <span class="live-pill-text">Live Near You</span>
              </div>

              <h1 class="visual-title">
                Find what's<br />cooking around you.
              </h1>

              <p class="visual-description">
                Discover food that's actually available nearby, right now. Real-time updates from your neighborhood favorites.
              </p>

              <!-- Live Stats Micro-Bar -->
              <div class="live-stats-bar">
                <div class="stat-item">
                  <span class="stat-value">18+</span>
                  <span class="stat-label">Active Kitchens</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <span class="stat-value">&lt; 15 min</span>
                  <span class="stat-label">Fresh & Ready</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <span class="stat-value">4.9 ★</span>
                  <span class="stat-label">Community Rating</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Authentication & Entry Card -->
        <div class="form-pane">
          <div class="form-container">
            <!-- Brand Logo & Header -->
            <div class="brand-header">
              <div class="logo-wrapper">
                <img
                  alt="FoodMap Logo"
                  class="brand-logo"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBOq5Kssn8nFgqkds1fpjaPT4Srd8-mAGUyswnJaQdmQ9YhLdS2t7VFjAANBVUEmUuatg2OwQdft9JwGDlyCho23QbD2hvKXTdMrqUtbblmwnNlUy2LWs0zL4jOx4GnKl9Afu54HyI1KMzTnaiVmbp1qAqe5GpJdjBIjYZmHQ5mSeWBHSU3JzJoAORzoqCFtobBNqBw0o25DAUJg5tnwUPEijUv_kL4uSn-DuSGeukjz7igAJLdjHqn"
                />
              </div>

              <Transition name="fade" mode="out-in">
                <div v-if="currentStep === 'roles'" key="header-roles" class="heading-group">
                  <h2 class="title-main">Welcome to FoodMap</h2>
                  <p class="subtitle-main">
                    We'll send you a one-time verification code to securely log in.
                  </p>
                </div>
                <div v-else-if="currentStep === 'phone'" key="header-phone" class="heading-group">
                  <div class="back-link" @click="goToRoles">
                    <span class="material-symbols-outlined icon-back">arrow_back</span>
                    <span>Back</span>
                  </div>
                  <h2 class="title-main">
                    {{ selectedRole === 'resident' ? 'Resident Login' : 'Vendor Sign In' }}
                  </h2>
                  <p class="subtitle-main">
                    Enter your mobile number to receive an instant verification code.
                  </p>
                </div>
                <div v-else-if="currentStep === 'otp'" key="header-otp" class="heading-group">
                  <div class="back-link" @click="() => { currentStep = 'phone'; otpError = '' }">
                    <span class="material-symbols-outlined icon-back">arrow_back</span>
                    <span>Change Number</span>
                  </div>
                  <h2 class="title-main">
                    {{ authStore.isEnrolled ? 'Enter 6-Digit Code' : 'Google Authenticator Setup' }}
                  </h2>
                  <p class="subtitle-main">
                    {{ authStore.isEnrolled ? 'Open Google Authenticator on your phone' : 'Scan the QR code to connect your account' }}
                  </p>
                </div>
                <div v-else-if="currentStep === 'vendor-onboarding'" key="header-onboarding" class="heading-group">
                  <h2 class="title-main">Set Up Kitchen Profile 👨‍🍳</h2>
                  <p class="subtitle-main">
                    Welcome to FoodMap! Tell your neighborhood about your home kitchen and specialties.
                  </p>
                </div>
                <div v-else-if="currentStep === 'vendor-story'" key="header-story" class="heading-group">
                  <div class="back-link" @click="() => { currentStep = 'vendor-onboarding'; onboardingError = '' }">
                    <span class="material-symbols-outlined icon-back">arrow_back</span>
                    <span>Back to Details</span>
                  </div>
                  <h2 class="title-main">Story & Experience 📖</h2>
                  <p class="subtitle-main">
                    Tell your neighborhood what makes your cooking special (optional, can skip for now).
                  </p>
                </div>
                <div v-else-if="currentStep === 'vendor-photos'" key="header-photos" class="heading-group">
                  <div class="back-link" @click="() => { currentStep = 'vendor-story'; onboardingError = '' }">
                    <span class="material-symbols-outlined icon-back">arrow_back</span>
                    <span>Back to Story</span>
                  </div>
                  <h2 class="title-main">Kitchen Photos 📸</h2>
                  <p class="subtitle-main">
                    Add a profile picture and cover banner for your kitchen (optional, can skip for now).
                  </p>
                </div>
                <div v-else-if="currentStep === 'success'" key="header-success" class="heading-group">
                  <h2 class="title-main">You're All Set!</h2>
                  <p class="subtitle-main">
                    Redirecting you to your neighborhood map...
                  </p>
                </div>
              </Transition>
            </div>

            <!-- Dynamic Interactive Steps -->
            <Transition name="slide-fade" mode="out-in">
              <!-- STEP 1: Role Selection -->
              <div v-if="currentStep === 'roles'" key="step-roles" class="action-stack">
                <!-- Resident Entry Point -->
                <button
                  type="button"
                  class="action-card primary-card"
                  @click="selectRole('resident')"
                >
                  <div class="card-content-wrap">
                    <div class="card-title-row">
                      <span class="material-symbols-outlined card-icon">restaurant</span>
                      <span class="card-title">Sign in as Resident</span>
                    </div>
                    <p class="card-description">Discover food cooking nearby</p>
                  </div>
                  <span class="material-symbols-outlined chevron-indicator">arrow_forward</span>
                  <div class="hover-shimmer"></div>
                </button>

                <!-- Vendor Entry Point -->
                <button
                  type="button"
                  class="action-card secondary-card"
                  @click="selectRole('vendor')"
                >
                  <div class="card-content-wrap">
                    <div class="card-title-row">
                      <span class="material-symbols-outlined card-icon">storefront</span>
                      <span class="card-title">Sign in as Vendor</span>
                    </div>
                    <p class="card-description">Share what you are selling today</p>
                  </div>
                  <span class="material-symbols-outlined chevron-indicator">arrow_forward</span>
                  <div class="hover-shimmer"></div>
                </button>

                <!-- Divider -->
                <div class="divider-row">
                  <div class="divider-line"></div>
                  <span class="divider-text">Or</span>
                  <div class="divider-line"></div>
                </div>

                <!-- Guest / Explore Option -->
                <button
                  type="button"
                  class="guest-btn"
                  @click="handleGuestExplore"
                >
                  <span class="material-symbols-outlined icon-guest">explore</span>
                  <span>Explore as Guest</span>
                </button>
              </div>

              <!-- STEP 2: Phone Input (Clean & Simple) -->
              <form
                v-else-if="currentStep === 'phone'"
                key="step-phone"
                class="phone-form"
                novalidate
                @submit.prevent="requestOtp"
              >
                <div class="input-group">
                  <label for="mobile" class="input-label">Mobile Number</label>
                  <div class="phone-input-field" :class="{ 'has-error': phoneError }">
                    <span class="country-code">+91</span>
                    <input
                      id="mobile"
                      v-model="phoneNumber"
                      type="tel"
                      maxlength="10"
                      placeholder="98765 43210"
                      class="phone-input"
                      autofocus
                      @input="sanitizePhone"
                    />
                    <span
                      v-if="phoneNumber.length === 10"
                      class="material-symbols-outlined check-icon"
                    >
                      check_circle
                    </span>
                  </div>
                  <span v-if="phoneError" class="error-msg">{{ phoneError }}</span>
                </div>

                <button
                  type="submit"
                  class="submit-btn"
                  :disabled="phoneNumber.length !== 10 || isSubmitting"
                >
                  <span v-if="!isSubmitting">Send Verification Code</span>
                  <span v-else class="loading-state">
                    <span class="spinner"></span>
                    Sending...
                  </span>
                </button>
              </form>

              <!-- STEP 3: OTP / TOTP Input -->
              <form
                v-else-if="currentStep === 'otp'"
                key="step-otp"
                class="otp-form"
                novalidate
                @submit.prevent="verifyOtp"
              >
                <!-- Initial Enrollment QR Code (ONLY shown if unenrolled) -->
                <div v-if="!authStore.isEnrolled && authStore.qrCode" class="totp-qr-card">
                  <p class="totp-instruction">Scan with Google Authenticator</p>
                  <img
                    :src="authStore.qrCode"
                    alt="Google Authenticator QR Code"
                    class="totp-qr-img"
                  />
                  <p class="totp-subtext">Open Google Authenticator on your phone and scan this code to enroll.</p>
                </div>

                <!-- Returning Login Hint (NO QR) -->
                <div v-else class="totp-login-hint">
                  <span class="material-symbols-outlined text-primary text-[20px]">security</span>
                  <span>Enter the current 6-digit code from Google Authenticator for +91 {{ phoneNumber }}.</span>
                </div>

                <div class="otp-inputs-grid">
                  <input
                    v-for="(digit, index) in otpDigits"
                    :key="index"
                    :ref="(el) => setOtpInputRef(el, index)"
                    v-model="otpDigits[index]"
                    type="text"
                    inputmode="numeric"
                    maxlength="1"
                    class="otp-box"
                    @input="handleOtpInput($event, index)"
                    @keydown.delete="handleOtpBackspace($event, index)"
                    @paste="handleOtpPaste"
                  />
                </div>

                <span v-if="otpError" class="error-msg otp-error-msg">{{ otpError }}</span>

                <div v-if="!authStore.isEnrolled" class="resend-row">
                  <span v-if="resendTimer > 0" class="timer-text">
                    Refresh setup in {{ resendTimer }}s
                  </span>
                  <button
                    v-else
                    type="button"
                    class="resend-btn"
                    @click="resendOtp"
                  >
                    Refresh Setup QR
                  </button>
                </div>

                <button
                  type="submit"
                  class="submit-btn"
                  :disabled="!isOtpComplete || isSubmitting"
                >
                  <span v-if="!isSubmitting">
                    {{ authStore.isEnrolled ? 'Verify & Continue' : 'Complete Setup & Continue' }}
                  </span>
                  <span v-else class="loading-state">
                    <span class="spinner"></span>
                    Verifying...
                  </span>
                </button>
              </form>

              <!-- STEP 4: Vendor Onboarding (ONLY for brand new vendor accounts) -->
              <form
                v-else-if="currentStep === 'vendor-onboarding'"
                key="step-vendor-onboarding"
                class="phone-form"
                novalidate
                @submit.prevent="proceedToStory"
              >
                <div class="vendor-setup-section">
                  <div class="input-group">
                    <label for="onboarding-chef-name" class="input-label">Chef / Your Name</label>
                    <div class="custom-input-field" :class="{ 'has-field-error': formErrors.chefName }">
                      <span class="material-symbols-outlined input-icon">person</span>
                      <input
                        id="onboarding-chef-name"
                        v-model="chefName"
                        type="text"
                        placeholder="e.g. Priya Sharma"
                        class="text-input"
                        @input="formErrors.chefName = false; formErrors.kitchenName = false"
                      />
                    </div>
                  </div>

                  <div class="input-group">
                    <label for="onboarding-kitchen-name" class="input-label">Kitchen / Stall Name</label>
                    <div class="custom-input-field" :class="{ 'has-field-error': formErrors.kitchenName }">
                      <span class="material-symbols-outlined input-icon">soup_kitchen</span>
                      <input
                        id="onboarding-kitchen-name"
                        v-model="kitchenName"
                        type="text"
                        placeholder="e.g. Priya's Homestyle Kitchen"
                        class="text-input"
                        @input="formErrors.kitchenName = false; formErrors.chefName = false"
                      />
                    </div>
                  </div>

                  <div class="input-group">
                    <div class="field-label-row">
                      <label for="onboarding-specialties" class="input-label">Specialties / Cuisine</label>
                      <span class="optional-tag">Optional</span>
                    </div>
                    <div class="custom-input-field">
                      <span class="material-symbols-outlined input-icon">restaurant_menu</span>
                      <input
                        id="onboarding-specialties"
                        v-model="specialties"
                        type="text"
                        placeholder="e.g. North Indian, Parathas, Healthy Thali"
                        class="text-input"
                      />
                    </div>
                  </div>

                  <div class="input-group">
                    <label for="onboarding-pickup-address" class="input-label">Kitchen Pickup Location</label>
                    <div
                      class="custom-input-field clickable-input-field"
                      :class="{ 'has-field-error': formErrors.pickupAddress }"
                      @click="openMapModal"
                    >
                      <span class="material-symbols-outlined input-icon">location_on</span>
                      <input
                        id="onboarding-pickup-address"
                        v-model="pickupAddress"
                        type="text"
                        placeholder="Tap to set location..."
                        class="text-input cursor-pointer"
                        readonly
                        @click="openMapModal"
                      />
                      <button type="button" class="map-open-pill" @click.stop="openMapModal">
                        <span class="material-symbols-outlined text-[15px]">map</span>
                        <span>Pin</span>
                      </button>
                    </div>
                    <p class="field-hint-text">
                      Tap above to drop your exact kitchen pin on the map or use live GPS.
                    </p>
                  </div>
                </div>

                <span v-if="onboardingError" class="error-msg">{{ onboardingError }}</span>

                <button
                  type="submit"
                  class="submit-btn"
                  :disabled="isSubmitting"
                >
                  <span>Continue→</span>
                </button>
              </form>

              <!-- STEP 5: Story & Experience (Optional, separate step) -->
              <form
                v-else-if="currentStep === 'vendor-story'"
                key="step-vendor-story"
                class="phone-form"
                novalidate
                @submit.prevent="proceedToPhotos(false)"
              >
                <div class="vendor-setup-section">
                  <div class="input-group">
                    <div class="field-label-row">
                      <label for="onboarding-experience" class="input-label">Cooking Experience & Trust</label>
                      <span class="optional-tag">Optional</span>
                    </div>
                    <div class="custom-input-field">
                      <span class="material-symbols-outlined input-icon">military_tech</span>
                      <input
                        id="onboarding-experience"
                        v-model="experience"
                        type="text"
                        placeholder="e.g. 5+ years home cooking, family secret recipes..."
                        class="text-input"
                      />
                    </div>
                    <p class="field-hint-text">
                      Highlight your background, culinary tradition, or years of cooking experience.
                    </p>
                  </div>

                  <div class="input-group">
                    <div class="field-label-row">
                      <label for="onboarding-bio" class="input-label">About the Chef / Story</label>
                      <span class="optional-tag">Optional</span>
                    </div>
                    <div class="custom-textarea-field">
                      <textarea
                        id="onboarding-bio"
                        v-model="bio"
                        rows="4"
                        placeholder="Share your culinary journey, what makes your home-cooked meals special, or your kitchen standards..."
                        class="story-textarea"
                      ></textarea>
                    </div>
                    <p class="field-hint-text">
                      A warm personal bio helps neighbors connect with and trust your home kitchen.
                    </p>
                  </div>
                </div>

                <span v-if="onboardingError" class="error-msg">{{ onboardingError }}</span>

                <div class="single-action-wrap">
                  <button
                    :type="hasStoryContent ? 'submit' : 'button'"
                    class="dynamic-action-btn"
                    :class="{ 'is-active': hasStoryContent }"
                    @click="hasStoryContent ? null : proceedToPhotos(true)"
                  >
                    <Transition name="btn-fade" mode="out-in">
                      <span :key="hasStoryContent ? 'continue' : 'skip'">
                        {{ hasStoryContent ? 'Continue →' : 'Skip for now' }}
                      </span>
                    </Transition>
                  </button>
                </div>
              </form>

              <!-- STEP 6: Kitchen Photos & Branding (Optional) -->
              <div
                v-else-if="currentStep === 'vendor-photos'"
                key="step-vendor-photos"
                class="phone-form"
              >
                <div class="vendor-photos-section">
                  <!-- Cover Photo Upload Section -->
                  <div class="photo-upload-group">
                    <div class="photo-upload-header">
                      <label class="input-label photo-header-label">Kitchen Cover Banner</label>
                      <span class="optional-tag">Optional</span>
                    </div>
                    
                    <div 
                      class="cover-banner-preview"
                      :class="{ 'has-cover': Boolean(coverImage) }"
                      @click="coverFileInput?.click()"
                    >
                      <img
                        v-if="coverImage"
                        :src="coverImage"
                        alt="Cover banner preview"
                        class="cover-banner-img"
                      />
                      <div v-else class="cover-banner-placeholder">
                        <span class="material-symbols-outlined text-3xl text-primary/80">add_photo_alternate</span>
                        <span class="text-xs font-bold text-on-surface mt-1">Upload Cover Banner</span>
                        <span class="text-[11px] text-on-surface-variant">Recommended: Landscape photo of your kitchen</span>
                      </div>

                      <button 
                        v-if="coverImage" 
                        type="button" 
                        class="photo-remove-btn"
                        title="Remove Cover Photo"
                        @click.stop="removeCover"
                      >
                        <span class="material-symbols-outlined text-[15px]">close</span>
                      </button>
                    </div>
                    <input
                      ref="coverFileInput"
                      type="file"
                      accept="image/*"
                      class="hidden-file-input"
                      @change="handleCoverFileChange"
                    />
                  </div>

                  <!-- Profile Picture (PFP) Upload Section -->
                  <div class="photo-upload-group">
                    <div class="photo-upload-header">
                      <label class="input-label photo-header-label">Chef Profile Picture</label>
                      <span class="optional-tag">Optional</span>
                    </div>

                    <div class="avatar-upload-row">
                      <div 
                        class="avatar-circle-preview"
                        :class="{ 'has-avatar': Boolean(avatarImage) }"
                        @click="avatarFileInput?.click()"
                      >
                        <img
                          v-if="avatarImage"
                          :src="avatarImage"
                          alt="Profile photo preview"
                          class="avatar-circle-img"
                        />
                        <div v-else class="avatar-circle-placeholder">
                          <span class="text-xl font-bold text-primary">
                            {{ (chefName || kitchenName || 'K').charAt(0).toUpperCase() }}
                          </span>
                        </div>

                        <button 
                          v-if="avatarImage" 
                          type="button" 
                          class="avatar-remove-btn"
                          title="Remove Profile Picture"
                          @click.stop="removeAvatar"
                        >
                          <span class="material-symbols-outlined text-[13px]">close</span>
                        </button>
                      </div>

                      <div class="avatar-upload-action">
                        <button
                          type="button"
                          class="upload-trigger-btn"
                          @click="avatarFileInput?.click()"
                        >
                          <span class="material-symbols-outlined text-[16px]">cloud_upload</span>
                          <span>{{ avatarImage ? 'Change Photo' : 'Upload Photo' }}</span>
                        </button>
                        <span class="text-[11px] text-on-surface-variant">Square headshot or chef photo</span>
                      </div>
                    </div>
                    <input
                      ref="avatarFileInput"
                      type="file"
                      accept="image/*"
                      class="hidden-file-input"
                      @change="handleAvatarFileChange"
                    />
                  </div>
                </div>

                <span v-if="onboardingError" class="error-msg">{{ onboardingError }}</span>

                <div class="single-action-wrap">
                  <button
                    type="button"
                    class="dynamic-action-btn"
                    :class="{ 'is-active': hasPhotoContent }"
                    :disabled="isSubmitting"
                    @click="finalizeVendorSetup({ skipPhotos: !hasPhotoContent })"
                  >
                    <span v-if="isSubmitting" class="loading-state">
                      <span class="spinner"></span>
                      Saving...
                    </span>
                    <Transition v-else name="btn-fade" mode="out-in">
                      <span :key="hasPhotoContent ? 'launch' : 'skip'">
                        {{ hasPhotoContent ? 'Complete & Launch 🚀' : 'Skip for now' }}
                      </span>
                    </Transition>
                  </button>
                </div>
              </div>
              <!-- STEP 5: Success State -->
              <div v-else-if="currentStep === 'success'" key="step-success" class="success-state">
                <div class="success-icon-wrap">
                  <span class="material-symbols-outlined success-icon">task_alt</span>
                </div>
                <p class="success-role-badge">
                  Logged in as {{ selectedRole === 'resident' ? 'Resident' : 'Vendor' }}
                </p>
                <button type="button" class="submit-btn" @click="handleComplete">
                  Enter FoodMap
                </button>
              </div>
            </Transition>

            <!-- Footer / Terms & Privacy Notice -->
            <div class="footer-terms">
              <p class="terms-text">
                By continuing, you agree to our
                <a href="#terms" class="terms-link">Terms of Service</a> and
                <a href="#privacy" class="terms-link">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Interactive Location Picker Modal Canvas -->
    <LocationPickerModal
      :is-open="isMapModalOpen"
      :initial-coordinates="coordinates"
      :initial-address="pickupAddress"
      @confirm="handleLocationConfirmed"
      @close="isMapModalOpen = false"
    />

    <!-- Custom In-App Toast Notification (Replaces native browser HTML5 popups) -->
    <Teleport to="body">
      <Transition name="toast-slide">
        <div
          v-if="toast.show"
          class="foodmap-toast-banner"
          :class="`toast-${toast.type}`"
          role="alert"
        >
          <div class="toast-card">
            <div class="toast-icon-wrap">
              <span class="material-symbols-outlined text-[20px]">
                {{ toast.type === 'error' ? 'error' : toast.type === 'success' ? 'check_circle' : 'warning' }}
              </span>
            </div>
            <div class="toast-content">
              <span class="toast-title">{{ toast.type === 'warning' ? 'Required Details' : toast.type === 'error' ? 'Attention' : 'Notice' }}</span>
              <span class="toast-message">{{ toast.message }}</span>
            </div>
            <button type="button" class="toast-close-btn" @click="toast.show = false" aria-label="Dismiss toast">
              <span class="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ==========================================================================
   CSS Variables & Design Tokens (FoodMap Design System)
   ========================================================================== */
.welcome-container {
  --color-primary: #a93620;
  --color-primary-container: #f26b50;
  --color-on-primary: #ffffff;
  --color-background: #f9f9ff;
  --color-surface: #ffffff;
  --color-surface-container: #e7eefe;
  --color-surface-container-high: #e2e8f8;
  --color-surface-container-highest: #dce2f3;
  --color-surface-container-low: #f0f3ff;
  --color-on-surface: #151c27;
  --color-on-surface-variant: #58413d;
  --color-inverse-surface: #2a313d;
  --color-outline-variant: #dfbfb9;
  --color-success: #1b8744;

  --font-display: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  position: relative;
  min-height: 100vh;
  width: 100%;
  background-color: var(--color-background);
  font-family: var(--font-body);
  color: var(--color-on-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-x: hidden;
  padding: 1rem;
  box-sizing: border-box;
}

/* Background Ambient Lighting */
.ambient-orb {
  position: fixed;
  border-radius: 9999px;
  pointer-events: none;
  z-index: 0;
  filter: blur(100px);
}

.ambient-orb-1 {
  top: -10%;
  left: -10%;
  width: 45vw;
  height: 45vw;
  max-width: 500px;
  max-height: 500px;
  background: rgba(242, 107, 80, 0.15);
}

.ambient-orb-2 {
  bottom: -10%;
  right: -10%;
  width: 50vw;
  height: 50vw;
  max-width: 600px;
  max-height: 600px;
  background: rgba(225, 227, 229, 0.5);
  filter: blur(130px);
}

/* Card Shell */
.main-wrapper {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 1200px;
  display: flex;
  justify-content: center;
}

.card-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  background: var(--color-surface);
  border-radius: 1.75rem;
  overflow: hidden;
  box-shadow: 0 25px 60px -15px rgba(21, 28, 39, 0.12),
              0 0 0 1px rgba(223, 191, 185, 0.25);
  min-height: 640px;
}

@media (min-width: 1024px) {
  .card-shell {
    flex-direction: row;
    height: 700px;
    min-height: 700px;
    max-height: 700px;
  }
}

/* ==========================================================================
   LEFT COLUMN: Visual Pane
   ========================================================================== */
.visual-pane {
  display: none;
  position: relative;
  overflow: hidden;
  background-color: var(--color-surface-container);
  height: 100%;
}

@media (min-width: 1024px) {
  .visual-pane {
    display: flex;
    flex-direction: column;
    width: 58%;
    height: 100%;
    min-height: 100%;
    max-height: 100%;
  }
}

.hero-image-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.hero-image {
  position: absolute;
  inset: 0;
  background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCc2q59U-BoLMDHm9xJ1Vdyh9fhX8sff1HyNNhh7OS-wJ1MLTa2ppY94MdUREiKA9cYXj88IbAQbutm2T5Yq2b4bLJUENaYmKDbOWkabAshFkVHLOHU-M9HtMoBUjYTLAWMxArChP9rIZwiq2OZ9xvt1vi2z0eBS5rMYVK7VwPnerXJzkbRyvJPCbFqVQdPFhNLcn_QvXMfj9dRkjMcQeEzNU_hkOOrpi8nl9HA9bQPB6aFcSrja6Zv');
  background-size: cover;
  background-position: center;
  transform: none !important;
}

.gradient-scrim-vertical {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(21, 28, 39, 0.92) 0%,
    rgba(21, 28, 39, 0.55) 45%,
    rgba(21, 28, 39, 0.15) 100%
  );
}

.gradient-scrim-horizontal {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to right,
    rgba(21, 28, 39, 0.6) 0%,
    transparent 100%
  );
}

/* Map SVG Animation */
.map-overlay {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0.35;
  pointer-events: none;
}

.map-svg {
  width: 100%;
  height: 100%;
}

.animated-path {
  stroke-dashoffset: 0;
  animation: dashMove 35s linear infinite;
}

.animated-path-reverse {
  stroke-dashoffset: 0;
  animation: dashMove 40s linear infinite reverse;
}

@keyframes dashMove {
  to {
    stroke-dashoffset: 1000;
  }
}

.radar-ring {
  transform-origin: center;
  animation: radarPulse 3s ease-out infinite;
}

.ring-2 {
  animation-delay: 1.5s;
}

@keyframes radarPulse {
  0% {
    transform: scale(0.6);
    opacity: 0.9;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

/* Editorial Content */
.visual-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  height: 100%;
  padding: 3rem;
  color: #ffffff;
  box-sizing: border-box;
}

.content-limit {
  max-width: 520px;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  background: rgba(242, 107, 80, 0.2);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(242, 107, 80, 0.4);
  margin-bottom: 1.25rem;
}

.live-icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffb4a5;
}

.icon-sm {
  font-size: 16px;
}

.live-pill-text {
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #ffdad3;
}

.visual-title {
  font-family: var(--font-display);
  font-size: 2.75rem;
  font-weight: 700;
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: #ffffff;
  margin: 0 0 1.25rem 0;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.visual-description {
  font-family: var(--font-body);
  font-size: 1.0625rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 2rem 0;
}

/* Micro Stats Bar */
.live-stats-bar {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.85rem 1.25rem;
  border-radius: 1rem;
  background: rgba(21, 28, 39, 0.5);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  width: fit-content;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
}

.stat-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.65);
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.15);
}

/* ==========================================================================
   RIGHT COLUMN: Form Pane
   ========================================================================== */
.form-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2.5rem 1.75rem;
  background: var(--color-surface);
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .form-pane {
    padding: 3.5rem 3rem;
  }
}

@media (min-width: 1024px) {
  .form-pane {
    width: 42%;
    height: 100%;
    padding: 2.25rem 3.25rem;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .form-pane::-webkit-scrollbar {
    display: none;
  }
}

.form-container {
  width: 100%;
  max-width: 380px;
  margin: auto auto;
  display: flex;
  flex-direction: column;
}

/* Brand Header */
.brand-header {
  margin-bottom: 1.25rem;
}

.logo-wrapper {
  margin-bottom: 1rem;
}

.brand-logo {
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
  object-fit: contain;
  background: #ffffff;
  padding: 0.35rem;
  box-sizing: border-box;
  box-shadow: 0 10px 25px -5px rgba(242, 107, 80, 0.25),
              0 0 0 1px rgba(223, 191, 185, 0.3);
}

.heading-group {
  display: flex;
  flex-direction: column;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-primary);
  cursor: pointer;
  margin-bottom: 0.75rem;
  width: fit-content;
  transition: transform 0.15s ease;
}

.back-link:hover {
  transform: translateX(-3px);
}

.icon-back {
  font-size: 16px;
}

.title-main {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-on-surface);
  letter-spacing: -0.02em;
  margin: 0 0 0.5rem 0;
}

.subtitle-main {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--color-on-surface-variant);
  margin: 0;
}

/* Action Stack (Role Selection) */
.action-stack {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.action-card {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.125rem 1.25rem;
  border-radius: 1rem;
  text-align: left;
  border: none;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  box-sizing: border-box;
}

.primary-card {
  background: var(--color-primary);
  color: var(--color-on-primary);
  box-shadow: 0 8px 20px -4px rgba(169, 54, 32, 0.35);
}

.primary-card:hover {
  background: #952e1a;
  transform: translateY(-2px);
  box-shadow: 0 12px 24px -4px rgba(169, 54, 32, 0.45);
}

.primary-card:active {
  transform: scale(0.985);
}

.primary-card .card-description {
  color: rgba(255, 255, 255, 0.85);
}

.secondary-card {
  background: var(--color-surface-container-low);
  color: var(--color-on-surface);
  border: 1px solid rgba(223, 191, 185, 0.4);
}

.secondary-card:hover {
  background: var(--color-surface-container);
  border-color: rgba(169, 54, 32, 0.3);
  transform: translateY(-2px);
}

.secondary-card:active {
  transform: scale(0.985);
}

.secondary-card .card-description {
  color: var(--color-on-surface-variant);
}

.card-content-wrap {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.card-icon {
  font-size: 20px;
}

.card-title {
  font-family: var(--font-display);
  font-size: 1.0625rem;
  font-weight: 600;
}

.card-description {
  font-size: 0.8125rem;
  margin: 0;
}

.chevron-indicator {
  position: relative;
  z-index: 2;
  font-size: 20px;
  opacity: 0.8;
  transition: transform 0.2s ease;
}

.action-card:hover .chevron-indicator {
  transform: translateX(4px);
  opacity: 1;
}

.hover-shimmer {
  position: absolute;
  inset: 0;
  width: 0;
  background: rgba(255, 255, 255, 0.15);
  transition: width 0.3s ease;
  z-index: 1;
}

.action-card:hover .hover-shimmer {
  width: 100%;
}

/* Divider */
.divider-row {
  display: flex;
  align-items: center;
  margin: 0.6rem 0;
  opacity: 0.7;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: var(--color-outline-variant);
}

.divider-text {
  padding: 0 0.85rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-on-surface-variant);
}

/* Guest Button */
.guest-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.25rem;
  border-radius: 0.875rem;
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  font-family: var(--font-body);
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.guest-btn:hover {
  background: var(--color-surface-container-high);
  border-color: rgba(223, 191, 185, 0.5);
}

.guest-btn:active {
  transform: scale(0.985);
}

.icon-guest {
  font-size: 18px;
  color: var(--color-primary);
}

/* ==========================================================================
   STEP 2: Phone Input Form
   ========================================================================== */
.phone-form,
.otp-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.input-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-on-surface);
}

.phone-input-field {
  display: flex;
  align-items: center;
  background: var(--color-surface-container-low);
  border: 1.5px solid var(--color-surface-container-highest);
  border-radius: 0.875rem;
  padding: 0.65rem 0.875rem;
  transition: all 0.2s ease;
}

.phone-input-field:focus-within {
  border-color: var(--color-primary);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(169, 54, 32, 0.12);
  transform: scale(1.01);
}

.phone-input-field.has-error {
  border-color: #ba1a1a;
  background: #fff8f7;
}

.vendor-setup-section {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 0.85rem;
  background: var(--color-surface-container-lowest, #ffffff);
  border: 1px solid var(--color-outline-variant, #dfbfb9);
  border-radius: 1rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
}

.address-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detect-gps-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-primary);
  background: rgba(169, 54, 32, 0.08);
  border: 1px solid rgba(169, 54, 32, 0.25);
  padding: 0.2rem 0.55rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.detect-gps-btn:hover:not(:disabled) {
  background: rgba(169, 54, 32, 0.18);
  transform: scale(1.02);
}

.detect-gps-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.custom-input-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-surface-container-low);
  border: 1.5px solid var(--color-surface-container-highest);
  border-radius: 0.875rem;
  padding: 0.6rem 0.875rem;
  transition: all 0.2s ease;
}

.custom-input-field:focus-within {
  border-color: var(--color-primary);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(169, 54, 32, 0.12);
}

.custom-input-field .text-input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--color-on-surface);
  outline: none;
}

.custom-input-field .text-input::placeholder {
  color: var(--color-on-surface-variant);
  opacity: 0.6;
}

.custom-input-field .input-icon {
  font-size: 18px;
  color: var(--color-primary);
}

.clickable-input-field {
  cursor: pointer;
  position: relative;
}

.clickable-input-field:hover {
  border-color: var(--color-primary);
  background: #ffffff;
  transform: translateY(-1px);
}

.clickable-input-field .text-input {
  min-width: 0;
  font-size: 0.8125rem;
  padding-right: 0.35rem;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.clickable-input-field .text-input::placeholder {
  font-size: 0.775rem;
  color: var(--color-on-surface-variant);
  opacity: 0.65;
}

.map-open-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: rgba(169, 54, 32, 0.1);
  color: var(--color-primary);
  border: 1px solid rgba(169, 54, 32, 0.2);
  border-radius: 9999px;
  padding: 0.2rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.map-open-pill:hover {
  background: var(--color-primary);
  color: #ffffff;
}

.field-hint-text {
  font-size: 0.72rem;
  color: var(--color-on-surface-variant);
  margin-top: 0.15rem;
  opacity: 0.8;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.custom-textarea-field {
  display: flex;
  background: var(--color-surface-container-low);
  border: 1.5px solid var(--color-surface-container-highest);
  border-radius: 0.875rem;
  padding: 0.65rem 0.875rem;
  transition: all 0.2s ease;
}

.custom-textarea-field:focus-within {
  border-color: var(--color-primary);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(169, 54, 32, 0.12);
}

.story-textarea {
  width: 100%;
  border: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--color-on-surface);
  outline: none;
  resize: none;
  line-height: 1.5;
}

.story-textarea::placeholder {
  color: var(--color-on-surface-variant);
  opacity: 0.6;
}

.country-code {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-on-surface-variant);
  padding-right: 0.6rem;
  border-right: 1px solid var(--color-outline-variant);
  margin-right: 0.6rem;
}

.phone-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-on-surface);
  letter-spacing: 0.05em;
}

.check-icon {
  color: var(--color-success);
  font-size: 20px;
}

.error-msg {
  font-size: 0.75rem;
  color: #ba1a1a;
  margin-top: 0.15rem;
}

.otp-error-msg {
  text-align: center;
  margin-top: -0.5rem;
}

/* Submit Button */
.submit-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.95rem 1.25rem;
  border-radius: 0.875rem;
  background: var(--color-primary);
  color: #ffffff;
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 18px -3px rgba(169, 54, 32, 0.35);
  transition: all 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #952e1a;
  transform: translateY(-1px);
  box-shadow: 0 10px 22px -3px rgba(169, 54, 32, 0.45);
}

.submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.loading-state {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ==========================================================================
   STEP 3: OTP Form
   ========================================================================== */
.otp-inputs-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.35rem;
}

.totp-qr-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background: var(--color-surface-container-low);
  padding: 0.85rem;
  border-radius: 1rem;
  border: 1px solid var(--color-outline-variant);
  gap: 0.4rem;
}

.totp-qr-img {
  width: 145px;
  height: 145px;
  border-radius: 0.75rem;
  background: #ffffff;
  padding: 0.35rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.totp-instruction {
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--color-on-surface);
  margin: 0;
}

.totp-subtext {
  font-size: 0.72rem;
  color: var(--color-on-surface-variant);
  margin: 0;
  max-width: 260px;
}

.totp-login-hint {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--color-surface-container-low);
  padding: 0.75rem 0.875rem;
  border-radius: 0.875rem;
  border: 1px solid var(--color-outline-variant);
  font-size: 0.8rem;
  color: var(--color-on-surface);
  line-height: 1.4;
}

.otp-box {
  width: 100%;
  height: 52px;
  text-align: center;
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-on-surface);
  background: var(--color-surface-container-low);
  border: 1.5px solid var(--color-surface-container-highest);
  border-radius: 0.75rem;
  outline: none;
  transition: all 0.18s ease;
  box-sizing: border-box;
}

.otp-box:focus {
  border-color: var(--color-primary);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(169, 54, 32, 0.15);
  transform: translateY(-2px);
}

.resend-row {
  display: flex;
  justify-content: center;
  font-size: 0.8125rem;
  color: var(--color-on-surface-variant);
}

.timer-text {
  color: var(--color-on-surface-variant);
}

.resend-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  font-size: 0.8125rem;
}

.resend-btn:hover {
  text-decoration: underline;
}

/* ==========================================================================
   STEP 4: Success State
   ========================================================================== */
.success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
  padding: 1rem 0;
}

.success-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #e8f5e9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-success);
  box-shadow: 0 8px 20px -4px rgba(27, 135, 68, 0.25);
}

.success-icon {
  font-size: 36px;
}

.success-role-badge {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-on-surface-variant);
  background: var(--color-surface-container);
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  margin: 0;
}

/* ==========================================================================
   Vendor Photos (PFP & Cover Banner) Setup
   ========================================================================== */
.vendor-photos-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 0.5rem;
}

.photo-upload-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.photo-upload-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.photo-header-label {
  margin-bottom: 0 !important;
}

.optional-tag {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-on-surface-variant);
  background: var(--color-surface-container-high);
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
}

.cover-banner-preview {
  position: relative;
  width: 100%;
  height: 115px;
  border-radius: 1rem;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(242, 107, 80, 0.08) 0%, rgba(245, 158, 11, 0.12) 100%);
  border: 1.5px dashed rgba(223, 191, 185, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cover-banner-preview:hover {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, rgba(242, 107, 80, 0.14) 0%, rgba(245, 158, 11, 0.18) 100%);
}

.cover-banner-preview.has-cover {
  border-style: solid;
  border-color: rgba(223, 191, 185, 0.3);
}

.cover-banner-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-banner-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0.5rem;
}

.avatar-upload-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-circle-preview {
  position: relative;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(242, 107, 80, 0.08);
  border: 2px dashed rgba(223, 191, 185, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.avatar-circle-preview:hover {
  border-color: var(--color-primary);
}

.avatar-circle-preview.has-avatar {
  border-style: solid;
  border-color: var(--color-primary);
}

.avatar-circle-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-circle-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-remove-btn,
.avatar-remove-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.65);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}

.photo-remove-btn:hover,
.avatar-remove-btn:hover {
  background: rgba(220, 38, 38, 0.9);
  transform: scale(1.1);
}

.avatar-upload-action {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.upload-trigger-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(223, 191, 185, 0.5);
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  width: fit-content;
}

.upload-trigger-btn:hover {
  background: rgba(242, 107, 80, 0.08);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.hidden-file-input {
  display: none !important;
}

.photos-actions-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.skip-btn {
  padding: 0.875rem 1.15rem;
  border-radius: 0.875rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-on-surface-variant);
  background: var(--color-surface-container-low);
  border: 1px solid rgba(223, 191, 185, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.skip-btn:hover {
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
  border-color: rgba(223, 191, 185, 0.9);
}

.single-action-wrap {
  width: 100%;
  margin-top: 0.75rem;
}

.dynamic-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.95rem 1.25rem;
  border-radius: 0.875rem;
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  /* Default inactive state: Sleek cool grey (Skip for now) */
  background: var(--color-surface-container-low);
  color: var(--color-on-surface-variant);
  border: 1.5px solid rgba(223, 191, 185, 0.65);
  box-shadow: none;
  /* Ultra-smooth color, border, and glow transition */
  transition: background-color 0.32s cubic-bezier(0.16, 1, 0.3, 1),
              color 0.32s cubic-bezier(0.16, 1, 0.3, 1),
              border-color 0.32s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.32s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.18s ease;
}

.dynamic-action-btn.is-active {
  /* Active state: Vibrant primary terracotta red (Continue / Launch) */
  background: var(--color-primary);
  color: #ffffff;
  border-color: transparent;
  box-shadow: 0 8px 20px -3px rgba(169, 54, 32, 0.38);
}

.dynamic-action-btn.is-active:hover:not(:disabled) {
  background: #952e1a;
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -3px rgba(169, 54, 32, 0.48);
}

.dynamic-action-btn:not(.is-active):hover:not(:disabled) {
  background: var(--color-surface-container-high);
  color: var(--color-on-surface);
  border-color: rgba(223, 191, 185, 0.95);
  transform: translateY(-1px);
}

.dynamic-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

/* Button text crossfade transition */
.btn-fade-enter-active,
.btn-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.btn-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.btn-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ==========================================================================
   Footer & Legal Notice
   ========================================================================== */
.footer-terms {
  margin-top: 2.25rem;
  text-align: center;
}

.terms-text {
  font-size: 0.75rem;
  line-height: 1.5;
  color: rgba(88, 65, 61, 0.75);
  margin: 0;
}

.terms-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.terms-link:hover {
  text-decoration: underline;
}

/* ==========================================================================
   Vue Transition Animations
   ========================================================================== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-fade-leave-active {
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-fade-enter-from {
  transform: translateY(8px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}

/* ==========================================================================
   Custom In-App Toast Notification
   ========================================================================== */
.foodmap-toast-banner {
  position: fixed;
  top: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999999;
  pointer-events: auto;
  max-width: 90vw;
  width: fit-content;
}

.toast-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 1rem;
  background: rgba(30, 24, 22, 0.95);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  color: #ffffff;
  box-shadow: 0 16px 36px -6px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  min-width: 290px;
}

.toast-warning .toast-card {
  border-left: 4px solid #f59e0b;
}

.toast-warning .toast-icon-wrap {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.18);
}

.toast-error .toast-card {
  border-left: 4px solid #ef4444;
}

.toast-error .toast-icon-wrap {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.18);
}

.toast-icon-wrap {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.toast-content {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
}

.toast-title {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.8;
}

.toast-message {
  font-size: 0.84rem;
  font-weight: 500;
  line-height: 1.35;
  color: #ffffff;
}

.toast-close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.toast-close-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.14);
}

/* Toast Transitions */
.toast-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translate(-50%, -24px) scale(0.95);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, -16px) scale(0.95);
}

.has-field-error {
  border-color: #ef4444 !important;
  background: rgba(239, 68, 68, 0.04) !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15) !important;
  animation: shake 0.35s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
</style>
