<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '../services/api.js'
import AppHeader from '../components/AppHeader.vue'

const props = defineProps({
  user: Object,
  currentRole: String,
})

const emit = defineEmits(['navigate', 'action'])

const activeTab = ref('overview') // 'overview' | 'users' | 'vendors' | 'foods' | 'orders'
const isLoading = ref(true)
const stats = ref({
  totalUsers: 0,
  totalResidents: 0,
  totalVendors: 0,
  totalDeliveryPartners: 0,
  totalOrders: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  activeFoodListings: 0,
  marketplaceListings: 0,
  activeSubscriptions: 0,
})

const usersList = ref([])
const vendorsList = ref([])
const foodsList = ref([])
const ordersList = ref([])
const orderFilterStatus = ref('all')
const vendorFilterStatus = ref('all')
const userSearchQuery = ref('')

async function fetchStats() {
  try {
    const res = await adminApi.getStats()
    if (res?.stats) {
      stats.value = res.stats
    }
  } catch (err) {
    console.warn('[Admin] Failed to load stats:', err.message)
  }
}

async function fetchUsers() {
  try {
    const res = await adminApi.getUsers({ search: userSearchQuery.value })
    usersList.value = res?.users || res?.data || []
  } catch (err) {
    console.warn('[Admin] Failed to load users:', err.message)
  }
}

async function fetchVendors() {
  try {
    const res = await adminApi.getVendors({ verificationStatus: vendorFilterStatus.value })
    vendorsList.value = res?.vendors || res?.data || []
  } catch (err) {
    console.warn('[Admin] Failed to load vendors:', err.message)
  }
}

async function fetchFoods() {
  try {
    const res = await adminApi.getFoods()
    foodsList.value = res?.foods || res?.data || []
  } catch (err) {
    console.warn('[Admin] Failed to load foods:', err.message)
  }
}

async function fetchOrders() {
  try {
    const res = await adminApi.getOrders({ status: orderFilterStatus.value })
    ordersList.value = res?.orders || res?.data || []
  } catch (err) {
    console.warn('[Admin] Failed to load orders:', err.message)
  }
}

async function toggleUserStatus(u) {
  try {
    const newStatus = !u.isActive
    await adminApi.updateUserStatus(u._id, newStatus)
    u.isActive = newStatus
    emit('action', { action: 'toast', payload: { message: `User account ${newStatus ? 'activated' : 'deactivated'}` } })
  } catch (err) {
    emit('action', { action: 'toast', payload: { message: err.message || 'Failed to update user' } })
  }
}

async function verifyVendor(v, newStatus) {
  try {
    await adminApi.verifyVendor(v._id, newStatus)
    v.verificationStatus = newStatus
    emit('action', { action: 'toast', payload: { message: `Vendor verification set to ${newStatus}` } })
    fetchStats()
  } catch (err) {
    emit('action', { action: 'toast', payload: { message: err.message || 'Failed to update verification' } })
  }
}

async function toggleFoodAvailability(f) {
  try {
    const newAvail = !f.available
    await adminApi.moderateFood(f._id, { available: newAvail })
    f.available = newAvail
    emit('action', { action: 'toast', payload: { message: `Listing marked ${newAvail ? 'Available' : 'Unavailable'}` } })
  } catch (err) {
    emit('action', { action: 'toast', payload: { message: err.message || 'Failed to moderate listing' } })
  }
}

async function removeFoodListing(f) {
  if (!confirm(`Are you sure you want to remove "${f.name}" for content moderation?`)) return
  try {
    await adminApi.moderateFood(f._id, { deleteFood: true })
    foodsList.value = foodsList.value.filter((item) => item._id !== f._id)
    emit('action', { action: 'toast', payload: { message: 'Inappropriate listing removed' } })
    fetchStats()
  } catch (err) {
    emit('action', { action: 'toast', payload: { message: err.message || 'Failed to remove listing' } })
  }
}

async function loadAll() {
  isLoading.value = true
  await Promise.all([fetchStats(), fetchUsers(), fetchVendors(), fetchFoods(), fetchOrders()])
  isLoading.value = false
}

