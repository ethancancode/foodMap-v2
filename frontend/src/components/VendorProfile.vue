<script setup>
import { ref, computed, onMounted } from 'vue'
import { foodApi, vendorApi } from '../services/api.js'
import { getCookingCountdown, currentTimestamp } from '../utils/countdown.js'

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
const isSavingDish = ref(false)
const editFileInput = ref(null)

const categories = ['Main Course', 'Snacks', 'Breakfast', 'Dessert', 'Beverages', 'Specialty']
const cookingTimes = ['Ready now', 'Ready in 15 mins', 'Ready in 30 mins', 'Ready in 45 mins', 'Pre-order tomorrow']

const editForm = ref({
  id: '',
  name: '',
  description: '',
  price: 0,
  quantity: 1,
  category: 'Main Course',
  cookingStatus: 'Ready now',
  image: '',
  customHours: '',
  customMinutes: ''
})

function openEditModal(dish) {
  const rawStatus = (dish.cookingStatus || dish.time || 'Ready now').trim()
  let matchedStatus = 'Ready now'
  let ch = ''
  let cm = ''

  if (/^(ready\s*now|now)$/i.test(rawStatus)) {
    matchedStatus = 'Ready now'
  } else if (/15\s*min/i.test(rawStatus)) {
    matchedStatus = 'Ready in 15 mins'
  } else if (/30\s*min/i.test(rawStatus)) {
    matchedStatus = 'Ready in 30 mins'
  } else if (/45\s*min/i.test(rawStatus)) {
    matchedStatus = 'Ready in 45 mins'
  } else {
    matchedStatus = 'Custom'
    const hrMatch = rawStatus.match(/(\d+)\s*(?:hr|hour|h)/i)
    const minMatch = rawStatus.match(/(\d+)\s*(?:min|m)/i)
    ch = hrMatch ? parseInt(hrMatch[1]) : ''
    cm = minMatch ? parseInt(minMatch[1]) : ''
  }

  editForm.value = {
    id: dish._id || dish.id,
    name: dish.name || '',
    description: dish.description || dish.desc || '',
    price: dish.price || 0,
    quantity: dish.quantity !== undefined ? Number(dish.quantity) : (parseInt(dish.portions) || 1),
    category: dish.category || 'Main Course',
    cookingStatus: matchedStatus,
    image: dish.image || '',
    customHours: ch,
    customMinutes: cm
  }
  isEditModalOpen.value = true
}

function closeEditModal() {
  isEditModalOpen.value = false
}

function triggerImageUpload() {
  if (editFileInput.value) {
    editFileInput.value.click()
  }
}

function handleImageChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    emit('action', { action: 'toast', payload: { message: 'Dish photo should be under 5MB' } })
    return
  }
  const reader = new FileReader()
  reader.onload = (event) => {
    editForm.value.image = event.target.result
  }
  reader.readAsDataURL(file)
}

function adjustPortion(delta) {
  editForm.value.quantity = Math.max(0, Number(editForm.value.quantity || 0) + delta)
}

