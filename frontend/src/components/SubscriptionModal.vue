<script setup>
import { ref, onMounted } from 'vue'
import { subscriptionApi } from '../services/api.js'

const props = defineProps({
  isOpen: Boolean,
  user: Object,
})

const emit = defineEmits(['close', 'toast'])

const viewTab = ref('plans') // 'plans' | 'my_subscriptions'
const plans = ref([])
const mySubscriptions = ref([])
const isLoading = ref(true)
const isSubscribing = ref(false)

async function fetchPlans() {
  try {
    const res = await subscriptionApi.getPlans()
    plans.value = res?.plans || res?.data || []
  } catch (err) {
    console.warn('[Subscriptions] Error fetching plans:', err.message)
  }
}

async function fetchMySubscriptions() {
  try {
    const res = await subscriptionApi.getMySubscriptions()
    mySubscriptions.value = res?.subscriptions || res?.data || []
  } catch (err) {
    console.warn('[Subscriptions] Error fetching user subscriptions:', err.message)
  }
}

async function handleSubscribe(plan) {
  try {
    isSubscribing.value = true
    const res = await subscriptionApi.subscribe({
      planId: plan._id,
      deliveryAddress: props.user?.location?.address || 'Resident Address',
    })
    emit('toast', `Subscribed to ${plan.name}! Your daily priority cooked meals are active.`)
    await fetchMySubscriptions()
    viewTab.value = 'my_subscriptions'
  } catch (err) {
    emit('toast', err.message || 'Could not complete subscription')
  } finally {
    isSubscribing.value = false
  }
}

async function handleCancel(sub) {
  if (!confirm(`Are you sure you want to cancel your ${sub.plan?.name || 'meal'} subscription?`)) return
  try {
    await subscriptionApi.cancelSubscription(sub._id)
    sub.status = 'CANCELLED'
    emit('toast', 'Subscription cancelled')
  } catch (err) {
    emit('toast', err.message || 'Failed to cancel subscription')
  }
}

onMounted(async () => {
  isLoading.value = true
  await Promise.all([fetchPlans(), fetchMySubscriptions()])
  isLoading.value = false
})
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in">
    <div class="relative w-full max-w-2xl bg-surface rounded-3xl border border-outline-variant/30 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
      <button
        @click="emit('close')"
        class="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant cursor-pointer transition-colors"
      >
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>

      <!-- Header -->
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-[26px]">event_repeat</span>
        </div>
        <div>
          <h2 class="text-base sm:text-lg font-extrabold text-on-surface">Cooked Meal Subscriptions</h2>
          <p class="text-xs text-on-surface-variant">Daily homestyle lunch and dinner plans with guaranteed subscriber priority allocation</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
        <button
          @click="viewTab = 'plans'"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
            viewTab === 'plans' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
          ]"
        >
          Explore Meal Plans
        </button>

        <button
          @click="viewTab = 'my_subscriptions'"
          :class="[
            'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
            viewTab === 'my_subscriptions' ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
          ]"
        >
          <span>My Active Subscriptions</span>
          <span v-if="mySubscriptions.filter(s => s.status === 'ACTIVE').length > 0" class="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-black">
            {{ mySubscriptions.filter(s => s.status === 'ACTIVE').length }}
          </span>
        </button>
      </div>

      <!-- Explore Plans List -->
      <div v-if="viewTab === 'plans'" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="plan in plans"
            :key="plan._id"
            class="p-4 rounded-2xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all"
          >
            <div>
              <div class="flex items-start justify-between gap-2">
                <div>
                  <h3 class="text-xs sm:text-sm font-extrabold text-on-surface">{{ plan.name }}</h3>
                  <div class="text-[11px] text-on-surface-variant font-medium">
                    by {{ plan.vendor?.businessName || 'Home Kitchen' }}
                  </div>
                </div>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-high text-on-surface uppercase">
                  {{ plan.duration }}
                </span>
              </div>

              <p class="text-xs text-on-surface-variant mt-2 line-clamp-2">
                {{ plan.description }}
              </p>

              <!-- Priority Guarantee Badge -->
              <div class="mt-3 p-2 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center gap-2 text-[10.5px] text-on-surface font-semibold">
                <span class="material-symbols-outlined text-[15px] text-primary">verified</span>
                <span>Priority Allocation: {{ plan.subscriberPriorityAllocation || 10 }} meals daily</span>
              </div>

              <div class="mt-3 flex items-center justify-between text-xs">
                <span class="text-on-surface-variant font-medium">Cuisine: {{ plan.cuisine }}</span>
                <span class="text-on-surface-variant font-medium">{{ plan.availableDays?.length || 5 }} days/wk</span>
              </div>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-outline-variant/20">
              <div>
                <span class="text-base font-black text-on-surface">₹{{ plan.price }}</span>
                <span class="text-[10px] text-on-surface-variant">/{{ plan.duration === 'weekly' ? 'week' : 'month' }}</span>
              </div>

              <button
                @click="handleSubscribe(plan)"
                :disabled="isSubscribing"
                class="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {{ isSubscribing ? 'Processing...' : 'Subscribe Now' }}
              </button>
            </div>
          </div>

          <div v-if="plans.length === 0" class="col-span-full py-10 text-center text-xs text-on-surface-variant">
            No recurring subscription plans currently published by local kitchens. Check back soon!
          </div>
        </div>
      </div>

      <!-- My Active Subscriptions List -->
      <div v-if="viewTab === 'my_subscriptions'" class="space-y-4">
        <div class="space-y-3">
          <div
            v-for="sub in mySubscriptions"
            :key="sub._id"
            class="p-4 rounded-2xl bg-surface border border-outline-variant/30 shadow-sm space-y-3"
          >
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-extrabold text-on-surface">{{ sub.plan?.name || 'Tiffin Plan' }}</span>
                  <span
                    :class="[
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                      sub.status === 'ACTIVE' ? 'bg-surface-container-high text-on-surface' : 'bg-surface-container text-on-surface-variant'
                    ]"
                  >
                    {{ sub.status }}
                  </span>
                </div>
                <div class="text-[11px] text-on-surface-variant mt-0.5">
                  Prepared by {{ sub.vendor?.businessName || 'Home Kitchen' }}
                </div>
              </div>

              <div class="text-right">
                <div class="text-xs font-black text-primary">{{ sub.mealsRemaining }} Meals Left</div>
                <div class="text-[10px] text-on-surface-variant">of {{ sub.totalMeals }} total</div>
              </div>
            </div>

            <!-- Schedule info -->
            <div class="p-2.5 rounded-xl bg-surface-container/60 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-[10.5px] text-on-surface-variant font-medium">Valid Until: </span>
                <span class="font-bold text-on-surface">{{ new Date(sub.endDate).toLocaleDateString() }}</span>
              </div>
              <div>
                <span class="text-[10.5px] text-on-surface-variant font-medium">Demo Payment: </span>
                <span class="font-bold text-green-700">PAID (Verified)</span>
              </div>
            </div>

            <div v-if="sub.status === 'ACTIVE'" class="flex justify-end pt-1">
              <button
                @click="handleCancel(sub)"
                class="text-xs text-red-600 hover:text-red-700 font-bold cursor-pointer"
              >
                Cancel Subscription
              </button>
            </div>
          </div>

          <div v-if="mySubscriptions.length === 0" class="py-10 text-center text-xs text-on-surface-variant">
            You don't have any active meal subscriptions yet. Explore available home-chef plans above!
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