onMounted(() => {
  loadAll()
})
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col text-on-surface">
    <!-- Header -->
    <header class="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 px-4 lg:px-8 py-3.5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
          <span class="material-symbols-outlined text-24">shield_person</span>
        </div>
        <div>
          <h1 class="text-base lg:text-lg font-bold tracking-tight">Admin & Moderation Center</h1>
          <p class="text-xs text-on-surface-variant font-medium">FoodMap Hyperlocal Ecosystem Administration</p>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          @click="emit('navigate', 'food_radar')"
          class="px-3.5 py-1.5 rounded-xl border border-outline-variant/40 bg-surface hover:bg-surface-container text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">radar</span>
          <span>View Discovery Radar</span>
        </button>
        <button
          @click="emit('action', 'logout')"
          class="px-3 py-1.5 rounded-xl bg-error/10 hover:bg-error/20 text-error text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </header>

    <!-- Main Container -->
    <div class="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
      <!-- Tabs Navigation -->
      <div class="flex items-center gap-2 border-b border-outline-variant/20 pb-2 overflow-x-auto no-scrollbar">
        <button
          v-for="tab in [
            { id: 'overview', label: 'Ecosystem Overview', icon: 'dashboard' },
            { id: 'vendors', label: 'Vendor Verification', icon: 'verified' },
            { id: 'users', label: 'User Directory', icon: 'group' },
            { id: 'foods', label: 'Food Moderation', icon: 'restaurant' },
            { id: 'orders', label: 'Live Orders Monitor', icon: 'receipt_long' },
          ]"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap',
            activeTab === tab.id
              ? 'bg-primary text-on-primary shadow-sm'
              : 'bg-surface hover:bg-surface-container text-on-surface-variant'
          ]"
        >
          <span class="material-symbols-outlined text-[18px]">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <!-- Tab 1: Overview -->
      <section v-if="activeTab === 'overview'" class="space-y-6 animate-in">
        <!-- Top KPI Cards Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-4 rounded-2xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between text-on-surface-variant mb-2">
              <span class="text-xs font-semibold">Total Users</span>
              <span class="material-symbols-outlined text-[20px] text-primary">groups</span>
            </div>
            <div>
              <div class="text-2xl font-black text-on-surface">{{ stats.totalUsers }}</div>
              <div class="text-[11px] text-on-surface-variant mt-0.5">
                {{ stats.totalResidents }} Residents • {{ stats.totalDeliveryPartners }} Couriers
              </div>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between text-on-surface-variant mb-2">
              <span class="text-xs font-semibold">Home Chefs / Kitchens</span>
              <span class="material-symbols-outlined text-[20px] text-green-600">storefront</span>
            </div>
            <div>
              <div class="text-2xl font-black text-on-surface">{{ stats.totalVendors }}</div>
              <div class="text-[11px] text-green-600 font-semibold mt-0.5">
                Hyperlocal food creators
              </div>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between text-on-surface-variant mb-2">
              <span class="text-xs font-semibold">Dishes & Marketplace</span>
              <span class="material-symbols-outlined text-[20px] text-amber-500">lunch_dining</span>
            </div>
            <div>
              <div class="text-2xl font-black text-on-surface">{{ stats.activeFoodListings }}</div>
              <div class="text-[11px] text-on-surface-variant mt-0.5">
                {{ stats.marketplaceListings }} packaged pantry goods
              </div>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between">
            <div class="flex items-center justify-between text-on-surface-variant mb-2">
              <span class="text-xs font-semibold">Active Subscriptions</span>
              <span class="material-symbols-outlined text-[20px] text-primary">event_repeat</span>
            </div>
            <div>
              <div class="text-2xl font-black text-on-surface">{{ stats.activeSubscriptions }}</div>
              <div class="text-[11px] text-on-surface-variant font-semibold mt-0.5">
                Recurring daily tiffin plans
              </div>
            </div>
          </div>
        </div>

        <!-- Orders Summary Card -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-5 rounded-2xl bg-surface border border-outline-variant/30 shadow-sm space-y-3">
            <div class="flex items-center gap-2 text-primary font-bold text-sm">
              <span class="material-symbols-outlined text-[20px]">shopping_bag</span>
              <span>Orders Lifecycle</span>
            </div>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between py-1 border-b border-outline-variant/10">
                <span class="text-on-surface-variant">Total Placed:</span>
                <span class="font-bold">{{ stats.totalOrders }}</span>
              </div>
              <div class="flex justify-between py-1 border-b border-outline-variant/10">
                <span class="text-green-600 font-semibold">Delivered / Completed:</span>
                <span class="font-bold text-green-600">{{ stats.completedOrders }}</span>
              </div>
              <div class="flex justify-between py-1">
                <span class="text-red-500 font-semibold">Cancelled / Rejected:</span>
                <span class="font-bold text-red-500">{{ stats.cancelledOrders }}</span>
              </div>
            </div>
          </div>

          <div class="p-5 rounded-2xl bg-surface border border-outline-variant/30 shadow-sm space-y-3">
            <div class="flex items-center gap-2 text-green-700 font-bold text-sm">
              <span class="material-symbols-outlined text-[20px]">eco</span>
              <span>Food Waste Reduction</span>
            </div>
            <p class="text-xs text-on-surface-variant">
              Surplus rescue listings allow home cooks to discount remaining daily portions with guaranteed priority allocation, preventing prepared meal waste.
            </p>
            <div class="p-2.5 rounded-xl bg-green-50 border border-green-200 text-[11px] text-green-800 font-medium">
              🌱 Zero-waste policy active across verified home chefs
            </div>
          </div>

          <div class="p-5 rounded-2xl bg-surface border border-outline-variant/30 shadow-sm space-y-3">
            <div class="flex items-center gap-2 text-blue-600 font-bold text-sm">
              <span class="material-symbols-outlined text-[20px]">moped</span>
              <span>Courier Network</span>
            </div>
            <p class="text-xs text-on-surface-variant">
              Hyperlocal delivery partner network provides real-time GPS tracking with throttled socket events to maintain low resource overhead.
            </p>
            <button
              @click="activeTab = 'orders'"
              class="w-full py-2 rounded-xl bg-surface-container text-xs font-bold text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              Monitor Deliveries →
            </button>
          </div>
        </div>
      </section>

      <!-- Tab 2: Vendor Verification -->
      <section v-if="activeTab === 'vendors'" class="space-y-4 animate-in">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 class="text-sm font-bold">Home Chef / Kitchen Verification</h2>
            <p class="text-xs text-on-surface-variant">Review and verify kitchen profiles, hygiene compliance, and specialties</p>
          </div>

          <div class="flex items-center gap-2">
            <select
              v-model="vendorFilterStatus"
              @change="fetchVendors"
              class="px-3 py-1.5 rounded-xl bg-surface border border-outline-variant/40 text-xs font-semibold focus:outline-none"
            >
              <option value="all">All Verification Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <button
              @click="fetchVendors"
              class="p-2 rounded-xl bg-surface border border-outline-variant/40 hover:bg-surface-container transition-colors cursor-pointer"
              title="Refresh"
            >
              <span class="material-symbols-outlined text-[16px]">refresh</span>
            </button>
          </div>
        </div>

        <div class="bg-surface rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-surface-container-high/60 border-b border-outline-variant/20 text-on-surface-variant font-bold">
                <tr>
                  <th class="p-3.5">Kitchen / Chef</th>
                  <th class="p-3.5">Category</th>
                  <th class="p-3.5">Rating & Reviews</th>
                  <th class="p-3.5">Status</th>
                  <th class="p-3.5">Verification</th>
                  <th class="p-3.5 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/10 font-medium">
                <tr v-for="v in vendorsList" :key="v._id" class="hover:bg-surface-container/50 transition-colors">
                  <td class="p-3.5">
                    <div class="font-bold text-on-surface">{{ v.businessName }}</div>
                    <div class="text-[11px] text-on-surface-variant">{{ v.user?.name || 'Chef' }} • {{ v.user?.phone }}</div>
                  </td>
                  <td class="p-3.5">{{ v.category || 'Home Kitchen' }}</td>
                  <td class="p-3.5">
                    <span class="inline-flex items-center gap-1 font-bold text-amber-600">
                      ★ {{ v.rating || 0 }}
                    </span>
                    <span class="text-on-surface-variant text-[11px]">({{ v.totalReviews || 0 }})</span>
                  </td>
                  <td class="p-3.5">
                    <span :class="v.status === 'ONLINE' ? 'text-green-600 font-bold' : 'text-gray-500 font-medium'">
                      ● {{ v.status }}
                    </span>
                  </td>
                  <td class="p-3.5">
                    <span
                      :class="[
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        v.verificationStatus === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                        v.verificationStatus === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      ]"
                    >
                      {{ v.verificationStatus || 'PENDING' }}
                    </span>
                  </td>
                  <td class="p-3.5 text-right space-x-2">
                    <button
                      v-if="v.verificationStatus !== 'VERIFIED'"
                      @click="verifyVendor(v, 'VERIFIED')"
                      class="px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-[11px] shadow-sm transition-colors cursor-pointer"
                    >
                      Approve & Verify
                    </button>
                    <button
                      v-if="v.verificationStatus !== 'REJECTED'"
                      @click="verifyVendor(v, 'REJECTED')"
                      class="px-2.5 py-1 rounded-lg bg-error/10 hover:bg-error/20 text-error font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
                <tr v-if="vendorsList.length === 0">
                  <td colspan="6" class="p-6 text-center text-on-surface-variant text-xs">
                    No vendors matching filter.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Tab 3: Users Directory -->
      <section v-if="activeTab === 'users'" class="space-y-4 animate-in">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 class="text-sm font-bold">User Directory</h2>
            <p class="text-xs text-on-surface-variant">Manage platform participants across resident, vendor, courier, and admin roles</p>
          </div>

          <div class="flex items-center gap-2">
            <input
              v-model="userSearchQuery"
              @keyup.enter="fetchUsers"
              type="text"
              placeholder="Search by name or phone..."
              class="px-3 py-1.5 rounded-xl bg-surface border border-outline-variant/40 text-xs focus:outline-none w-56"
            />
            <button
              @click="fetchUsers"
              class="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold cursor-pointer"
            >
              Search
            </button>
          </div>
        </div>

        <div class="bg-surface rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-surface-container-high/60 border-b border-outline-variant/20 text-on-surface-variant font-bold">
                <tr>
                  <th class="p-3.5">Name</th>
                  <th class="p-3.5">Phone</th>
                  <th class="p-3.5">Role</th>
                  <th class="p-3.5">Allergies</th>
                  <th class="p-3.5">Status</th>
                  <th class="p-3.5 text-right">Account Control</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/10 font-medium">
                <tr v-for="u in usersList" :key="u._id" class="hover:bg-surface-container/50 transition-colors">
                  <td class="p-3.5 font-bold text-on-surface">{{ u.name || 'Anonymous' }}</td>
                  <td class="p-3.5 font-mono text-[11px]">{{ u.phone }}</td>
                  <td class="p-3.5">
                    <span
                      :class="[
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        u.role === 'admin' ? 'bg-primary/10 text-primary border border-primary/20' :
                        u.role === 'vendor' ? 'bg-surface-container-high text-on-surface' :
                        u.role === 'delivery_partner' ? 'bg-surface-container text-on-surface' : 'bg-surface-container-low text-on-surface'
                      ]"
                    >
                      {{ u.role.replace('_', ' ') }}
                    </span>
                  </td>
                  <td class="p-3.5">
                    <span v-if="u.allergies && u.allergies.length > 0" class="text-red-500 font-bold text-[11px]">
                      {{ u.allergies.join(', ') }}
                    </span>
                    <span v-else class="text-on-surface-variant text-[11px]">None declared</span>
                  </td>
                  <td class="p-3.5">
                    <span :class="u.isActive !== false ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                      ● {{ u.isActive !== false ? 'Active' : 'Suspended' }}
                    </span>
                  </td>
                  <td class="p-3.5 text-right">
                    <button
                      @click="toggleUserStatus(u)"
                      :class="[
                        'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer',
                        u.isActive !== false ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'
                      ]"
                    >
                      {{ u.isActive !== false ? 'Deactivate' : 'Activate' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <!-- Tab 4: Food Listings Moderation -->
      <section v-if="activeTab === 'foods'" class="space-y-4 animate-in">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 class="text-sm font-bold">Food & Marketplace Moderation</h2>
            <p class="text-xs text-on-surface-variant">Review meals, pantry products, allergens, and surplus designations</p>
          </div>

          <button
            @click="fetchFoods"
            class="px-3 py-1.5 rounded-xl bg-surface border border-outline-variant/40 hover:bg-surface-container text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span class="material-symbols-outlined text-[16px]">refresh</span>
            <span>Refresh Listings</span>
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="f in foodsList"
            :key="f._id"
            class="p-4 rounded-2xl bg-surface border border-outline-variant/30 shadow-sm flex flex-col justify-between space-y-3"
          >
            <div>
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="text-xs font-extrabold text-on-surface truncate">{{ f.name }}</div>
                  <div class="text-[11px] text-on-surface-variant font-medium">
                    by {{ f.vendor?.businessName || 'Home Cook' }}
                  </div>
                </div>
                <span
                  :class="[
                    'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0',
                    f.isMarketplace ? 'bg-surface-container text-on-surface border border-outline-variant/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  ]"
                >
                  {{ f.productType || (f.isMarketplace ? 'Marketplace' : 'Cooked Meal') }}
                </span>
              </div>

              <div class="mt-2.5 flex items-center gap-2 text-xs font-semibold">
                <span class="text-primary font-black">₹{{ f.price }}</span>
                <span class="text-on-surface-variant text-[11px]">• {{ f.quantity }} in stock</span>
                <span v-if="f.isSurplusRescue" class="text-green-700 font-bold bg-green-50 px-1.5 py-0.5 rounded text-[10px]">
                  Surplus ({{ f.surplusDiscount }}% OFF)
                </span>
              </div>

              <div v-if="f.allergens && f.allergens.length > 0" class="mt-1 text-[10px] text-amber-700 font-medium">
                ⚠️ Allergens: {{ f.allergens.join(', ') }}
              </div>
            </div>

            <div class="pt-2 border-t border-outline-variant/20 flex items-center justify-between gap-2">
              <button
                @click="toggleFoodAvailability(f)"
                :class="[
                  'px-3 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer',
                  f.available ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-green-50 text-green-700 hover:bg-green-100'
                ]"
              >
                {{ f.available ? 'Mark Unavailable' : 'Mark Available' }}
              </button>

              <button
                @click="removeFoodListing(f)"
                class="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-[11px] font-bold transition-colors cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Tab 5: Live Orders Monitor -->
      <section v-if="activeTab === 'orders'" class="space-y-4 animate-in">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 class="text-sm font-bold">Orders & Delivery Monitor</h2>
            <p class="text-xs text-on-surface-variant">Live audit log of all neighborhood orders, pickup schedules, and delivery progress</p>
          </div>

          <div class="flex items-center gap-2">
            <select
              v-model="orderFilterStatus"
              @change="fetchOrders"
              class="px-3 py-1.5 rounded-xl bg-surface border border-outline-variant/40 text-xs font-semibold focus:outline-none"
            >
              <option value="all">All Order Statuses</option>
              <option value="READY_FOR_PICKUP">Ready for Pickup</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered / Completed</option>
              <option value="CANCELLED">Problematic / Cancelled</option>
            </select>
            <button
              @click="fetchOrders"
              class="p-2 rounded-xl bg-surface border border-outline-variant/40 hover:bg-surface-container transition-colors cursor-pointer"
            >
              <span class="material-symbols-outlined text-[16px]">refresh</span>
            </button>
          </div>
        </div>

        <div class="bg-surface rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-surface-container-high/60 border-b border-outline-variant/20 text-on-surface-variant font-bold">
                <tr>
                  <th class="p-3.5">Order #</th>
                  <th class="p-3.5">Resident</th>
                  <th class="p-3.5">Kitchen</th>
                  <th class="p-3.5">Amount</th>
                  <th class="p-3.5">Fulfillment</th>
                  <th class="p-3.5">Courier</th>
                  <th class="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/10 font-medium">
                <tr v-for="o in ordersList" :key="o._id" class="hover:bg-surface-container/50 transition-colors">
                  <td class="p-3.5 font-bold font-mono text-primary">{{ o.orderNumber }}</td>
                  <td class="p-3.5">
                    <div>{{ o.residentName || o.resident?.name || 'Resident' }}</div>
                    <div class="text-[10px] text-on-surface-variant">{{ o.residentPhone || o.resident?.phone }}</div>
                  </td>
                  <td class="p-3.5 font-semibold">{{ o.vendorName || o.vendor?.businessName }}</td>
                  <td class="p-3.5 font-extrabold text-on-surface">₹{{ o.totalAmount }}</td>
                  <td class="p-3.5 uppercase text-[10.5px] font-bold text-on-surface-variant">
                    {{ o.orderType || 'PICKUP' }}
                  </td>
                  <td class="p-3.5">
                    <span v-if="o.deliveryPartnerName" class="font-bold text-blue-600 flex items-center gap-1">
                      <span class="material-symbols-outlined text-[14px]">moped</span>
                      {{ o.deliveryPartnerName }}
                    </span>
                    <span v-else class="text-on-surface-variant text-[11px]">—</span>
                  </td>
                  <td class="p-3.5">
                    <span
                      :class="[
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        ['DELIVERED', 'COMPLETED'].includes(o.status) ? 'bg-green-100 text-green-800' :
                        ['OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'].includes(o.status) ? 'bg-blue-100 text-blue-800' :
                        ['CANCELLED', 'REJECTED'].includes(o.status) ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      ]"
                    >
                      {{ o.status }}
                    </span>
                  </td>
                </tr>
                <tr v-if="ordersList.length === 0">
                  <td colspan="7" class="p-6 text-center text-on-surface-variant text-xs">
                    No orders found.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
