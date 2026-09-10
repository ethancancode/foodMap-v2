<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { foodApi, vendorApi } from '../services/api.js'
import { onVendorUpdated, onVendorReviewAdded } from '../services/socket.js'
import { DEFAULT_FOOD_SVG } from '../utils/defaultFoodImage.js'
import { getCookingCountdown, currentTimestamp } from '../utils/countdown.js'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'
import VendorProfileDishCard from '../components/VendorProfileDishCard.vue'
import EditDishModal from '../components/EditDishModal.vue'

const route = useRoute()

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
const reviews = ref([])
const isMobileSidebarOpen = ref(false)
let unsubVendor, unsubReview

// Determine if the currently logged-in user is the owner of this vendor profile
const isOwner = computed(() => {
  if (props.currentRole !== 'vendor' && props.user?.role !== 'vendor') return false
  const targetId = route.params?.id
  const myVendorId = props.user?.vendor?._id || props.user?.vendor?.id || props.user?.vendor
  if (!targetId) return true // viewing own /vendor-profile route
  if (myVendorId && String(myVendorId) === String(targetId)) return true
  return false
})

async function loadProfile() {
  try {
    const routeVendorId = route.params?.id
    let targetVendorId = routeVendorId

    if (targetVendorId) {
      const res = await vendorApi.getVendorById(targetVendorId).catch(() => null)
      if (res?.vendor) {
        vendorProfile.value = res.vendor
      }
    } else if (props.user?.role === 'vendor' || props.currentRole === 'vendor') {
      const vendorRes = await vendorApi.getMyProfile().catch(() => null)
      if (vendorRes?.vendor) {
        vendorProfile.value = vendorRes.vendor
      }
    }

    const vendorId = vendorProfile.value?._id || vendorProfile.value?.id || targetVendorId

    const [foodsRes, reviewsRes] = await Promise.all([
      vendorId ? foodApi.getFoods({ vendor: vendorId }) : { foods: [] },
      vendorId ? vendorApi.getReviews(vendorId).catch(() => ({ reviews: [] })) : { reviews: [] }
    ])

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
      image: f.image || DEFAULT_FOOD_SVG
    }))

    reviews.value = reviewsRes?.reviews || reviewsRes?.data || []
  } catch (e) {
    console.warn('Error loading vendor dishes:', e.message)
  }
}

watch(() => route.params.id, async () => {
  await loadProfile()
})

onMounted(async () => {
  await loadProfile()

  unsubVendor = onVendorUpdated((data) => {
    const updated = data.vendor || data
    const myId = vendorProfile.value?._id || vendorProfile.value?.id
    if (updated && (updated._id === myId || updated.id === myId)) {
      vendorProfile.value = { ...vendorProfile.value, ...updated }
    }
  })

  unsubReview = onVendorReviewAdded((data) => {
    const myId = vendorProfile.value?._id || vendorProfile.value?.id
    if (data && String(data.vendorId) === String(myId)) {
      if (data.vendor) {
        vendorProfile.value = { ...vendorProfile.value, ...data.vendor }
      }
      if (data.review) {
        reviews.value.unshift(data.review)
      }
    }
  })
})

onUnmounted(() => {
  if (unsubVendor) unsubVendor()
  if (unsubReview) unsubReview()
})

function formatDate(isoStr) {
  if (!isoStr) return 'Just now'
  try {
    const d = new Date(isoStr)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return 'Recently'
  }
}

function navigateTo(route, payload = null) {
  isMobileSidebarOpen.value = false
  emit('navigate', route, payload)
}

function handleLogout() {
  isMobileSidebarOpen.value = false
  emit('action', { action: 'logout' })
}

const isEditModalOpen = ref(false)
const selectedDishForEdit = ref(null)

function openEditModal(dish) {
  if (!isOwner.value) return
  selectedDishForEdit.value = dish
  isEditModalOpen.value = true
}

