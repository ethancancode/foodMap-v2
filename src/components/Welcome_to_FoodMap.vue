<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits(['auth-success', 'explore-guest', 'role-selected'])

// State Management
const currentStep = ref('roles') // 'roles' | 'phone' | 'otp' | 'success'
const selectedRole = ref('resident') // 'resident' | 'vendor'
const phoneNumber = ref('')
const phoneError = ref('')
const isSubmitting = ref(false)
const otpDigits = ref(['', '', '', '', '', ''])
const otpInputs = ref([])
const resendTimer = ref(30)
let timerInterval = null

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
  // Simulate network request
  setTimeout(async () => {
    isSubmitting.value = false
    currentStep.value = 'otp'
    startResendCountdown()
    await nextTick()
    if (otpInputs.value[0]) {
      otpInputs.value[0].focus()
    }
  }, 700)
}

function setOtpInputRef(el, index) {
  if (el) {
    otpInputs.value[index] = el
  }
}

function handleOtpInput(event, index) {
  const value = event.target.value.replace(/\D/g, '')
  otpDigits.value[index] = value.slice(-1)

  if (value && index < 5) {
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
    .slice(0, 6)

  if (pastedData) {
    pastedData.split('').forEach((char, idx) => {
      if (idx < 6) otpDigits.value[idx] = char
    })
    const lastIdx = Math.min(pastedData.length, 5)
    if (otpInputs.value[lastIdx]) {
      otpInputs.value[lastIdx].focus()
    }
  }
}

function resendOtp() {
  otpDigits.value = ['', '', '', '', '', '']
  startResendCountdown()
  if (otpInputs.value[0]) {
    otpInputs.value[0].focus()
  }
}

function verifyOtp() {
  if (!isOtpComplete.value) return
  isSubmitting.value = true

  setTimeout(() => {
    isSubmitting.value = false
    currentStep.value = 'success'
    emit('auth-success', {
      role: selectedRole.value,
      phone: phoneNumber.value,
    })
  }, 900)
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
                  <div class="back-link" @click="currentStep = 'phone'">
                    <span class="material-symbols-outlined icon-back">arrow_back</span>
                    <span>Change Number</span>
                  </div>
                  <h2 class="title-main">Enter 6-Digit Code</h2>
                  <p class="subtitle-main">
                    Sent to <strong>+91 {{ phoneNumber }}</strong>
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

              <!-- STEP 2: Phone Input -->
              <form
                v-else-if="currentStep === 'phone'"
                key="step-phone"
                class="phone-form"
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

              <!-- STEP 3: OTP Input -->
              <form
                v-else-if="currentStep === 'otp'"
                key="step-otp"
                class="otp-form"
                @submit.prevent="verifyOtp"
              >
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

                <div class="resend-row">
                  <span v-if="resendTimer > 0" class="timer-text">
                    Resend code in {{ resendTimer }}s
                  </span>
                  <button
                    v-else
                    type="button"
                    class="resend-btn"
                    @click="resendOtp"
                  >
                    Resend OTP
                  </button>
                </div>

                <button
                  type="submit"
                  class="submit-btn"
                  :disabled="!isOtpComplete || isSubmitting"
                >
                  <span v-if="!isSubmitting">Verify & Continue</span>
                  <span v-else class="loading-state">
                    <span class="spinner"></span>
                    Verifying...
                  </span>
                </button>
              </form>

              <!-- STEP 4: Success State -->
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
    min-height: 680px;
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
}

@media (min-width: 1024px) {
  .visual-pane {
    display: flex;
    flex-direction: column;
    width: 58%;
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
  transform: scale(1.03);
  transition: transform 6s cubic-bezier(0.25, 1, 0.5, 1);
}

.visual-pane:hover .hero-image {
  transform: scale(1.08);
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
    padding: 3.5rem 3.5rem;
  }
}

.form-container {
  width: 100%;
  max-width: 380px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

/* Brand Header */
.brand-header {
  margin-bottom: 2rem;
}

.logo-wrapper {
  margin-bottom: 1.5rem;
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
  gap: 0.5rem;
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
</style>
