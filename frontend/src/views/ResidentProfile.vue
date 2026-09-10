<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { orderApi, vendorApi, residentApi } from '../services/api.js'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

const route = useRoute()

const props = defineProps({
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const isMobileSidebarOpen = ref(false)
const profileUser = ref(props.user || null)
const userOrders = ref([])
const isLoadingOrders = ref(false)
const vouchedKitchens = ref([])
const isLoadingKitchens = ref(false)

// Check if currently logged in user is the owner of this resident profile
const isOwner = computed(() => {
  const targetId = route.params?.id
  const myUserId = props.user?._id || props.user?.id
  // If no target ID is in the route, they are viewing their own profile
  if (!targetId) return true
  // If target ID matches logged-in user's ID
  if (myUserId && String(myUserId) === String(targetId)) return true
  return false
})

async function loadProfileData() {
  const targetId = route.params?.id
  const myUserId = props.user?._id || props.user?.id

  // Fetch resident profile details (works for own profile or specific targetId)
  try {
    isLoadingKitchens.value = true
    const residentRes = await residentApi.getProfile(targetId || myUserId).catch(() => null)
    if (residentRes?.resident?.user) {
      profileUser.value = residentRes.resident.user
    } else if (isOwner.value) {
      profileUser.value = props.user
    }
    const vouchedList = residentRes?.resident?.vouchedVendors || (isOwner.value ? (props.user?.resident?.vouchedVendors || props.user?.vouchedVendors || []) : [])
    vouchedKitchens.value = Array.isArray(vouchedList) ? vouchedList.filter(Boolean) : []
  } catch (e) {
    console.warn('Error loading vouched kitchens:', e.message)
    if (isOwner.value) profileUser.value = props.user
  } finally {
    isLoadingKitchens.value = false
  }

  // Strictly only fetch user's personal orders and stats if they are the profile owner
  if (isOwner.value) {
    try {
      isLoadingOrders.value = true
      const res = await orderApi.getOrders().catch(() => ({ orders: [] }))
      userOrders.value = res?.orders || res?.data || []
    } catch (e) {
      console.warn('Error loading resident orders:', e.message)
    } finally {
      isLoadingOrders.value = false
    }
  } else {
    userOrders.value = []
    isLoadingOrders.value = false
  }
}

watch(() => route.params?.id, async () => {
  await loadProfileData()
})

onMounted(async () => {
  await loadProfileData()
})

const activeOrders = computed(() => {
  return userOrders.value.filter(
    (o) => !['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(o.status?.toUpperCase())
  )
})

const completedOrders = computed(() => {
  return userOrders.value.filter(
    (o) => ['COMPLETED', 'DELIVERED'].includes(o.status?.toUpperCase())
  )
})

function navigateTo(route, payload = null) {
  isMobileSidebarOpen.value = false
  emit('navigate', route, payload)
}

function handleLogout() {
  isMobileSidebarOpen.value = false
  emit('action', { action: 'logout' })
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface pb-20 lg:pb-0">
    <!-- Reusable AppSidebar -->
    <AppSidebar
      :is-open="isMobileSidebarOpen"
      :role="props.currentRole || 'resident'"
      activeRoute="resident_profile"
      :user="props.user"
      @close="isMobileSidebarOpen = false"
      @navigate="navigateTo"
      @logout="handleLogout"
    />

    <!-- Main Content Area -->
    <div class="pl-0 lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        :show-back="true"
        :back-label="isOwner ? 'Radar' : 'Back'"
        :back-route="props.currentRole === 'vendor' ? 'vendor_dashboard' : 'food_radar'"
        :show-sync-badge="false"
        @toggle-sidebar="isMobileSidebarOpen = true"
        @navigate="navigateTo"
      >
        <template #actions>
          <span class="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            {{ isOwner ? 'My Resident Profile' : 'Resident Profile' }}
          </span>
        </template>
      </AppHeader>

      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background">
        <div class="max-w-4xl mx-auto px-4 sm:px-container-margin py-4 sm:py-stack-lg flex flex-col gap-4 sm:gap-section-gap">
          
          <!-- Profile Header Section -->
          <section class="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-stack-lg w-full bg-surface-container-lowest p-4 sm:p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
            <div class="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden shadow-md ring-4 ring-surface flex-shrink-0 relative flex items-center justify-center bg-primary/20">
              <img
                v-if="profileUser?.avatar || (isOwner && props.user?.avatar)"
                alt="Profile photo"
                class="w-full h-full object-cover"
                :src="profileUser?.avatar || (isOwner ? props.user?.avatar : null)"
                @error="$event.target.style.display = 'none'"
              />
              <span v-else class="text-3xl sm:text-4xl font-bold text-primary">
                {{ (profileUser?.name || props.user?.name || 'R').charAt(0).toUpperCase() }}
              </span>
            </div>
            <div class="flex flex-col items-center sm:items-start text-center sm:text-left flex-grow gap-1">
              <div class="flex items-center gap-2 text-primary font-label-sm text-xs font-bold uppercase tracking-wider">
                <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                FoodMap Verified Resident
              </div>
              <h2 class="font-display-lg text-lg sm:text-title-md font-bold text-on-surface">
                {{ profileUser?.name || (isOwner ? props.user?.name : 'Resident User') || 'Resident User' }}
              </h2>
              <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 text-xs text-on-surface-variant mt-1">
                <span v-if="(profileUser?.phone || (isOwner && props.user?.phone)) && isOwner" class="flex items-center gap-1">
                  <span class="material-symbols-outlined text-[16px]">call</span>
                  {{ profileUser?.phone || props.user?.phone }}
                </span>
                <span v-if="profileUser?.occupation || (isOwner && props.user?.occupation)" class="hidden sm:inline">•</span>
                <span v-if="profileUser?.occupation || (isOwner && props.user?.occupation)" class="flex items-center gap-1 capitalize">
                  <span class="material-symbols-outlined text-[16px]">badge</span>
                  {{ (profileUser?.occupation || props.user?.occupation) === 'prefer_not_to_tell' ? 'Private' : (profileUser?.occupation || props.user?.occupation) }}
                </span>
                <span v-if="profileUser?.gender || (isOwner && props.user?.gender)" class="hidden sm:inline">•</span>
                <span v-if="profileUser?.gender || (isOwner && props.user?.gender)" class="flex items-center gap-1 capitalize">
                  <span class="material-symbols-outlined text-[16px]">person</span>
                  {{ (profileUser?.gender || props.user?.gender) === 'prefer_not_to_say' ? 'Private' : (profileUser?.gender || props.user?.gender) }}
                </span>
              </div>
            </div>
            <div class="px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200 text-xs font-semibold flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px]">verified</span>
              <span>Active</span>
            </div>
          </section>

          <!-- Stats Grid: ONLY VISIBLE TO PROFILE OWNER -->
          <section v-if="isOwner" class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-gutter w-full animate-in fade-in duration-200">
            <div class="bg-surface-container-lowest rounded-xl p-3 sm:p-4 shadow-sm border border-outline-variant/20 flex flex-col justify-between">
              <span class="text-[11px] sm:text-xs text-on-surface-variant uppercase font-semibold">Active Orders</span>
              <p class="font-headline-lg text-xl sm:text-2xl font-bold text-primary mt-1 sm:mt-2">{{ activeOrders.length }}</p>
            </div>
            <div class="bg-surface-container-lowest rounded-xl p-3 sm:p-4 shadow-sm border border-outline-variant/20 flex flex-col justify-between">
              <span class="text-[11px] sm:text-xs text-on-surface-variant uppercase font-semibold">Completed</span>
              <p class="font-headline-lg text-xl sm:text-2xl font-bold text-on-surface mt-1 sm:mt-2">{{ completedOrders.length }}</p>
            </div>
            <div class="bg-surface-container-lowest rounded-xl p-3 sm:p-4 shadow-sm border border-outline-variant/20 flex flex-col justify-between">
              <span class="text-[11px] sm:text-xs text-on-surface-variant uppercase font-semibold">Total Orders</span>
              <p class="font-headline-lg text-xl sm:text-2xl font-bold text-on-surface mt-1 sm:mt-2">{{ userOrders.length }}</p>
            </div>
            <div class="bg-surface-container-lowest rounded-xl p-3 sm:p-4 shadow-sm border border-outline-variant/20 flex flex-col justify-between">
              <span class="text-[11px] sm:text-xs text-on-surface-variant uppercase font-semibold">Role / Type</span>
              <p class="font-bold text-xs text-primary mt-1 sm:mt-2 truncate capitalize">{{ (profileUser?.occupation || props.user?.occupation) && (profileUser?.occupation || props.user?.occupation) !== 'prefer_not_to_tell' ? (profileUser?.occupation || props.user?.occupation) : 'Resident' }}</p>
            </div>
          </section>

          <!-- Main Grid: Left side (Orders for owner, or Vouched Kitchens for external viewers) -->
          <div class="grid grid-cols-1" :class="isOwner ? 'lg:grid-cols-12 gap-4 sm:gap-gutter' : 'max-w-2xl mx-auto w-full'">
            <!-- Left: Orders (ONLY VISIBLE TO PROFILE OWNER) -->
            <div v-if="isOwner" class="lg:col-span-7 flex flex-col gap-3 sm:gap-4">
              <h3 class="font-title-md font-bold text-on-surface text-sm sm:text-base flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">receipt_long</span>
                <span>Active & Recent Orders</span>
              </h3>

              <!-- Loading state -->
              <div v-if="isLoadingOrders" class="p-8 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/20">
                <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <span class="text-xs text-on-surface-variant font-medium">Loading your orders...</span>
              </div>

              <!-- Real Orders List -->
              <div v-else-if="userOrders.length > 0" class="flex flex-col gap-2.5">
                <div
                  v-for="order in userOrders.slice(0, 5)"
                  :key="order._id || order.id"
                  class="bg-surface-container-lowest rounded-xl p-3.5 sm:p-4 shadow-sm border border-outline-variant/20 flex items-center justify-between gap-2"
                >
                  <div class="flex flex-col">
                    <div class="flex items-center gap-2">
                      <h4 class="font-title-md font-bold text-on-surface text-xs sm:text-sm">{{ order.foodName || order.itemSummary || 'Delicious Meal' }}</h4>
                      <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" :class="order.status === 'CONFIRMED' || order.status === 'PREPARING' ? 'bg-primary/10 text-primary' : (order.status === 'READY' ? 'bg-green-100 text-green-800' : 'bg-surface-container text-on-surface-variant')">
                        {{ order.status || 'ORDERED' }}
                      </span>
                    </div>
                    <p class="text-[11px] sm:text-xs text-on-surface-variant mt-0.5">
                      {{ order.vendorName || (typeof order.vendor === 'object' ? order.vendor?.businessName : order.vendor) || "Home Kitchen" }} • {{ order.quantity || 1 }} portion(s) • ₹{{ order.totalAmount || 80 }}
                    </p>
                  </div>
                  <button
                    @click="navigateTo('order_status', { order })"
                    class="px-3 py-1.5 bg-primary text-on-primary font-label-md text-xs font-bold rounded-lg hover:bg-primary/90 transition-all cursor-pointer shrink-0"
                  >
                    Track
                  </button>
                </div>
              </div>

              <!-- Empty state for new resident with 0 orders -->
              <div v-else class="p-8 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/20 flex flex-col items-center gap-2">
                <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-1">
                  <span class="material-symbols-outlined text-2xl">soup_kitchen</span>
                </div>
                <h4 class="font-bold text-xs sm:text-sm text-on-surface">No Orders Placed Yet</h4>
                <p class="text-[11px] text-on-surface-variant max-w-xs">Discover fresh meals actively cooking in your neighborhood right now.</p>
                <button
                  @click="navigateTo('food_radar')"
                  class="mt-2 px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
                >
                  Explore Radar Map
                </button>
              </div>
            </div>

            <!-- Right: Real Vouched Kitchens -->
            <div :class="isOwner ? 'lg:col-span-5' : 'w-full'" class="flex flex-col gap-3 sm:gap-4">
              <h3 class="font-title-md font-bold text-on-surface text-sm sm:text-base flex items-center gap-2">
                <span class="material-symbols-outlined text-primary">star</span>
                <span>Vouched Kitchens</span>
              </h3>

              <!-- Loading State -->
              <div v-if="isLoadingKitchens" class="p-6 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/20">
                <div class="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-1.5"></div>
                <span class="text-xs text-on-surface-variant">Loading kitchens...</span>
              </div>

              <!-- Dynamic Kitchens List -->
              <div v-else-if="vouchedKitchens.length > 0" class="flex flex-col gap-2.5">
                <div
                  v-for="kitchen in vouchedKitchens"
                  :key="kitchen._id || kitchen.id"
                  @click="navigateTo('vendor_profile', { vendorId: kitchen._id || kitchen.id, vendor: kitchen })"
                  class="bg-surface-container-lowest rounded-xl p-3 sm:p-3.5 shadow-sm border border-outline-variant/20 flex items-center justify-between cursor-pointer hover:border-primary/40 transition-colors"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                      <img
                        v-if="kitchen.user?.avatar || kitchen.coverImage"
                        :src="kitchen.user?.avatar || kitchen.coverImage"
                        alt="Kitchen logo"
                        class="w-full h-full object-cover"
                        @error="$event.target.style.display = 'none'"
                      />
                      <span v-else>
                        {{ (kitchen.businessName || kitchen.user?.name || 'K').slice(0, 2).toUpperCase() }}
                      </span>
                    </div>
                    <div>
                      <h4 class="font-label-md font-bold text-on-surface text-xs">{{ kitchen.businessName || `${kitchen.user?.name || 'Home'}'s Kitchen` }}</h4>
                      <span class="text-[10px] sm:text-[11px] text-on-surface-variant">
                        {{ kitchen.category || 'Home Kitchen' }} • 
                        <template v-if="kitchen.totalReviews && kitchen.totalReviews > 0">
                          {{ kitchen.rating ? kitchen.rating.toFixed(1) : '5.0' }} ★ ({{ kitchen.totalReviews }})
                        </template>
                        <template v-else-if="kitchen.rating">
                          {{ Number(kitchen.rating).toFixed(1) }} ★
                        </template>
                        <template v-else>
                          New Kitchen
                        </template>
                      </span>
                    </div>
                  </div>
                  <span class="material-symbols-outlined text-primary text-[18px]">chevron_right</span>
                </div>
              </div>

              <!-- Empty State if no kitchens yet -->
              <div v-else class="p-6 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/20 flex flex-col items-center gap-1.5">
                <span class="material-symbols-outlined text-2xl text-on-surface-variant">storefront</span>
                <p class="text-xs font-semibold text-on-surface">No Vouched Kitchens Yet</p>
                <p class="text-[11px] text-on-surface-variant">Explore the food radar to discover and vouch for neighborhood home cooks.</p>
              </div>

              <!-- Logout Button (Only for profile owner) -->
              <button
                v-if="isOwner"
                @click="handleLogout"
                class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-outline-variant text-red-600 font-label-md text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer mt-1"
              >
                <span class="material-symbols-outlined text-[16px]">logout</span>
                <span>Log Out</span>
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>

    <!-- Mobile Bottom Navigation Bar -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 z-40 flex items-center justify-around px-2 shadow-lg">
      <button
        @click="navigateTo('food_radar')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">explore</span>
        <span class="text-[10px] font-semibold mt-0.5">Radar</span>
      </button>
      <button
        @click="navigateTo('resident_orders')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">receipt_long</span>
        <span class="text-[10px] font-semibold mt-0.5">Orders</span>
      </button>
      <button
        @click="navigateTo('resident_profile')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">person</span>
        <span class="text-[10px] font-bold mt-0.5">Profile</span>
      </button>
    </nav>
  </div>
</template>
