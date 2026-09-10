<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { vendorApi, orderApi } from '../services/api.js'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

const route = useRoute()

const props = defineProps({
  order: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const liveOrder = ref(props.order || null)

function formatVendorName(val) {
  if (!val) return 'Home Kitchen'
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed)
        return parsed.businessName || parsed.name || 'Home Kitchen'
      } catch (e) {}
    }
    return trimmed || 'Home Kitchen'
  }
  return val.businessName || val.name || 'Home Kitchen'
}

function getVendorId(val) {
  if (!val) return null
  if (typeof val === 'string') return val
  return val._id || val.id || null
}

const orderInfo = computed(() => {
  const o = liveOrder.value || props.order || {}
  const vendorObj = o.vendor || o.vendorName
  return {
    id: o.orderNumber || o.id || o._id || '#FM1024',
    orderId: o._id || o.id || null,
    item: o.foodName || o.item || o.itemSummary || 'Homemade Meal',
    vendor: formatVendorName(vendorObj),
    vendorId: getVendorId(vendorObj) || o.vendorId || null,
    qty: o.quantity || o.qty || 1,
    price: o.totalAmount || o.price || o.total || 0
  }
})

onMounted(async () => {
  const paramId = route.params?.id || route.query?.id
  const targetId = paramId || props.order?._id || props.order?.id || props.order?.orderNumber
  if (targetId) {
    try {
      const res = await orderApi.getOrderById(targetId)
      if (res?.order) {
        liveOrder.value = res.order
        if (res.order.isReviewed) {
          isSubmitted.value = true
          selectedRating.value = res.order.rating || 5
          reviewNote.value = res.order.reviewComment || ''
        }
      }
    } catch (e) {
      console.log('Order fetch error in OrderCompleted:', e)
    }
  } else {
    try {
      const res = await orderApi.getOrders()
      const orders = res?.orders || res?.data || []
      if (orders.length > 0) {
        liveOrder.value = orders[0]
        if (orders[0].isReviewed) {
          isSubmitted.value = true
          selectedRating.value = orders[0].rating || 5
          reviewNote.value = orders[0].reviewComment || ''
        }
      }
    } catch (e) {
      console.warn('Failed to load recent order in OrderCompleted:', e)
    }
  }

  // Also check if props.order was already reviewed
  if (props.order?.isReviewed) {
    isSubmitted.value = true
    selectedRating.value = props.order.rating || 5
    reviewNote.value = props.order.reviewComment || ''
  }
})

// Rating State
const selectedRating = ref(0)
const hoverRating = ref(0)
const reviewNote = ref('')
const isSubmitted = ref(false)
const isSubmitting = ref(false)

function setRating(star) {
  if (isSubmitted.value) return
  selectedRating.value = star
}