async function saveDish() {
  if (!editForm.value.name?.trim()) {
    emit('action', { action: 'toast', payload: { message: 'Please provide a dish name' } })
    return
  }
  if (editForm.value.price === undefined || editForm.value.price === null || Number(editForm.value.price) < 0) {
    emit('action', { action: 'toast', payload: { message: 'Please provide a valid price' } })
    return
  }

  isSavingDish.value = true
  try {
    const qty = Number(editForm.value.quantity) || 0
    let finalStatus = editForm.value.cookingStatus
    if (finalStatus === 'Custom') {
      const h = parseInt(editForm.value.customHours) || 0
      const m = parseInt(editForm.value.customMinutes) || 0
      if (h > 0 && m > 0) finalStatus = `Ready in ${h} hr ${m} mins`
      else if (h > 0) finalStatus = `Ready in ${h} hr`
      else if (m > 0) finalStatus = `Ready in ${m} mins`
      else finalStatus = 'Ready soon'
    }

    let readyAt = null
    if (editForm.value.cookingStatus === 'Ready in 15 mins') readyAt = new Date(Date.now() + 15 * 60 * 1000)
    else if (editForm.value.cookingStatus === 'Ready in 30 mins') readyAt = new Date(Date.now() + 30 * 60 * 1000)
    else if (editForm.value.cookingStatus === 'Ready in 45 mins') readyAt = new Date(Date.now() + 45 * 60 * 1000)
    else if (editForm.value.cookingStatus === 'Custom') {
      const h = parseInt(editForm.value.customHours) || 0
      const m = parseInt(editForm.value.customMinutes) || 0
      const totalM = h * 60 + m
      if (totalM > 0) readyAt = new Date(Date.now() + totalM * 60 * 1000)
    }

    const payload = {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim(),
      price: Number(editForm.value.price),
      quantity: qty,
      category: editForm.value.category,
      cookingStatus: finalStatus,
      timeReady: finalStatus,
      readyAt: readyAt ? readyAt.toISOString() : null,
      image: editForm.value.image,
      available: qty > 0,
      isAvailable: qty > 0
    }

    await foodApi.updateFood(editForm.value.id, payload)

    // Update in local items list immediately
    const idx = items.value.findIndex((d) => d.id === editForm.value.id || d._id === editForm.value.id)
    if (idx !== -1) {
      items.value[idx] = {
        ...items.value[idx],
        ...payload,
        portions: `${qty} portions left`,
        desc: payload.description,
        time: payload.cookingStatus
      }
    }

    emit('action', {
      action: 'toast',
      payload: { message: `🎉 ${payload.name} updated successfully!` }
    })
    closeEditModal()
  } catch (err) {
    console.error('Failed to update dish:', err)
    const msg = err.response?.data?.message || err.message || 'Failed to update dish'
    emit('action', { action: 'toast', payload: { message: msg } })
  } finally {
    isSavingDish.value = false
  }
}

