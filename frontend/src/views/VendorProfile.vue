<script setup>
import { ref, computed, onMounted } from 'vue'
import { foodApi, vendorApi } from '../services/api.js'
import { getCookingCountdown, currentTimestamp } from '../utils/countdown.js'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'
import VendorProfileDishCard from '../components/VendorProfileDishCard.vue'
import EditDishModal from '../components/EditDishModal.vue'

// Re-evaluates every second as currentTimestamp ticks
const countdown = computed(() => {
  void currentTimestamp.value
  return (item) => getCookingCountdown(item)
})

const props = defineProps({
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const vendorProfile = ref(null)
const items = ref([])

onMounted(async () => {
  try {
    const vendorRes = await vendorApi.getMyProfile().catch(() => null)
    if (vendorRes?.vendor) {
      vendorProfile.value = vendorRes.vendor
    }
    const vendorId = vendorProfile.value?._id || vendorProfile.value?.id

    const foodsRes = vendorId ? await foodApi.getFoods({ vendor: vendorId }) : { foods: [] }
    const allFoods = foodsRes?.foods || foodsRes?.data || []
    items.value = allFoods.map((f) => ({
      id: f._id || f.id,
      _id: f._id || f.id,
      name: f.name,
      price: f.price,
      quantity: f.quantity !== undefined ? f.quantity : 1,
      portions: `${f.quantity} portions left`,
      time: f.cookingStatus || f.timeReady || 'Ready now',
      cookingStatus: f.cookingStatus || f.timeReady || 'Ready now',
      category: f.category || 'Main Course',
      desc: f.description || '',
      description: f.description || '',
      isVeg: f.isVeg !== undefined ? Boolean(f.isVeg) : (f.diet !== 'non-veg'),
      diet: f.diet || (f.isVeg ? 'veg' : 'non-veg'),
      image: f.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'
    }))
  } catch (e) {
    console.warn('Error loading vendor dishes:', e.message)
  }
})

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

function handleLogout() {
  emit('action', { action: 'logout' })
}

const isEditModalOpen = ref(false)
const selectedDishForEdit = ref(null)

function openEditModal(dish) {
  selectedDishForEdit.value = dish
  isEditModalOpen.value = true
}

function handleDishSaved(updatedDish) {
  const id = updatedDish._id || updatedDish.id
  const idx = items.value.findIndex((d) => (d.id && d.id === id) || (d._id && d._id === id))
  if (idx !== -1) {
    items.value[idx] = {
      ...items.value[idx],
      ...updatedDish,
      portions: `${updatedDish.quantity} portions left`,
      desc: updatedDish.description,
      time: updatedDish.cookingStatus
    }
  }
}

function handleDishDeleted(dishId) {
  items.value = items.value.filter((d) => d.id !== dishId && d._id !== dishId)
}

function handleToast(message) {
  emit('action', { action: 'toast', payload: { message } })
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface">
    <!-- Unified Vendor Sidebar -->
    <AppSidebar
      :is-open="false"
      role="vendor"
      active-route="vendor_profile"
      :user="props.user"
      :vendor-profile="vendorProfile"
      @navigate="navigateTo"
      @logout="handleLogout"
    />

    <!-- Main Content Area -->
    <div class="lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        :show-back="true"
        back-label="Back to Dashboard"
        back-route="vendor_dashboard"
        :show-sync-badge="false"
        @navigate="navigateTo"
      >
        <template #actions>
          <button
            type="button"
            @click="navigateTo('edit_vendor_profile')"
            class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
          >
            Edit Profile
          </button>
        </template>
      </AppHeader>

      <main class="relative pt-20 min-h-screen bg-background">
        <div class="max-w-5xl mx-auto px-container-margin py-stack-lg flex flex-col gap-6">
          
          <!-- Kitchen Banner & Identity -->
          <div class="rounded-2xl overflow-hidden bg-surface shadow-sm border border-outline-variant/20 flex flex-col">
            <div class="relative w-full h-[220px] bg-gradient-to-r from-primary/90 via-primary/70 to-amber-700/80">
              <img
                v-if="vendorProfile?.coverImage"
                :alt="vendorProfile?.businessName || 'Kitchen Cover'"
                class="w-full h-full object-cover"
                :src="vendorProfile.coverImage"
                @error="$event.target.style.display = 'none'"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"></div>
              
              <div class="absolute bottom-4 left-6 right-6 flex items-end justify-between text-white">
                <div class="flex items-center gap-4">
                  <div class="w-20 h-20 rounded-full border-4 border-surface overflow-hidden bg-surface-variant shadow-lg shrink-0 flex items-center justify-center">
                    <img
                      v-if="props.user?.avatar || vendorProfile?.user?.avatar"
                      class="w-full h-full object-cover"
                      :src="props.user?.avatar || vendorProfile?.user?.avatar"
                      @error="$event.target.style.display = 'none'"
                    />
                    <div v-else class="w-full h-full bg-primary/25 flex items-center justify-center text-white font-bold text-2xl">
                      {{ (vendorProfile?.businessName || props.user?.vendor?.businessName || props.user?.name || 'P').charAt(0).toUpperCase() }}
                    </div>
                  </div>
                  <div>
                    <h1 class="font-headline-lg text-2xl font-bold text-white mb-0.5">
                      {{ vendorProfile?.businessName || props.user?.vendor?.businessName || props.user?.name || "Priya Kitchen" }}
                    </h1>
                    <p class="font-label-md text-xs text-white/90 flex items-center gap-1.5">
                      <span class="material-symbols-outlined text-[16px]">soup_kitchen</span>
                      <span>{{ vendorProfile?.category || "Home Cook" }}<template v-if="vendorProfile?.location?.pickupAddress"> • {{ vendorProfile.location.pickupAddress }}</template></span>
                    </p>
                  </div>
                </div>

                <div class="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1">
                  <span class="material-symbols-outlined text-yellow-400 text-[16px]">star</span>
                  <span v-if="vendorProfile?.totalReviews && vendorProfile.totalReviews > 0">
                    {{ vendorProfile.rating || '5.0' }} ({{ vendorProfile.totalReviews }} Reviews)
                  </span>
                  <span v-else>New Kitchen</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Kitchen Story & Trust Card (When bio or experience exist) -->
          <div
            v-if="vendorProfile?.bio || vendorProfile?.experience"
            class="rounded-2xl p-5 bg-surface shadow-sm border border-outline-variant/20 flex flex-col gap-3"
          >
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[20px]">menu_book</span>
              <h2 class="font-title-md font-bold text-on-surface text-base">About the Kitchen & Chef</h2>
            </div>
            
            <div v-if="vendorProfile?.experience" class="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-xl w-fit text-xs font-semibold">
              <span class="material-symbols-outlined text-[16px]">military_tech</span>
              <span>{{ vendorProfile.experience }}</span>
            </div>

            <p v-if="vendorProfile?.bio" class="text-xs text-on-surface-variant leading-relaxed whitespace-pre-line">
              {{ vendorProfile.bio }}
            </p>
          </div>

          <!-- Menu Section -->
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h2 class="font-title-md font-bold text-on-surface text-lg flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-primary" :class="{ 'animate-pulse': items.length > 0 }"></span>
                <span>Active Live Dishes</span>
              </h2>
              <span class="text-xs text-on-surface-variant font-medium">
                {{ items.length > 0 ? 'Tap any dish to edit details & portions' : '0 Dishes active' }}
              </span>
            </div>

            <!-- Dishes Grid (when dishes exist) -->
            <div v-if="items.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <VendorProfileDishCard
                v-for="item in items"
                :key="item.id || item._id"
                :item="item"
                @edit="openEditModal"
              />
            </div>

            <!-- Empty State (matching dashboard style) -->
            <div
              v-else
              class="py-12 px-6 flex flex-col items-center justify-center text-center bg-surface-container-lowest rounded-3xl border border-dashed border-outline-variant/50 shadow-xs"
            >
              <div class="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <span class="material-symbols-outlined text-[28px]">soup_kitchen</span>
              </div>
              <h3 class="text-base font-bold text-on-surface">No Live Food Batches Posted Yet</h3>
              <p class="text-xs text-on-surface-variant max-w-sm mt-1 mb-4">
                Ready to start cooking? Tap the button below to broadcast your fresh home meals to nearby residents in real-time.
              </p>
              <button
                @click="navigateTo('post_new_food')"
                class="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Post First Dish</span>
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>

    <!-- Edit Dish Modal Component -->
    <EditDishModal
      :is-open="isEditModalOpen"
      :dish="selectedDishForEdit"
      @close="isEditModalOpen = false"
      @saved="handleDishSaved"
      @deleted="handleDishDeleted"
      @toast="handleToast"
    />
  </div>
</template>