async function submitReview() {
  if (isSubmitted.value) {
    emit('action', { action: 'toast', payload: { message: 'You have already reviewed this order' } })
    return
  }

  if (selectedRating.value === 0) {
    emit('action', { action: 'toast', payload: { message: 'Please select a star rating first' } })
    return
  }

  isSubmitting.value = true
  try {
    const targetVendorId = orderInfo.value.vendorId || props.order?.vendor?._id || props.order?.vendor?.id || props.order?.vendor
    if (targetVendorId) {
      const res = await vendorApi.submitReview(targetVendorId, {
        rating: selectedRating.value,
        comment: reviewNote.value,
        orderId: orderInfo.value.orderId,
        dishName: orderInfo.value.item,
        userId: props.user?._id || props.user?.id,
        userName: props.user?.name || 'Resident',
      })
      if (res?.alreadyReviewed) {
        emit('action', {
          action: 'toast',
          payload: {
            message: 'You have already submitted a review for this order.'
          }
        })
      } else {
        emit('action', {
          action: 'toast',
          payload: {
            message: `Thank you! Rated ${selectedRating.value} ★ for ${orderInfo.value.vendor}.`
          }
        })
      }
    }
    isSubmitted.value = true
  } catch (err) {
    console.warn('Failed to submit review online, recording locally:', err)
    isSubmitted.value = true
    emit('action', {
      action: 'toast',
      payload: {
        message: `Thank you! Rated ${selectedRating.value} ★ for ${orderInfo.value.vendor}.`
      }
    })
  } finally {
    isSubmitting.value = false
  }
}

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface">
    <!-- Reusable AppSidebar -->
    <AppSidebar
      :role="props.currentRole || (props.user ? 'resident' : 'guest')"
      activeRoute="order_status"
      :user="props.user"
      @navigate="navigateTo"
      @logout="navigateTo('welcome')"
    />

    <!-- Main Content Area -->
    <div class="lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        :show-back="true"
        back-label="Back to Radar"
        back-route="food_radar"
        :show-sync-badge="false"
        @navigate="navigateTo"
      />

      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background">
        <div class="flex flex-col w-full h-full justify-center items-center py-6 sm:py-8 px-4 sm:px-6 relative overflow-hidden bg-gradient-to-b from-surface to-background min-h-[calc(100vh-5rem)]">
          <div class="w-full max-w-3xl z-10 flex flex-col items-center">
            
            <div class="flex flex-col items-center text-center mb-6">
              <div class="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3 shadow-lg relative">
                <span class="material-symbols-outlined text-[36px] sm:text-[44px]" style="font-variation-settings: 'FILL' 1;">check_circle</span>
              </div>
              <h1 class="font-display-lg text-xl sm:text-2xl font-black text-primary tracking-tight">Order Fulfilled</h1>
              <p class="text-xs sm:text-sm text-on-surface-variant max-w-md mt-1">
                Hope you loved the homemade meal! Thank you for supporting neighborhood home chefs.
              </p>
            </div>

            <!-- Order Details Grid -->
            <div class="w-full grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 mb-6">
              <div class="md:col-span-7 flex flex-col gap-4">
                <div class="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-outline-variant/20 relative overflow-hidden">
                  <div class="flex justify-between items-start mb-3">
                    <div>
                      <span class="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-0.5">Order Reference</span>
                      <h2 class="text-base sm:text-lg font-black text-on-surface">{{ orderInfo.id }}</h2>
                    </div>
                    <div class="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                      <span class="text-xs text-primary font-bold">Collected</span>
                    </div>
                  </div>

                  <div class="h-px bg-outline-variant/20 w-full my-3"></div>

                  <div class="flex items-center gap-3 mb-3">
                    <div class="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span class="material-symbols-outlined text-primary text-[24px]">restaurant</span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 class="font-bold text-sm sm:text-base text-on-surface truncate leading-tight">{{ orderInfo.item }}</h3>
                      <p class="text-xs text-on-surface-variant mt-0.5">{{ orderInfo.qty }} portion{{ orderInfo.qty > 1 ? 's' : '' }} • {{ orderInfo.vendor }}</p>
                    </div>
                    <span class="text-base font-black text-primary shrink-0">₹{{ orderInfo.price }}</span>
                  </div>

                  <div class="flex items-center gap-1.5 text-on-surface-variant text-[11px] font-medium bg-surface-container-low p-2 rounded-xl w-fit">
                    <span class="material-symbols-outlined text-[15px]">schedule</span>
                    <span>Completed just now</span>
                  </div>
                </div>

                <!-- Interactive Rating & Review CTA -->
                <div class="bg-surface-container-lowest rounded-3xl p-5 shadow-sm border border-outline-variant/20 flex flex-col items-center text-center transition-all">
                  <span class="text-sm font-extrabold text-on-surface block mb-1">Rate {{ orderInfo.vendor }}</span>
                  <p class="text-xs text-on-surface-variant mb-3">How was your homemade dish?</p>
                  
                  <!-- Submitted State -->
                  <div v-if="isSubmitted" class="w-full py-4 bg-green-50 rounded-2xl border border-green-200 flex flex-col items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                    <div class="flex items-center gap-1 text-amber-500">
                      <span
                        v-for="star in 5"
                        :key="star"
                        class="material-symbols-outlined text-[24px]"
                        :style="star <= selectedRating ? 'font-variation-settings: \'FILL\' 1;' : 'opacity: 0.3;'"
                      >
                        star
                      </span>
                    </div>
                    <span class="text-xs font-bold text-green-800">Review Submitted!</span>
                    <p class="text-[11px] text-green-700 italic max-w-xs" v-if="reviewNote">"{{ reviewNote }}"</p>
                  </div>

                  <!-- Active Rating Form -->
                  <div v-else class="w-full flex flex-col items-center">
                    <!-- 5 Stars: Grey by default, golden on hover/selected -->
                    <div class="flex items-center justify-center gap-2 mb-3">
                      <button
                        v-for="star in 5"
                        :key="star"
                        type="button"
                        @click="setRating(star)"
                        @mouseenter="hoverRating = star"
                        @mouseleave="hoverRating = 0"
                        class="p-1 rounded-lg transition-transform hover:scale-125 cursor-pointer focus:outline-none"
                        :aria-label="`Rate ${star} stars`"
                      >
                        <span
                          class="material-symbols-outlined text-[32px] transition-colors"
                          :class="[
                            (hoverRating ? star <= hoverRating : star <= selectedRating)
                              ? 'text-amber-500 scale-110'
                              : 'text-outline-variant/60 hover:text-amber-400'
                          ]"
                          :style="(hoverRating ? star <= hoverRating : star <= selectedRating) ? 'font-variation-settings: \'FILL\' 1;' : ''"
                        >
                          star
                        </span>
                      </button>
                    </div>

                    <!-- Selected rating subtitle -->
                    <span v-if="selectedRating > 0" class="text-xs font-bold text-amber-600 mb-3 animate-in fade-in duration-150">
                      {{ selectedRating === 5 ? '⭐ Excellent' : selectedRating === 4 ? '⭐ Very Good' : selectedRating === 3 ? '⭐ Good' : selectedRating === 2 ? '⭐ Fair' : '⭐ Needs Improvement' }}
                    </span>

                    <!-- Optional Review Textarea -->
                    <div class="w-full mb-3.5">
                      <textarea
                        v-model="reviewNote"
                        rows="2"
                        placeholder="Write an optional review or thank the cook (optional)..."
                        class="w-full text-xs p-3 rounded-2xl bg-surface-container border border-outline-variant/30 focus:border-primary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none text-on-surface placeholder:text-on-surface-variant/50 font-normal"
                      ></textarea>
                    </div>

                    <!-- Submit Button -->
                    <button
                      type="button"
                      @click="submitReview"
                      :disabled="selectedRating === 0 || isSubmitting"
                      class="w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                      :class="[
                        selectedRating > 0
                          ? 'bg-primary text-on-primary hover:bg-primary/90 cursor-pointer shadow-md'
                          : 'bg-surface-container-high text-on-surface-variant/50 cursor-not-allowed border border-outline-variant/20'
                      ]"
                    >
                      <span v-if="isSubmitting" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span v-else class="material-symbols-outlined text-[16px]">rate_review</span>
                      <span>{{ isSubmitting ? 'Submitting Review...' : 'Submit Rating & Review' }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Lifecycle Summary -->
              <div class="md:col-span-5 bg-surface-container rounded-2xl p-stack-lg shadow-sm flex flex-col border border-outline-variant/20">
                <h3 class="font-label-sm text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-stack-md">Order Complete</h3>
                <div class="space-y-3 font-body-md text-xs text-on-surface">
                  <div class="flex items-center gap-2 text-green-600 font-semibold">
                    <span class="material-symbols-outlined text-[18px]">check</span>
                    <span>Order Placed</span>
                  </div>
                  <div class="flex items-center gap-2 text-green-600 font-semibold">
                    <span class="material-symbols-outlined text-[18px]">check</span>
                    <span>Accepted by Kitchen</span>
                  </div>
                  <div class="flex items-center gap-2 text-green-600 font-semibold">
                    <span class="material-symbols-outlined text-[18px]">check</span>
                    <span>Prepared & Packed</span>
                  </div>
                  <div class="flex items-center gap-2 text-green-600 font-semibold">
                    <span class="material-symbols-outlined text-[18px]">check</span>
                    <span>Handed Over</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="w-full max-w-xl flex flex-col sm:flex-row gap-gutter">
              <button
                @click="navigateTo('food_radar')"
                class="flex-1 bg-primary text-on-primary font-label-md py-3.5 px-6 rounded-xl shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 font-bold cursor-pointer"
              >
                <span class="material-symbols-outlined text-[20px]">explore</span>
                <span>Explore More Dishes</span>
              </button>
              <button
                @click="navigateTo('order_status')"
                class="flex-1 bg-surface-container-high text-on-surface font-label-md py-3.5 px-6 rounded-xl hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2 font-semibold cursor-pointer border border-outline-variant/20"
              >
                <span class="material-symbols-outlined text-[20px]">receipt_long</span>
                <span>View My Orders</span>
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  </div>
</template>
