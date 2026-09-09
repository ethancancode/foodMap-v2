<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { foodApi, vendorApi } from '../services/api.js'
import LocationPickerModal from '../components/LocationPickerModal.vue'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

const DRAFT_KEY = 'foodmap_post_food_draft'

const props = defineProps({
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const vendorProfile = ref(null)

// Reactive Form State (restored from draft if present)
const itemName = ref('')
const itemPrice = ref('')
const itemQty = ref(6)
const readyTime = ref('Now')
const customHours = ref('')
const customMinutes = ref('')
const itemCategory = ref('Main Course')
const isVeg = ref(true)
const itemDesc = ref('')
const itemImage = ref('')
const isPosting = ref(false)
const foodFileInput = ref(null)
const isMapModalOpen = ref(false)

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const draft = JSON.parse(raw)
    if (draft.itemName !== undefined) itemName.value = draft.itemName
    if (draft.itemPrice !== undefined) itemPrice.value = draft.itemPrice
    if (draft.itemQty !== undefined) itemQty.value = draft.itemQty
    if (draft.readyTime !== undefined) readyTime.value = draft.readyTime
    if (draft.customHours !== undefined) customHours.value = draft.customHours
    if (draft.customMinutes !== undefined) customMinutes.value = draft.customMinutes
    if (draft.itemCategory !== undefined) itemCategory.value = draft.itemCategory
    if (draft.isVeg !== undefined) isVeg.value = draft.isVeg
    if (draft.itemDesc !== undefined) itemDesc.value = draft.itemDesc
    if (draft.itemImage !== undefined) itemImage.value = draft.itemImage
  } catch (e) {
    console.warn('Failed to restore post food draft', e)
  }
}

