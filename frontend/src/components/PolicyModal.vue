<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  initialTab: {
    type: String,
    default: 'terms', // 'terms' | 'privacy'
  },
})

const emit = defineEmits(['close'])

const activeTab = ref(props.initialTab || 'terms')

watch(
  () => props.initialTab,
  (newVal) => {
    if (newVal) {
      activeTab.value = newVal
    }
  }
)

function handleKeyDown(e) {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="emit('close')"
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-modal-title"
      >
        <div class="relative w-full max-w-2xl bg-surface rounded-3xl border border-outline-variant/30 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          <!-- Modal Header -->
          <div class="p-5 sm:p-6 border-b border-outline-variant/20 flex items-center justify-between gap-4 bg-surface-container-low/50">
            <div class="flex items-center gap-3.5">
              <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[22px]">policy</span>
              </div>
              <div>
                <h2 id="policy-modal-title" class="text-base sm:text-lg font-black text-on-surface">
                  {{ activeTab === 'terms' ? 'Terms of Service' : 'Privacy Policy' }}
                </h2>
                <p class="text-xs text-on-surface-variant font-medium">FoodMap Hyperlocal Community Standards & Legal Protections</p>
              </div>
            </div>

            <!-- Close Button -->
            <button
              type="button"
              @click="emit('close')"
              class="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <!-- Tab Bar -->
          <div class="px-5 pt-3 pb-1 border-b border-outline-variant/15 flex items-center gap-2 bg-surface">
            <button
              type="button"
              @click="activeTab = 'terms'"
              :class="[
                'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'terms'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              ]"
            >
              <span class="material-symbols-outlined text-[16px]">gavel</span>
              <span>Terms of Service</span>
            </button>

            <button
              type="button"
              @click="activeTab = 'privacy'"
              :class="[
                'px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                activeTab === 'privacy'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              ]"
            >
              <span class="material-symbols-outlined text-[16px]">verified_user</span>
              <span>Privacy Policy</span>
            </button>
          </div>

          <!-- Scrollable Body -->
          <div class="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-on-surface/90 leading-relaxed">
            <!-- ================= Terms of Service Content ================= -->
            <div v-if="activeTab === 'terms'" class="space-y-4">
              <div class="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/30 text-xs font-medium text-on-surface">
                <strong>Effective Date:</strong> September 2026. Welcome to FoodMap, a community-driven hyperlocal food discovery, surplus rescue, and home kitchen network.
              </div>

              <div>
                <h3 class="text-sm font-black text-on-surface flex items-center gap-1.5 mb-1">
                  <span class="material-symbols-outlined text-primary text-[18px]">storefront</span>
                  1. Hyperlocal Platform Services
                </h3>
                <p class="text-on-surface-variant">
                  FoodMap provides an interactive platform connecting independent neighborhood home cooks, residents, and independent delivery couriers. FoodMap does not operate culinary kitchens or employ delivery riders directly; kitchens operate autonomously under neighborhood standards.
                </p>
              </div>

              <div>
                <h3 class="text-sm font-black text-on-surface flex items-center gap-1.5 mb-1">
                  <span class="material-symbols-outlined text-primary text-[18px]">restaurant</span>
                  2. Food Safety, Hygiene & Kitchen Conduct
                </h3>
                <p class="text-on-surface-variant">
                  Home vendors agree to uphold the highest cleanliness and hygiene standards in food preparation, adhering to FSSAI guidelines where applicable. Chefs must accurately declare dietary categories (Veg, Non-Veg) and highlight common allergens (Nuts, Dairy, Gluten, Soy).
                </p>
              </div>

              <div>
                <h3 class="text-sm font-black text-on-surface flex items-center gap-1.5 mb-1">
                  <span class="material-symbols-outlined text-primary text-[18px]">inventory_2</span>
                  3. Atomic Inventory & Order Placement
                </h3>
                <p class="text-on-surface-variant">
                  All dish orders are processed with real-time atomic inventory deduction to prevent overselling. Once an order is accepted by a kitchen, cancellations are subject to preparation status. Group orders and recurring meal subscriptions are fulfilled according to designated local time windows.
                </p>
              </div>

              <div>
                <h3 class="text-sm font-black text-on-surface flex items-center gap-1.5 mb-1">
                  <span class="material-symbols-outlined text-primary text-[18px]">two_wheeler</span>
                  4. Courier Fulfillment & Resident Delivery
                </h3>
                <p class="text-on-surface-variant">
                  Delivery partners operate as verified neighborhood riders. Real-time GPS broadcasting is activated strictly during en-route delivery stages to ensure prompt and secure order arrival.
                </p>
              </div>

              <div>
                <h3 class="text-sm font-black text-on-surface flex items-center gap-1.5 mb-1">
                  <span class="material-symbols-outlined text-primary text-[18px]">eco</span>
                  5. Surplus Food Rescue & Community Ethics
                </h3>
                <p class="text-on-surface-variant">
                  Surplus rescue meals are provided at discounted community rates to mitigate urban food waste. Abuse of surplus pricing, fraud, or defamatory harassment results in immediate account deactivation under administrative moderation.
                </p>
              </div>
            </div>

            <!-- ================= Privacy Policy Content ================= -->
            <div v-else class="space-y-4">
              <div class="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/30 text-xs font-medium text-on-surface">
                <strong>Privacy Commitment:</strong> FoodMap values your privacy. We never monetize or sell personal data to advertisers.
              </div>

              <div>
                <h3 class="text-sm font-black text-on-surface flex items-center gap-1.5 mb-1">
                  <span class="material-symbols-outlined text-primary text-[18px]">person</span>
                  1. Information We Collect
                </h3>
                <p class="text-on-surface-variant">
                  To provide neighborhood food discovery, we collect minimal necessary data: your mobile number (used for secure OTP / TOTP authentication), display name, optional dietary preferences/allergies (for AI safety scoring), and precise location coordinates.
                </p>
              </div>

              <div>
                <h3 class="text-sm font-black text-on-surface flex items-center gap-1.5 mb-1">
                  <span class="material-symbols-outlined text-primary text-[18px]">location_on</span>
                  2. Geolocation & Radar Discovery
                </h3>
                <p class="text-on-surface-variant">
                  Location data is used solely to compute distance to nearby kitchens, display community food radars, and support live courier delivery maps. GPS broadcast for couriers is throttled and active exclusively during active delivery orders.
                </p>
              </div>

              <div>
                <h3 class="text-sm font-black text-on-surface flex items-center gap-1.5 mb-1">
                  <span class="material-symbols-outlined text-primary text-[18px]">lock</span>
                  3. Secure 2FA Authentication
                </h3>
                <p class="text-on-surface-variant">
                  Authentication is secured via Time-based One-Time Passwords (TOTP). Raw passwords are never stored. Role access (Resident, Vendor, Delivery Partner, Admin) is cryptographically signed via JSON Web Tokens (JWT).
                </p>
              </div>

              <div>
                <h3 class="text-sm font-black text-on-surface flex items-center gap-1.5 mb-1">
                  <span class="material-symbols-outlined text-primary text-[18px]">share</span>
                  4. Limited Data Sharing for Order Fulfillment
                </h3>
                <p class="text-on-surface-variant">
                  When you place an order, your name, contact phone, and delivery address are shared strictly with the preparing home chef and the assigned courier for fulfillment purposes only.
                </p>
              </div>

              <div>
                <h3 class="text-sm font-black text-on-surface flex items-center gap-1.5 mb-1">
                  <span class="material-symbols-outlined text-primary text-[18px]">delete_sweep</span>
                  5. User Rights & Account Management
                </h3>
                <p class="text-on-surface-variant">
                  Residents can update their allergen shields, change dietary preferences, or request full account and order history anonymization at any time.
                </p>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-4 sm:p-5 border-t border-outline-variant/20 bg-surface-container-low/50 flex items-center justify-between gap-3">
            <span class="text-[11px] text-on-surface-variant font-medium">FoodMap v2.0 • Academic Team Project</span>
            <button
              type="button"
              @click="emit('close')"
              class="px-5 py-2.5 rounded-xl bg-primary hover:opacity-90 text-on-primary text-xs font-bold transition-opacity cursor-pointer shadow-sm"
            >
              I Understand & Close
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