function handleDishClick(dish) {
  if (isOwner.value) {
    openEditModal(dish)
  } else {
    emit('navigate', 'food_details', { food: dish })
  }
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
  <div class="component-root w-full min-h-screen bg-background text-on-surface pb-20 lg:pb-0">
    <!-- Reusable AppSidebar: Uses current user role (resident or vendor) -->
    <AppSidebar
      :is-open="isMobileSidebarOpen"
      :role="isOwner ? 'vendor' : (props.currentRole || (props.user ? 'resident' : 'guest'))"
      :active-route="isOwner ? 'vendor_profile' : 'food_radar'"
      :user="props.user"
      :vendor-profile="isOwner ? vendorProfile : null"
      @close="isMobileSidebarOpen = false"
      @navigate="navigateTo"
      @logout="handleLogout"
    />

    <!-- Main Content Area -->
    <div class="pl-0 lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        :show-back="true"
        :back-label="isOwner ? 'Dashboard' : 'Back'"
        :back-route="isOwner ? 'vendor_dashboard' : (props.user?.role === 'resident' ? 'resident_profile' : 'food_radar')"
        :show-sync-badge="false"
        @toggle-sidebar="isMobileSidebarOpen = true"
        @navigate="navigateTo"
      >
        <template #actions>
          <button
            v-if="isOwner"
            type="button"
            @click="navigateTo('edit_vendor_profile')"
            class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
          >
            Edit Profile
          </button>
          <span v-else class="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            Kitchen Profile
          </span>
        </template>
      </AppHeader>

      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background">
        <div class="max-w-5xl mx-auto px-4 sm:px-container-margin py-4 sm:py-stack-lg flex flex-col gap-6">
          
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
                      v-if="vendorProfile?.user?.avatar || (isOwner && props.user?.avatar)"
                      class="w-full h-full object-cover"
                      :src="vendorProfile?.user?.avatar || (isOwner ? props.user?.avatar : null)"
                      @error="$event.target.style.display = 'none'"
                    />
                    <div v-else class="w-full h-full bg-primary/25 flex items-center justify-center text-white font-bold text-2xl">
                      {{ (vendorProfile?.businessName || (isOwner ? (props.user?.vendor?.businessName || props.user?.name) : 'K') || 'K').charAt(0).toUpperCase() }}
                    </div>
                  </div>
                  <div>
                    <h1 class="font-headline-lg text-2xl font-bold text-white mb-0.5">
                      {{ vendorProfile?.businessName || (isOwner ? (props.user?.vendor?.businessName || props.user?.name) : "Home Kitchen") || "Home Kitchen" }}
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
                {{ items.length > 0 ? (isOwner ? 'Tap any dish to edit details & portions' : `${items.length} dish${items.length > 1 ? 'es' : ''} available`) : '0 Dishes active' }}
              </span>
            </div>

            <!-- Dishes Grid (when dishes exist) -->
            <div v-if="items.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <VendorProfileDishCard
                v-for="item in items"
                :key="item.id || item._id"
                :item="item"
                :is-owner="isOwner"
                @edit="openEditModal"
                @select="handleDishClick"
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
                {{ isOwner ? 'Ready to start cooking? Tap the button below to broadcast your fresh home meals to nearby residents in real-time.' : 'This kitchen has no active live food batches right now. Check back soon!' }}
              </p>
              <button
                v-if="isOwner"
                @click="navigateTo('post_new_food')"
                class="px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[16px]">add_circle</span>
                <span>Post First Dish</span>
              </button>
            </div>
          </div>

          <!-- Customer Reviews & Ratings Section -->
          <div class="flex flex-col gap-4 mt-2">
            <div class="flex items-center justify-between">
              <h2 class="font-title-md font-bold text-on-surface text-lg flex items-center gap-2">
                <span class="material-symbols-outlined text-amber-500 text-[22px]">reviews</span>
                <span>Customer Reviews</span>
              </h2>
              <span v-if="vendorProfile?.totalReviews && vendorProfile.totalReviews > 0" class="text-xs font-bold text-on-surface-variant">
                ★ {{ vendorProfile.rating ? vendorProfile.rating.toFixed(1) : '5.0' }} avg ({{ vendorProfile.totalReviews }} review{{ vendorProfile.totalReviews > 1 ? 's' : '' }})
              </span>
              <span v-else class="text-xs text-on-surface-variant">No reviews yet</span>
            </div>

            <!-- Reviews List -->
            <div v-if="reviews.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="rev in reviews"
                :key="rev._id || rev.id"
                class="bg-surface rounded-2xl p-4 sm:p-5 border border-outline-variant/20 shadow-xs flex flex-col gap-2.5"
              >
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {{ (rev.userName || 'R').charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <span class="text-xs font-bold text-on-surface block">{{ rev.userName || 'Resident' }}</span>
                      <span class="text-[10px] text-on-surface-variant block">{{ formatDate(rev.createdAt) }}</span>
                    </div>
                  </div>
                  <div class="flex items-center gap-0.5 text-amber-500">
                    <span
                      v-for="s in 5"
                      :key="s"
                      class="material-symbols-outlined text-[16px]"
                      :style="s <= rev.rating ? 'font-variation-settings: \'FILL\' 1;' : 'opacity: 0.25;'"
                    >
                      star
                    </span>
                  </div>
                </div>

                <!-- Highlighted Dish Badge (what dish the resident voted for) -->
                <div v-if="rev.dishName || rev.order?.foodName || rev.order?.itemSummary || rev.order?.items?.[0]?.name" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[11px] font-bold w-fit">
                  <span class="material-symbols-outlined text-[14px]">restaurant_menu</span>
                  <span>Voted for: {{ rev.dishName || rev.order?.foodName || rev.order?.itemSummary || rev.order?.items?.[0]?.name }}</span>
                </div>

                <p v-if="rev.comment" class="text-xs text-on-surface leading-relaxed mt-0.5">
                  "{{ rev.comment }}"
                </p>
                <p v-else class="text-xs text-on-surface-variant/70 italic mt-0.5">
                  Rated {{ rev.rating }} star{{ rev.rating > 1 ? 's' : '' }} without additional comment.
                </p>
              </div>
            </div>

            <!-- Empty Reviews State -->
            <div
              v-else
              class="py-8 px-6 flex flex-col items-center justify-center text-center bg-surface-container-lowest rounded-2xl border border-dashed border-outline-variant/40"
            >
              <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2">
                <span class="material-symbols-outlined text-[22px]">star</span>
              </div>
              <h4 class="text-xs font-bold text-on-surface">No Reviews Yet</h4>
              <p class="text-[11px] text-on-surface-variant max-w-xs mt-0.5">
                Reviews and star ratings given by residents upon order completion will appear here.
              </p>
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