async function handleDeleteDish(dishId) {
  if (!confirm('Are you sure you want to remove this dish from your kitchen radar?')) return
  try {
    await foodApi.deleteFood(dishId)
    items.value = items.value.filter((d) => d.id !== dishId && d._id !== dishId)
    emit('action', { action: 'toast', payload: { message: 'Dish removed successfully' } })
    closeEditModal()
  } catch (err) {
    emit('action', { action: 'toast', payload: { message: 'Failed to delete dish' } })
  }
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
          class="w-full flex items-center px-gutter py-stack-md rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all cursor-pointer font-medium"
        >
          <span class="material-symbols-outlined mr-gutter">notifications_active</span>
          <span class="font-label-md">Incoming Orders</span>
        </button>
        <button
          @click="navigateTo('vendor_profile')"
          class="w-full flex items-center px-gutter py-stack-md rounded-lg transition-all bg-primary text-on-primary font-bold shadow-sm cursor-pointer"
        >
          <span class="material-symbols-outlined mr-gutter">storefront</span>
          <span class="font-label-md">Kitchen Profile</span>
        </button>
      </nav>

      <div class="px-base py-stack-lg border-t border-outline-variant/20 space-y-stack-sm">
        <div
          class="w-full flex items-center gap-gutter px-gutter py-stack-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-left"
        >
          <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {{ (vendorProfile?.businessName || props.user?.vendor?.businessName || props.user?.name || 'P').charAt(0).toUpperCase() }}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-label-md text-on-surface leading-normal text-xs font-bold truncate">{{ vendorProfile?.businessName || props.user?.vendor?.businessName || props.user?.name || "Priya Kitchen" }}</span>
          </div>
        </div>

        <button
          @click="navigateTo('edit_vendor_profile')"
          class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-xs font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">edit</span>
          <span>Edit Kitchen Info</span>
        </button>
        <button
          @click="handleLogout"
          class="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs font-medium transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[16px]">logout</span>
          <span>Sign Out</span>
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
        <button
          @click="navigateTo('edit_vendor_profile')"
          class="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
        >
          Edit Profile
        </button>
      </header>

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
              <div
                v-for="item in items"
                :key="item.id"
                @click="openEditModal(item)"
                class="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/20 shadow-sm flex flex-col group hover:shadow-md hover:border-primary/40 transition-all cursor-pointer"
              >
                <div class="relative h-44 w-full bg-surface-variant overflow-hidden">
                  <img :src="item.image" :alt="item.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div class="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
                    <span :class="item.quantity > 0 ? 'bg-green-400' : 'bg-red-400'" class="w-1.5 h-1.5 rounded-full"></span>
                    <span>{{ item.quantity > 0 ? `${item.quantity} portions left` : 'Sold Out' }}</span>
                  </div>
                  <div class="absolute bottom-3 left-3 bg-surface/95 backdrop-blur-md text-on-surface px-3 py-1 rounded-full shadow font-bold text-sm">
                    ₹{{ item.price }}
                  </div>
                  <div class="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center group-hover:bg-primary transition-colors" title="Click to edit">
                    <span class="material-symbols-outlined text-[17px]">edit</span>
                  </div>
                </div>

                <div class="p-4 flex flex-col gap-2 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <h3 class="font-title-md font-bold text-on-surface group-hover:text-primary transition-colors text-base line-clamp-1">{{ item.name }}</h3>
                    <span class="text-[11px] text-on-surface-variant px-2 py-0.5 rounded-md bg-surface-container font-medium shrink-0">{{ item.category || 'Main Course' }}</span>
                  </div>
                  <p class="font-body-md text-xs text-on-surface-variant line-clamp-2">{{ item.desc }}</p>
                  
                  <div class="mt-auto pt-3 flex items-center justify-between border-t border-outline-variant/10">
                    <span class="text-xs font-semibold flex items-center gap-1" :class="countdown(item).isReady ? 'text-green-600' : 'text-amber-700 font-mono'">
                      <span class="material-symbols-outlined text-[16px]" :class="countdown(item).isReady ? '' : 'animate-pulse'">schedule</span>
                      {{ countdown(item).text }}
                    </span>
                    <button
                      @click.stop="openEditModal(item)"
                      class="flex items-center gap-1.5 bg-primary/10 hover:bg-primary hover:text-on-primary text-primary font-label-md text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer"
                    >
                      <span class="material-symbols-outlined text-[15px]">edit</span>
                      <span>Edit Dish</span>
                    </button>
                  </div>
                </div>
              </div>
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

    <!-- Edit Dish Modal -->
    <div
      v-if="isEditModalOpen"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      @click.self="closeEditModal"
    >
      <div
        class="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col p-5 sm:p-6 gap-5 my-auto"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-3 border-b border-outline-variant/20">
          <div class="flex flex-col">
            <h3 class="text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-[22px]">edit_note</span>
              <span>Edit Dish Details</span>
            </h3>
            <span class="text-xs text-on-surface-variant">Update photo, portions, pricing & recipe info</span>
          </div>
          <button
            @click="closeEditModal"
            class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Dish Image Preview & Upload -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Dish Photo</label>
          <div class="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-surface-variant border border-outline-variant/30 group">
            <img
              v-if="editForm.image"
              :src="editForm.image"
              :alt="editForm.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex flex-col items-center justify-center text-on-surface-variant">
              <span class="material-symbols-outlined text-[36px] mb-1">restaurant</span>
              <span class="text-xs">No photo available</span>
            </div>

            <!-- Upload overlay button -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                @click="triggerImageUpload"
                class="px-3.5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span class="material-symbols-outlined text-[16px]">photo_camera</span>
                <span>Change Photo</span>
              </button>
              <button
                v-if="editForm.image"
                type="button"
                @click="editForm.image = ''"
                class="px-3 py-2 rounded-xl bg-red-600/90 text-white text-xs font-bold shadow-md hover:bg-red-600 transition-all flex items-center gap-1 cursor-pointer"
                title="Remove photo"
              >
                <span class="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          </div>
          <input
            ref="editFileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleImageChange"
          />
          <div class="flex items-center justify-between">
            <button
              type="button"
              @click="triggerImageUpload"
              class="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span class="material-symbols-outlined text-[15px]">upload</span>
              <span>Upload new photo from device</span>
            </button>
            <span class="text-[11px] text-on-surface-variant">JPG, PNG up to 5MB</span>
          </div>
        </div>

        <!-- Dish Name -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Dish Name</label>
          <input
            v-model="editForm.name"
            type="text"
            placeholder="e.g. Homemade Dal Pakwan"
            class="w-full px-3.5 py-2.5 bg-surface border border-outline-variant/40 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary transition-colors text-on-surface"
          />
        </div>

        <!-- Price & Portions Grid -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Price -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Price (₹)</label>
            <div class="relative flex items-center">
              <span class="absolute left-3.5 text-sm font-bold text-on-surface-variant">₹</span>
              <input
                v-model.number="editForm.price"
                type="number"
                min="0"
                step="5"
                placeholder="120"
                class="w-full pl-8 pr-3 py-2 bg-surface border border-outline-variant/40 rounded-xl text-sm font-bold focus:outline-none focus:border-primary transition-colors text-on-surface"
              />
            </div>
          </div>

          <!-- Portions Stepper -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Live Portions</label>
            <div class="flex items-center justify-between p-1 bg-surface border border-outline-variant/40 rounded-xl h-[38px]">
              <button
                type="button"
                @click="adjustPortion(-1)"
                :disabled="editForm.quantity <= 0"
                class="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center font-bold text-sm disabled:opacity-30 cursor-pointer"
              >
                -
              </button>
              <input
                v-model.number="editForm.quantity"
                type="number"
                min="0"
                class="w-12 text-center text-sm font-black text-primary bg-transparent focus:outline-none"
              />
              <button
                type="button"
                @click="adjustPortion(1)"
                class="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <!-- Category & Cooking Time -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Category -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Category</label>
            <select
              v-model="editForm.category"
              class="w-full px-3 py-2 bg-surface border border-outline-variant/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary transition-colors text-on-surface cursor-pointer"
            >
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>

          <!-- Cooking Status / Time -->
          <div class="space-y-1.5">
            <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Serving Status</label>
            <select
              v-model="editForm.cookingStatus"
              class="w-full px-3 py-2 bg-surface border border-outline-variant/40 rounded-xl text-xs font-semibold focus:outline-none focus:border-primary transition-colors text-on-surface cursor-pointer"
            >
              <option value="Ready now">Now (Ready now)</option>
              <option value="Ready in 15 mins">15 mins (Ready in 15 mins)</option>
              <option value="Ready in 30 mins">30 mins (Ready in 30 mins)</option>
              <option value="Ready in 45 mins">45 mins (Ready in 45 mins)</option>
              <option value="Custom">Custom...</option>
            </select>

            <!-- Custom Hours & Mins Input (shown when Custom is selected in dropdown) -->
            <div v-if="editForm.cookingStatus === 'Custom'" class="flex items-center gap-2 p-2 bg-surface-container rounded-xl border border-outline-variant/30 mt-1.5">
              <span class="text-xs font-bold text-on-surface-variant flex items-center gap-1 shrink-0">
                <span class="material-symbols-outlined text-[15px] text-primary">timer</span>
                <span class="text-[11px]">Set:</span>
              </span>
              <div class="flex items-center gap-1 bg-surface border border-outline-variant/40 rounded-lg px-2 py-1 flex-1 focus-within:border-primary">
                <input
                  v-model.number="editForm.customHours"
                  type="number"
                  min="0"
                  max="24"
                  placeholder="Hours"
                  class="w-full bg-transparent text-center font-bold text-xs text-on-surface focus:outline-none"
                />
                <span class="text-[10px] font-bold text-on-surface-variant">hr</span>
              </div>
              <span class="text-xs font-bold text-on-surface-variant">:</span>
              <div class="flex items-center gap-1 bg-surface border border-outline-variant/40 rounded-lg px-2 py-1 flex-1 focus-within:border-primary">
                <input
                  v-model.number="editForm.customMinutes"
                  type="number"
                  min="0"
                  max="59"
                  placeholder="Mins"
                  class="w-full bg-transparent text-center font-bold text-xs text-on-surface focus:outline-none"
                />
                <span class="text-[10px] font-bold text-on-surface-variant">min</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Description & Ingredients</label>
          <textarea
            v-model="editForm.description"
            rows="3"
            placeholder="Describe the flavors, spices, or special preparation..."
            class="w-full p-3 bg-surface border border-outline-variant/40 rounded-xl text-xs font-medium focus:outline-none focus:border-primary transition-colors text-on-surface resize-none"
          ></textarea>
        </div>

        <!-- Modal Actions -->
        <div class="flex items-center justify-between pt-3 border-t border-outline-variant/20 gap-3">
          <button
            type="button"
            @click="handleDeleteDish(editForm.id)"
            class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-600/10 text-xs font-bold transition-colors cursor-pointer"
          >
            <span class="material-symbols-outlined text-[17px]">delete</span>
            <span>Delete Dish</span>
          </button>

          <div class="flex items-center gap-2">
            <button
              type="button"
              @click="closeEditModal"
              class="px-4 py-2 rounded-xl border border-outline-variant/40 text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="isSavingDish"
              @click="saveDish"
              class="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span v-if="isSavingDish" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span v-else class="material-symbols-outlined text-[16px]">save</span>
              <span>{{ isSavingDish ? 'Saving...' : 'Save Changes' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
