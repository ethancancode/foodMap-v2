<script setup>
import { ref, computed } from 'vue'
import { orderApi } from '../services/api.js'

const props = defineProps({
  order: Object,
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const orderData = computed(() => ({
  _id: props.order?._id,
  id: props.order?.orderNumber || props.order?.id || '#A849-B',
  customer: props.order?.residentName || props.order?.customer || 'Sarah Jenkins',
  customerPhone: props.order?.residentPhone || props.order?.customerPhone || '+91 98201 45892',
  item: props.order?.foodName || props.order?.item || 'Spicy Garlic Noodles',
  qty: props.order?.quantity || props.order?.qty || 2,
  price: props.order?.totalAmount || props.order?.price || 160,
  notes: props.order?.specialInstructions || props.order?.notes || 'Please pack some extra green chutney!'
}))

const currentStep = ref(1) // 0: Confirmed, 1: Preparing, 2: Ready for Pickup, 3: Completed
const isUpdating = ref(false)

const steps = [
  { statusKey: 'accepted', label: 'Confirmed', sub: 'Order accepted by kitchen' },
  { statusKey: 'preparing', label: 'Preparing', sub: 'Cooking fresh on stove now' },
  { statusKey: 'ready_for_pickup', label: 'Ready for Pickup', sub: 'Waiting at counter / runner dispatch' },
  { statusKey: 'completed', label: 'Completed', sub: 'Collected by resident' }
]

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

async function advanceStatus() {
  if (isUpdating.value) return
  isUpdating.value = true

  const nextStepIdx = currentStep.value + 1
  const targetStatus = steps[Math.min(steps.length - 1, nextStepIdx)].statusKey

  try {
    const targetId = orderData.value._id || orderData.value.id
    if (targetId) {
      await orderApi.updateStatus(targetId, targetStatus, `Kitchen milestone: ${targetStatus}`)
    }

    if (currentStep.value < 2) {
      currentStep.value++
      const msg = currentStep.value === 1 ? 'Order marked as Preparing' : 'Order marked as Ready for Pickup'
      emit('action', { action: 'toast', payload: { message: msg } })
    } else if (currentStep.value === 2) {
      currentStep.value = 3
      emit('action', { action: 'toast', payload: { message: '🎉 Order marked Completed!' } })
      emit('navigate', 'order_completed', { order: orderData.value })
    }
  } catch (err) {
    console.error('Failed to update status:', err)
    if (currentStep.value < 2) currentStep.value++
    else if (currentStep.value === 2) emit('navigate', 'order_completed', { order: orderData.value })
  } finally {
    isUpdating.value = false
  }
}

async function cancelOrder() {
  try {
    const targetId = orderData.value._id || orderData.value.id
    if (targetId) {
      await orderApi.updateStatus(targetId, 'cancelled', 'Cancelled by vendor')
    }
    emit('action', { action: 'toast', payload: { message: 'Order cancelled' } })
  } catch (e) {
    console.log(e)
  }
  emit('navigate', 'vendor_dashboard')
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface">
    <!-- Left Navigation Sidebar -->
    <aside class="fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col border-r border-outline-variant/30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div class="p-stack-lg flex items-center gap-base">
        <button @click="navigateTo('vendor_dashboard')" class="flex items-center gap-base text-left cursor-pointer">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
            <span class="material-symbols-outlined text-on-primary">soup_kitchen</span>
          </div>
          <div class="flex flex-col">
            <span class="font-headline-lg text-title-md tracking-tight text-primary font-bold">FoodMap</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Vendor Portal</span>
          </div>
        </button>
      </div>

      <nav class="flex-1 px-base space-y-stack-sm mt-2">
        <button
          @click="navigateTo('vendor_dashboard')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer font-medium"
        >
          <span class="material-symbols-outlined mr-gutter">dashboard</span>
          <span class="font-label-md">Kitchen Hub</span>
        </button>
        <button
          @click="navigateTo('post_new_food')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer font-medium"
        >
          <span class="material-symbols-outlined mr-gutter">add_circle</span>
          <span class="font-label-md">Post New Food</span>
        </button>
        <button
          @click="navigateTo('new_order')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg transition-all bg-primary text-on-primary font-bold shadow-sm cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">notifications_active</span>
          <span class="font-label-md">Active Orders</span>
        </button>
        <button
          @click="navigateTo('vendor_profile')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer font-medium"
        >
          <span class="material-symbols-outlined mr-gutter">storefront</span>
          <span class="font-label-md">Kitchen Profile</span>
        </button>
      </nav>

      <div class="px-base py-stack-lg border-t border-outline-variant/20 space-y-stack-sm">
        <button
          @click="navigateTo('vendor_profile')"
          class="w-full flex items-center gap-gutter px-gutter py-stack-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 transition-colors text-left cursor-pointer"
        >
          <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            A
          </div>
          <div class="flex flex-col">
            <span class="font-label-md text-on-surface leading-none text-xs font-bold">Anjali's Kitchen</span>
            <span class="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">Home Chef</span>
          </div>
        </button>

        <button
          @click="navigateTo('welcome')"
          class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-medium transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">logout</span>
          <span>Switch Account</span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="pl-72">
      <!-- Header -->
      <header class="fixed top-0 left-72 right-0 h-20 bg-surface/90 backdrop-blur-md z-40 flex items-center px-container-margin justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-4">
          <button
            @click="navigateTo('vendor_dashboard')"
            class="flex items-center gap-2 text-on-surface hover:text-primary transition-colors bg-surface-container px-4 py-2 rounded-full font-label-md font-semibold text-xs cursor-pointer shadow-sm"
          >
            <span class="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Dashboard</span>
          </button>
        </div>
        <div class="flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
          <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>Real-time Sync Active</span>
        </div>
      </header>

      <main class="relative pt-20 min-h-screen bg-background">
        <div class="px-container-margin py-8 max-w-5xl mx-auto w-full flex-1 flex flex-col gap-6">
          <div class="flex flex-col gap-1 text-center md:text-left">
            <span class="text-[10px] text-primary uppercase tracking-widest font-bold">Kitchen Workflow Live Status</span>
            <h1 class="text-2xl font-black text-on-surface">Active Kitchen Preparation</h1>
            <p class="text-xs text-on-surface-variant max-w-2xl">Update cooking progress. Resident will receive live milestones on their map.</p>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 relative">
            <!-- Left Column: Order Content -->
            <div class="lg:col-span-8 flex flex-col gap-4">
              <div class="bg-surface-container-lowest rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden border border-outline-variant/20 shadow-sm">
                <div class="flex items-start justify-between relative z-10">
                  <div class="flex flex-col gap-0.5">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-on-surface text-base">Order {{ orderData.id }}</span>
                      <span class="px-2.5 py-0.5 bg-primary/10 text-primary font-bold rounded-full text-xs">Cooking Live</span>
                    </div>
                    <span class="text-xs text-on-surface-variant">Customer: {{ orderData.customer }}</span>
                  </div>
                  <div class="text-right flex flex-col items-end">
                    <span class="font-black text-lg text-primary">₹{{ orderData.price }}</span>
                    <span class="text-xs text-green-600 font-bold uppercase tracking-wider">Confirmed</span>
                  </div>
                </div>

                <div class="h-px w-full bg-outline-variant/20"></div>

                <div class="flex flex-col gap-2">
                  <h3 class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ordered Items</h3>
                  <div class="flex items-center justify-between p-3.5 bg-surface-container rounded-xl border border-outline-variant/20">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">{{ orderData.qty }}x</div>
                      <span class="text-sm text-on-surface font-bold">{{ orderData.item }}</span>
                    </div>
                    <span class="text-sm font-black text-on-surface">₹{{ orderData.price }}</span>
                  </div>
                </div>
              </div>

              <!-- Customer info -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-surface-container-lowest rounded-2xl p-4 flex flex-col gap-2 border border-outline-variant/20 shadow-sm">
                  <div class="flex items-center gap-2 text-primary">
                    <span class="material-symbols-outlined text-[18px]">notes</span>
                    <h3 class="text-xs font-bold uppercase tracking-wider">Customer Special Request</h3>
                  </div>
                  <p class="text-xs text-on-surface italic bg-surface-container p-3 rounded-xl border border-outline-variant/10">"{{ orderData.notes }}"</p>
                </div>
                <div class="bg-surface-container-lowest rounded-2xl p-4 flex flex-col gap-2 border border-outline-variant/20 shadow-sm">
                  <div class="flex items-center gap-2 text-primary">
                    <span class="material-symbols-outlined text-[18px]">person</span>
                    <h3 class="text-xs font-bold uppercase tracking-wider">Resident Contact</h3>
                  </div>
                  <div class="flex items-center justify-between bg-surface-container p-3 rounded-xl border border-outline-variant/10">
                    <div>
                      <span class="text-xs text-on-surface font-bold block">{{ orderData.customer }}</span>
                      <span class="text-[11px] text-on-surface-variant">{{ orderData.customerPhone }}</span>
                    </div>
                    <button
                      @click="emit('action', { action: 'toast', payload: { message: `Connecting to ${orderData.customer}...` } })"
                      class="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      <span class="material-symbols-outlined text-[18px]">call</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Column: Step Controls -->
            <div class="lg:col-span-4 flex flex-col gap-4 self-start">
              <div class="bg-surface-container-lowest rounded-2xl p-5 flex flex-col gap-4 shadow-sm border border-outline-variant/20">
                <h2 class="font-bold text-on-surface text-base">Progress Milestones</h2>
                
                <div class="space-y-3">
                  <div
                    v-for="(step, idx) in steps"
                    :key="step.label"
                    class="flex items-start gap-3"
                  >
                    <div
                      :class="currentStep >= idx ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant border border-outline-variant/30'"
                      class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    >
                      <span v-if="currentStep > idx" class="material-symbols-outlined text-[14px]">check</span>
                      <span v-else>{{ idx + 1 }}</span>
                    </div>
                    <div>
                      <p :class="currentStep >= idx ? 'font-bold text-on-surface' : 'text-on-surface-variant'" class="text-xs">
                        {{ step.label }}
                      </p>
                      <p class="text-[10px] text-on-surface-variant">{{ step.sub }}</p>
                    </div>
                  </div>
                </div>

                <button
                  @click="advanceStatus"
                  :disabled="isUpdating"
                  class="mt-2 w-full bg-primary hover:bg-primary/90 text-on-primary text-xs py-3.5 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 font-bold cursor-pointer disabled:opacity-50"
                >
                  <span class="material-symbols-outlined text-[18px]">
                    {{ currentStep === 0 ? 'skillet' : currentStep === 1 ? 'storefront' : 'check_circle' }}
                  </span>
                  <span>
                    {{ currentStep === 0 ? 'Mark Preparing' : currentStep === 1 ? 'Mark Ready for Pickup' : 'Mark Completed' }}
                  </span>
                </button>

                <button
                  @click="cancelOrder"
                  class="w-full bg-transparent border border-outline-variant/30 text-on-surface-variant hover:text-red-600 py-2.5 rounded-xl hover:bg-surface-container transition-colors text-xs font-semibold cursor-pointer"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  </div>
</template>