function saveDraft() {
  try {
    const draft = {
      itemName: itemName.value,
      itemPrice: itemPrice.value,
      itemQty: itemQty.value,
      readyTime: readyTime.value,
      customHours: customHours.value,
      customMinutes: customMinutes.value,
      itemCategory: itemCategory.value,
      isVeg: isVeg.value,
      itemDesc: itemDesc.value,
      itemImage: itemImage.value
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch (e) {
    console.warn('Failed to save post food draft', e)
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch (e) {}
}

// Watch all form fields and persist
watch(
  [itemName, itemPrice, itemQty, readyTime, customHours, customMinutes, itemCategory, isVeg, itemDesc, itemImage],
  () => {
    saveDraft()
  },
  { deep: true }
)

const currentPickupAddress = computed(() => {
  return (
    vendorProfile.value?.location?.pickupAddress ||
    props.user?.location?.pickupAddress ||
    'Seawoods, Navi Mumbai'
  )
})

const currentCoordinates = computed(() => {
  return (
    vendorProfile.value?.location?.coordinates ||
    props.user?.location?.coordinates ||
    [73.0188, 19.0225]
  )
})

onMounted(async () => {
  loadDraft()
  try {
    const res = await vendorApi.getMyProfile().catch(() => null)
    if (res?.vendor) {
      vendorProfile.value = res.vendor
    }
  } catch (e) {}
})

const readyTimeOptions = ['Now', '15 min', '30 min', '45 min', 'Custom']

function getEffectiveCookingStatus() {
  if (readyTime.value === 'Now') return 'Ready now'
  if (readyTime.value === '15 min') return 'Ready in 15 mins'
  if (readyTime.value === '30 min') return 'Ready in 30 mins'
  if (readyTime.value === '45 min') return 'Ready in 45 mins'
  if (readyTime.value === 'Custom') {
    const h = parseInt(customHours.value) || 0
    const m = parseInt(customMinutes.value) || 0
    if (h > 0 && m > 0) return `Ready in ${h} hr ${m} mins`
    if (h > 0) return `Ready in ${h} hr`
    if (m > 0) return `Ready in ${m} mins`
    return 'Ready soon'
  }
  return readyTime.value
}

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

function handleFoodFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    emit('action', { action: 'toast', payload: { message: 'Dish photo should be under 5MB' } })
    return
  }
  const reader = new FileReader()
  reader.onload = (event) => {
    itemImage.value = event.target.result
  }
  reader.readAsDataURL(file)
}

function removeDishPhoto() {
  itemImage.value = ''
  if (foodFileInput.value) foodFileInput.value.value = ''
}

function handleLocationConfirmed(loc) {
  if (!vendorProfile.value) {
    vendorProfile.value = {}
  }
  if (!vendorProfile.value.location) {
    vendorProfile.value.location = { type: 'Point' }
  }
  vendorProfile.value.location.coordinates = loc.coordinates
  vendorProfile.value.location.pickupAddress = loc.address
  isMapModalOpen.value = false
  emit('action', { action: 'toast', payload: { message: 'Pickup location updated' } })
}

// Custom Validation State (Replaces native browser HTML alerts)
const errors = ref({
  name: '',
  price: '',
  quantity: '',
  customTime: ''
})
const hasAttemptedSubmit = ref(false)

const hasFormErrors = computed(() => {
  return Object.values(errors.value).some((msg) => Boolean(msg))
})

const firstErrorMessage = computed(() => {
  return errors.value.name || errors.value.price || errors.value.quantity || errors.value.customTime || ''
})

function validateForm() {
  const newErrors = {
    name: '',
    price: '',
    quantity: '',
    customTime: ''
  }
  let isValid = true

  // 1. Dish Name
  const trimmedName = (itemName.value || '').trim()
  if (!trimmedName) {
    newErrors.name = 'Please enter what you are cooking.'
    isValid = false
  } else if (trimmedName.length < 3) {
    newErrors.name = 'Dish name must be at least 3 characters.'
    isValid = false
  }

  // 2. Price Per Portion
  const priceVal = itemPrice.value
  const priceNum = Number(priceVal)
  if (priceVal === '' || priceVal === null || priceVal === undefined) {
    newErrors.price = 'Please enter price per portion.'
    isValid = false
  } else if (isNaN(priceNum) || priceNum <= 0) {
    newErrors.price = 'Price must be greater than ₹0.'
    isValid = false
  } else if (priceNum > 10000) {
    newErrors.price = 'Price cannot exceed ₹10,000.'
    isValid = false
  }

  // 3. Batch Portions
  const qtyVal = itemQty.value
  const qtyNum = Number(qtyVal)
  if (qtyVal === '' || qtyVal === null || qtyVal === undefined) {
    newErrors.quantity = 'Please enter available batch portions.'
    isValid = false
  } else if (isNaN(qtyNum) || qtyNum < 1) {
    newErrors.quantity = 'Batch portions must be at least 1.'
    isValid = false
  } else if (!Number.isInteger(qtyNum)) {
    newErrors.quantity = 'Portions must be a whole number.'
    isValid = false
  } else if (qtyNum > 500) {
    newErrors.quantity = 'Portions cannot exceed 500 in one batch.'
    isValid = false
  }

  // 4. Custom Time Check
  if (readyTime.value === 'Custom') {
    const h = parseInt(customHours.value) || 0
    const m = parseInt(customMinutes.value) || 0
    if (h === 0 && m === 0) {
      newErrors.customTime = 'Please specify estimated hours or minutes for serving time.'
      isValid = false
    }
  }

  errors.value = newErrors
  return isValid
}

function clearError(field) {
  if (errors.value[field]) {
    errors.value[field] = ''
  }
  if (hasAttemptedSubmit.value) {
    validateForm()
  }
}

async function handlePost() {
  hasAttemptedSubmit.value = true
  if (!validateForm()) {
    emit('action', {
      action: 'toast',
      payload: { message: firstErrorMessage.value || 'Please fill in all required fields correctly' }
    })
    return
  }

  isPosting.value = true
  try {
    const coords = currentCoordinates.value
    const address = currentPickupAddress.value

    let readyAt = null
    const effectiveStatus = getEffectiveCookingStatus()
    if (readyTime.value === '15 min') readyAt = new Date(Date.now() + 15 * 60 * 1000)
    else if (readyTime.value === '30 min') readyAt = new Date(Date.now() + 30 * 60 * 1000)
    else if (readyTime.value === '45 min') readyAt = new Date(Date.now() + 45 * 60 * 1000)
    else if (readyTime.value === 'Custom') {
      const h = parseInt(customHours.value) || 0
      const m = parseInt(customMinutes.value) || 0
      const totalM = h * 60 + m
      if (totalM > 0) readyAt = new Date(Date.now() + totalM * 60 * 1000)
    }

    const payload = {
      name: itemName.value,
      description: itemDesc.value,
      price: Number(itemPrice.value),
      quantity: Number(itemQty.value),
      initialQuantity: Number(itemQty.value),
      available: true,
      isAvailable: true,
      isVeg: Boolean(isVeg.value),
      diet: isVeg.value ? 'veg' : 'non-veg',
      cookingStatus: effectiveStatus,
      timeReady: effectiveStatus,
      readyAt: readyAt ? readyAt.toISOString() : null,
      category: itemCategory.value,
      image: itemImage.value,
      vendorName: vendorProfile.value?.businessName || props.user?.name || "My Kitchen",
      vendorLocation: {
        type: 'Point',
        coordinates: coords,
        pickupAddress: address,
      }
    }

    const res = await foodApi.createFood(payload)
    isPosting.value = false

    const createdFood = res?.food || res?.data || res
    if (createdFood && (createdFood._id || createdFood.id || createdFood.name)) {
      clearDraft()
      createdFood.available = true
      createdFood.isAvailable = true
      emit('action', {
        action: 'toast',
        payload: { message: `🎉 ${createdFood.name} is now live on the neighborhood radar!` }
      })
      emit('navigate', 'you_are_live', {
        food: {
          ...createdFood,
          pickupAddress: address,
          vendorLocation: {
            type: 'Point',
            coordinates: coords,
            pickupAddress: address,
          }
        }
      })
    } else {
      throw new Error('Could not verify food creation')
    }
  } catch (err) {
    isPosting.value = false
    const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to publish food to radar'
    emit('action', {
      action: 'toast',
      payload: { message: msg }
    })
  }
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface pb-20 lg:pb-0">
    <!-- Unified Vendor Sidebar -->
    <AppSidebar
      :is-open="false"
      role="vendor"
      active-route="post_new_food"
      :user="props.user"
      :vendor-profile="vendorProfile"
      @navigate="navigateTo"
      @logout="navigateTo('welcome')"
    />

    <!-- Content Area -->
    <div class="pl-0 lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        :show-back="true"
        back-label="Kitchen"
        back-route="vendor_dashboard"
        :show-sync-badge="false"
        @toggle-sidebar="isMobileSidebarOpen = true"
        @navigate="navigateTo"
      >
        <template #actions>
          <div class="flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full">
            <span class="material-symbols-outlined text-[15px]">broadcast_on_home</span>
            <span>Live Radar</span>
          </div>
        </template>
      </AppHeader>

      <main class="relative pt-16 lg:pt-20 min-h-screen bg-background">
        <div class="flex flex-col w-full h-full max-w-2xl mx-auto px-4 sm:px-container-margin py-4 sm:py-6 pb-section-gap">
          
          <!-- Dish Photo Upload / Preview -->
          <div
            @click="foodFileInput?.click()"
            class="relative w-full aspect-video md:aspect-[21/9] bg-surface-container rounded-2xl overflow-hidden mb-4 sm:mb-6 cursor-pointer group shadow-sm border border-outline-variant/30 hover:border-primary/60 transition-all flex items-center justify-center"
          >
            <!-- When image is uploaded -->
            <template v-if="itemImage">
              <img
                :src="itemImage"
                alt="Dish preview"
                class="absolute inset-0 w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end justify-between p-3.5 sm:p-4 z-10">
                <div class="flex flex-col">
                  <span class="text-white font-bold text-sm">Dish Preview Image</span>
                  <span class="text-white/80 text-xs">Tap to change photo</span>
                </div>
                <button
                  type="button"
                  @click.stop="removeDishPhoto"
                  class="bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 backdrop-blur-md transition-colors flex items-center justify-center cursor-pointer"
                  title="Remove photo"
                >
                  <span class="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </template>

            <!-- When no image is uploaded yet -->
            <template v-else>
              <div class="flex flex-col items-center justify-center text-center p-6 gap-2">
                <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span class="material-symbols-outlined text-2xl">add_a_photo</span>
                </div>
                <div>
                  <span class="text-xs sm:text-sm font-bold text-on-surface block">Upload Dish Photo</span>
                  <span class="text-[11px] text-on-surface-variant block mt-0.5">
                    Tap to upload a photo fresh from the stove or gallery
                  </span>
                </div>
                <span class="text-[11px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full mt-1">
                  Choose Photo
                </span>
              </div>
            </template>

            <input
              ref="foodFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleFoodFileChange"
            />
          </div>

          <!-- Listing Form -->
          <form novalidate @submit.prevent="handlePost" class="space-y-4 sm:space-y-5 flex-1 flex flex-col">
            <!-- Validation Summary Alert -->
            <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0">
              <div
                v-if="hasFormErrors && hasAttemptedSubmit"
                class="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-800 text-xs shadow-sm"
              >
                <span class="material-symbols-outlined text-[18px] text-red-600 shrink-0 mt-0.5">error</span>
                <div class="flex flex-col">
                  <span class="font-bold">Please check the required fields:</span>
                  <span class="text-[11px] text-red-700 mt-0.5">{{ firstErrorMessage }}</span>
                </div>
              </div>
            </transition>

            <div class="space-y-3.5 sm:space-y-4">
              <div class="flex flex-col">
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs font-bold text-on-surface uppercase tracking-wider" for="item-name">
                    What are you cooking? <span class="text-primary">*</span>
                  </label>
                  <span v-if="itemName" class="text-[11px] text-on-surface-variant font-medium">
                    {{ itemName.length }} chars
                  </span>
                </div>
                <input
                  v-model="itemName"
                  @input="clearError('name')"
                  class="w-full bg-surface text-on-surface text-sm sm:text-base focus:outline-none rounded-xl p-3 sm:p-3.5 shadow-sm border font-bold transition-all"
                  :class="errors.name ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500/20' : 'border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20'"
                  id="item-name"
                  placeholder="e.g., Authentic Punjabi Rajma Chawal"
                  type="text"
                />
                <p v-if="errors.name" class="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-semibold">
                  <span class="material-symbols-outlined text-[15px] text-red-600">error</span>
                  <span>{{ errors.name }}</span>
                </p>
              </div>

              <div class="flex flex-col">
                <label class="text-xs font-bold text-on-surface mb-1 uppercase tracking-wider" for="item-desc">
                  Short Description
                </label>
                <textarea
                  v-model="itemDesc"
                  rows="2"
                  class="w-full bg-surface text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary rounded-xl p-3 shadow-sm border border-outline-variant/30 font-medium resize-none"
                  id="item-desc"
                  placeholder="Homestyle spices, fresh ingredients..."
                ></textarea>
              </div>

              <!-- Dietary Preference (Veg / Non-Veg) -->
              <div class="flex flex-col">
                <label class="text-xs font-bold text-on-surface mb-1.5 uppercase tracking-wider block">
                  Food Type / Dietary
                </label>
                <div class="grid grid-cols-2 gap-2.5">
                  <!-- Vegetarian Option -->
                  <button
                    type="button"
                    @click="isVeg = true"
                    :class="isVeg ? 'bg-green-500/10 border-green-600 text-green-800 ring-2 ring-green-600/20 font-bold shadow-xs' : 'bg-surface border-outline-variant/30 text-on-surface-variant hover:bg-surface-container font-medium'"
                    class="flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-xl border transition-all cursor-pointer"
                  >
                    <span class="w-4 h-4 rounded-xs border-2 border-green-600 flex items-center justify-center p-0.5 shrink-0">
                      <span class="w-2 h-2 rounded-full bg-green-600"></span>
                    </span>
                    <span class="text-xs sm:text-sm">Pure Veg</span>
                  </button>

                  <!-- Non-Vegetarian Option -->
                  <button
                    type="button"
                    @click="isVeg = false"
                    :class="!isVeg ? 'bg-red-500/10 border-red-600 text-red-800 ring-2 ring-red-600/20 font-bold shadow-xs' : 'bg-surface border-outline-variant/30 text-on-surface-variant hover:bg-surface-container font-medium'"
                    class="flex items-center justify-center gap-2.5 py-2.5 px-3 rounded-xl border transition-all cursor-pointer"
                  >
                    <span class="w-4 h-4 rounded-xs border-2 border-red-600 flex items-center justify-center p-0.5 shrink-0">
                      <span class="w-2 h-2 rounded-full bg-red-600"></span>
                    </span>
                    <span class="text-xs sm:text-sm">Non-Veg</span>
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col">
                  <label class="text-xs font-bold text-on-surface mb-1 uppercase tracking-wider" for="item-price">
                    Price Per Portion (₹) <span class="text-primary">*</span>
                  </label>
                  <div class="relative">
                    <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold" :class="errors.price ? 'text-red-500' : 'text-on-surface-variant'">₹</span>
                    <input
                      v-model.number="itemPrice"
                      @input="clearError('price')"
                      class="w-full bg-surface text-on-surface text-sm pl-8 pr-3 py-2.5 sm:py-3 focus:outline-none rounded-xl shadow-sm border font-black transition-all"
                      :class="errors.price ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500/20' : 'border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20'"
                      id="item-price"
                      type="number"
                      placeholder="0"
                    />
                  </div>
                  <p v-if="errors.price" class="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-semibold">
                    <span class="material-symbols-outlined text-[15px] text-red-600">error</span>
                    <span>{{ errors.price }}</span>
                  </p>
                </div>

                <div class="flex flex-col">
                  <label class="text-xs font-bold text-on-surface mb-1 uppercase tracking-wider" for="item-qty">
                    Batch Portions <span class="text-primary">*</span>
                  </label>
                  <div class="relative">
                    <input
                      v-model.number="itemQty"
                      @input="clearError('quantity')"
                      class="w-full bg-surface text-on-surface text-sm px-3.5 py-2.5 sm:py-3 focus:outline-none rounded-xl shadow-sm border font-black transition-all"
                      :class="errors.quantity ? 'border-red-500 focus:border-red-500 ring-2 ring-red-500/20' : 'border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20'"
                      id="item-qty"
                      type="number"
                      placeholder="6"
                    />
                  </div>
                  <p v-if="errors.quantity" class="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-semibold">
                    <span class="material-symbols-outlined text-[15px] text-red-600">error</span>
                    <span>{{ errors.quantity }}</span>
                  </p>
                </div>
              </div>
            </div>

            <!-- Serving Status Selector -->
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Serving Status</label>
              <div class="grid grid-cols-5 gap-1.5 sm:gap-2">
                <button
                  v-for="opt in readyTimeOptions"
                  :key="opt"
                  type="button"
                  @click="readyTime = opt; clearError('customTime')"
                  :class="readyTime === opt ? 'bg-primary text-on-primary font-bold shadow-md ring-2 ring-primary/20' : 'bg-surface text-on-surface border border-outline-variant hover:bg-surface-container'"
                  class="py-2 sm:py-2.5 rounded-xl text-xs transition-all cursor-pointer text-center font-medium"
                >
                  {{ opt }}
                </button>
              </div>

              <!-- Custom Time Input Box -->
              <div
                v-if="readyTime === 'Custom'"
                class="p-3 bg-surface-container-low rounded-2xl border transition-all flex flex-wrap items-center gap-2.5 mt-2"
                :class="errors.customTime ? 'border-red-500 ring-2 ring-red-500/20' : 'border-outline-variant/40'"
              >
                <span class="text-xs font-bold text-on-surface-variant flex items-center gap-1 shrink-0">
                  <span class="material-symbols-outlined text-[16px] text-primary">schedule</span>
                  <span>Set Time:</span>
                </span>
                <div class="flex items-center gap-1.5 bg-surface border border-outline-variant/40 rounded-xl px-2.5 py-1.5 focus-within:border-primary">
                  <input
                    v-model.number="customHours"
                    @input="clearError('customTime')"
                    type="number"
                    min="0"
                    max="24"
                    placeholder="Hours"
                    class="w-16 bg-transparent text-center font-bold text-xs text-on-surface focus:outline-none"
                  />
                  <span class="text-[11px] font-bold text-on-surface-variant">hr</span>
                </div>
                <span class="text-xs font-bold text-on-surface-variant">:</span>
                <div class="flex items-center gap-1.5 bg-surface border border-outline-variant/40 rounded-xl px-2.5 py-1.5 focus-within:border-primary">
                  <input
                    v-model.number="customMinutes"
                    @input="clearError('customTime')"
                    type="number"
                    min="0"
                    max="59"
                    placeholder="Mins"
                    class="w-16 bg-transparent text-center font-bold text-xs text-on-surface focus:outline-none"
                  />
                  <span class="text-[11px] font-bold text-on-surface-variant">min</span>
                </div>
                <span v-if="customHours || customMinutes" class="text-xs font-bold text-primary ml-auto truncate">
                  Ready in {{ (customHours ? customHours + ' hr ' : '') + (customMinutes ? customMinutes + ' mins' : '') }}
                </span>
              </div>
              <p v-if="errors.customTime" class="mt-1.5 text-xs text-red-600 flex items-center gap-1 font-semibold">
                <span class="material-symbols-outlined text-[15px] text-red-600">error</span>
                <span>{{ errors.customTime }}</span>
              </p>
            </div>

            <!-- Location -->
            <div class="space-y-1.5">
              <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Kitchen Pickup Location</label>
              <div
                @click="isMapModalOpen = true"
                class="flex items-center bg-surface p-3 sm:p-3.5 rounded-xl shadow-sm gap-3 border border-outline-variant/20 hover:border-primary/50 cursor-pointer transition-all group"
                title="Tap to adjust kitchen pickup pin on map"
              >
                <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span class="material-symbols-outlined text-[20px]">location_on</span>
                </div>
                <div class="flex flex-col min-w-0 flex-1">
                  <span class="text-xs sm:text-sm font-bold text-on-surface truncate">
                    {{ currentPickupAddress }}
                  </span>
                  <span class="text-[10px] text-on-surface-variant flex items-center gap-1">
                    <span>Live broadcast from your kitchen</span>
                    <span class="text-primary font-bold ml-1">• Tap to adjust</span>
                  </span>
                </div>
                <span class="material-symbols-outlined text-on-surface-variant text-[18px]">edit_location</span>
              </div>
            </div>

            <!-- Submit CTA -->
            <div class="mt-auto pt-3 sm:pt-4">
              <button
                :disabled="isPosting"
                class="w-full bg-primary hover:bg-primary/90 text-on-primary text-xs sm:text-sm py-3 sm:py-3.5 rounded-xl shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2 font-bold cursor-pointer disabled:opacity-50"
                type="submit"
              >
                <span v-if="!isPosting" class="flex items-center gap-2">
                  <span>Publish to Neighborhood Radar</span>
                  <span class="material-symbols-outlined text-[18px]">sensors</span>
                </span>
                <span v-else class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                  <span>Publishing & Notifying Neighbors...</span>
                </span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>

    <!-- Mobile Bottom Navigation Bar -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/30 z-50 flex items-center justify-around px-2 shadow-lg">
      <button
        @click="navigateTo('vendor_dashboard')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">dashboard</span>
        <span class="text-[10px] font-semibold mt-0.5">Kitchen</span>
      </button>
      <button
        @click="navigateTo('post_new_food')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">add_circle</span>
        <span class="text-[10px] font-bold mt-0.5">Post Dish</span>
      </button>
      <button
        @click="navigateTo('new_order')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">notifications_active</span>
        <span class="text-[10px] font-semibold mt-0.5">Orders</span>
      </button>
      <button
        @click="navigateTo('vendor_profile')"
        class="flex flex-col items-center justify-center flex-1 py-1 text-on-surface-variant hover:text-primary"
      >
        <span class="material-symbols-outlined text-[22px]">storefront</span>
        <span class="text-[10px] font-semibold mt-0.5">Profile</span>
      </button>
    </nav>

    <!-- Map Modal to adjust pickup pin if needed -->
    <LocationPickerModal
      :is-open="isMapModalOpen"
      :initial-coordinates="currentCoordinates"
      :initial-address="currentPickupAddress"
      @confirm="handleLocationConfirmed"
      @close="isMapModalOpen = false"
    />
  </div>
</template>
