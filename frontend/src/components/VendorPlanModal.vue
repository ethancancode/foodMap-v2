<script setup>
import { ref } from 'vue'
import { subscriptionApi } from '../services/api.js'

const props = defineProps({
  isOpen: Boolean,
})

const emit = defineEmits(['close', 'plan-created', 'toast'])

const name = ref('')
const description = ref('')
const price = ref(2999)
const duration = ref('monthly')
const mealCategory = ref('Lunch')
const cuisine = ref('North Indian Home-style')
const mealsPerDay = ref(1)
const maxSubscribers = ref(30)
const subscriberPriorityAllocation = ref(15)
const isSubmitting = ref(false)

async function handleSubmit() {
  if (!name.value.trim()) {
    emit('toast', 'Please enter a plan name')
    return
  }

  try {
    isSubmitting.value = true
    const res = await subscriptionApi.createPlan({
      name: name.value,
      description: description.value,
      price: Number(price.value),
      duration: duration.value,
      mealCategory: mealCategory.value,
      cuisine: cuisine.value,
      mealsPerDay: Number(mealsPerDay.value),
      maxSubscribers: Number(maxSubscribers.value),
      subscriberPriorityAllocation: Number(subscriberPriorityAllocation.value),
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    })

    emit('toast', 'Subscription meal plan published successfully!')
    emit('plan-created', res.plan || res.data)
    emit('close')
  } catch (err) {
    emit('toast', err.message || 'Failed to create plan')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in">
    <div class="relative w-full max-w-lg bg-surface rounded-3xl border border-outline-variant/30 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
      <button
        @click="emit('close')"
        class="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant cursor-pointer transition-colors"
      >
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>

      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <span class="material-symbols-outlined text-[22px]">event_repeat</span>
        </div>
        <div>
          <h2 class="text-base font-extrabold text-on-surface">Create Recurring Meal Plan</h2>
          <p class="text-xs text-on-surface-variant">Tiffin service & recurring weekly/monthly cooked meal subscriptions</p>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4 text-xs font-medium">
        <div class="space-y-1">
          <label class="font-bold text-on-surface">Plan Title</label>
          <input
            v-model="name"
            type="text"
            required
            placeholder="e.g. Executive Healthy Lunch Tiffin"
            class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container/60 border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary"
          />
        </div>

        <div class="space-y-1">
          <label class="font-bold text-on-surface">Description & Daily Menu Details</label>
          <textarea
            v-model="description"
            rows="2"
            placeholder="e.g. 1 Dal, 1 Dry Sabzi, 3 Rotis, Rice & Fresh Salad delivered hot every afternoon."
            class="w-full px-3.5 py-2 rounded-xl bg-surface-container/60 border border-outline-variant/40 text-on-surface focus:outline-none focus:border-primary resize-none"
          ></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="font-bold text-on-surface">Price (₹)</label>
            <input
              v-model.number="price"
              type="number"
              min="100"
              class="w-full px-3.5 py-2 rounded-xl bg-surface-container/60 border border-outline-variant/40 text-on-surface focus:outline-none"
            />
          </div>

          <div class="space-y-1">
            <label class="font-bold text-on-surface">Billing Duration</label>
            <select
              v-model="duration"
              class="w-full px-3.5 py-2 rounded-xl bg-surface-container/60 border border-outline-variant/40 text-on-surface focus:outline-none"
            >
              <option value="monthly">Monthly (22 Weekday Meals)</option>
              <option value="weekly">Weekly (5 Weekday Meals)</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="font-bold text-on-surface">Meal Category</label>
            <select
              v-model="mealCategory"
              class="w-full px-3.5 py-2 rounded-xl bg-surface-container/60 border border-outline-variant/40 text-on-surface focus:outline-none"
            >
              <option value="Lunch">Lunch</option>
              <option value="Dinner">Dinner</option>
              <option value="Breakfast">Breakfast</option>
              <option value="All Meals">All Meals</option>
            </select>
          </div>

          <div class="space-y-1">
            <label class="font-bold text-on-surface">Cuisine Style</label>
            <input
              v-model="cuisine"
              type="text"
              placeholder="e.g. Gujarati Home-style"
              class="w-full px-3.5 py-2 rounded-xl bg-surface-container/60 border border-outline-variant/40 text-on-surface focus:outline-none"
            />
          </div>
        </div>

        <!-- Subscriber Priority System Allocation Box -->
        <div class="p-3.5 rounded-2xl bg-surface-container border border-outline-variant/30 text-on-surface space-y-2">
          <div class="flex items-center gap-1.5 font-bold text-xs text-primary">
            <span class="material-symbols-outlined text-[16px]">priority_high</span>
            <span>Fair Subscriber Priority Allocation</span>
          </div>
          <p class="text-[11px] text-on-surface-variant leading-relaxed">
            Reserved portions guarantee that paying subscribers always receive their meal before open-market orders. Unused portions automatically roll over to general radar discovery as prep time approaches.
          </p>
          <div class="flex items-center justify-between pt-1">
            <span class="text-xs font-bold text-on-surface">Daily Priority Portions:</span>
            <input
              v-model.number="subscriberPriorityAllocation"
              type="number"
              min="1"
              max="100"
              class="w-20 px-2 py-1 rounded-lg bg-surface border border-outline-variant/40 text-center font-bold text-on-surface"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="font-bold text-on-surface">Max Subscriber Capacity</label>
            <input
              v-model.number="maxSubscribers"
              type="number"
              min="5"
              class="w-full px-3.5 py-2 rounded-xl bg-surface-container/60 border border-outline-variant/40 text-on-surface focus:outline-none"
            />
          </div>
        </div>

        <div class="pt-2">
          <button
            type="submit"
            :disabled="isSubmitting"
            class="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:brightness-105 transition-all cursor-pointer disabled:opacity-50"
          >
            {{ isSubmitting ? 'Publishing Plan...' : 'Publish Meal Plan' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
