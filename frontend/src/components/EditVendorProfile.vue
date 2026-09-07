<script setup>
import { ref, onMounted } from 'vue'
import { vendorApi } from '../services/api.js'
import LocationPickerModal from './LocationPickerModal.vue'

const props = defineProps({
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const kitchenName = ref(props.user?.name ? `${props.user.name}'s Kitchen` : "")
const specialties = ref('')
const location = ref('')
const coordinates = ref([73.0188, 19.0225])
const experience = ref('')
const bio = ref('')
const avatarUrl = ref(props.user?.avatar || '')
const coverImageUrl = ref('')
const isLocating = ref(false)
const isMapModalOpen = ref(false)

function openMapModal() {
  isMapModalOpen.value = true
}

function handleLocationConfirmed(loc) {
  coordinates.value = loc.coordinates
  location.value = loc.address
  isMapModalOpen.value = false
}

async function detectCurrentLocation() {
  if (!('geolocation' in navigator)) return
  isLocating.value = true
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      coordinates.value = [lng, lat]
      try {
        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        )
        if (bdcRes.ok) {
          const data = await bdcRes.json()
          const locality = data.locality || data.neighbourhood || data.quarter || ''
          const city = data.city || data.principalSubdivision || 'Navi Mumbai'
          location.value = locality ? `${locality}, ${city}` : city
        }
      } catch (e) {
        location.value = 'Seawoods, Navi Mumbai'
      } finally {
        isLocating.value = false
      }
    },
    (err) => {
      console.warn('Geolocation declined', err.message)
      isLocating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

onMounted(async () => {
  try {
    const res = await vendorApi.getMyProfile()
    const v = res?.vendor || res?.data
    if (v) {
      if (v.businessName) kitchenName.value = v.businessName
      const addr = v.location?.pickupAddress || v.pickupAddress || v.location?.address
      if (addr) location.value = addr
      if (v.location?.coordinates) coordinates.value = v.location.coordinates
      if (v.bio) bio.value = v.bio
      if (v.experience) experience.value = v.experience
      if (v.category) specialties.value = v.category
      if (v.coverImage) coverImageUrl.value = v.coverImage
      if (v.user?.avatar) avatarUrl.value = v.user.avatar
    }
  } catch (e) {
    console.warn('Could not load vendor profile:', e.message)
  }
})

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

async function handleSave() {
  try {
    await vendorApi.updateVendor('me', {
      businessName: kitchenName.value,
      category: specialties.value,
      pickupAddress: location.value,
      coordinates: coordinates.value,
      experience: experience.value,
      bio: bio.value,
    })
    emit('action', { action: 'toast', payload: { message: 'Kitchen profile updated successfully!' } })
    emit('navigate', 'vendor_profile')
  } catch (e) {
    emit('action', { action: 'toast', payload: { message: e.message || 'Failed to update profile' } })
  }
}
</script>

<template>
  <div class="component-root w-full min-h-screen bg-background text-on-surface">
    <!-- Left Navigation Sidebar -->
    <aside class="fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 flex flex-col border-r border-outline-variant/30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      <div class="p-stack-lg flex items-center gap-base">
        <button @click="navigateTo('vendor_dashboard')" class="flex items-center gap-base text-left">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <span class="material-symbols-outlined text-on-primary">soup_kitchen</span>
          </div>
          <span class="font-headline-lg text-title-md tracking-tight text-primary">FoodMap</span>
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
          <span class="font-label-md">Active Orders</span>
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
        <button
          @click="navigateTo('vendor_profile')"
          class="w-full flex items-center gap-gutter px-gutter py-stack-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 hover:border-primary/40 transition-colors text-left cursor-pointer"
        >
          <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {{ (kitchenName || props.user?.vendor?.businessName || props.user?.name || 'P').charAt(0).toUpperCase() }}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="font-label-md text-on-surface leading-normal text-xs font-bold truncate">{{ kitchenName || props.user?.vendor?.businessName || props.user?.name || "Priya Kitchen" }}</span>
          </div>
        </button>

        <button
          @click="navigateTo('welcome')"
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
            @click="navigateTo('vendor_profile')"
            class="flex items-center gap-2 text-on-surface hover:text-primary transition-colors bg-surface-container-high/60 hover:bg-surface-container-high px-4 py-2 rounded-full font-label-md font-semibold"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
            <span>Back to Profile</span>
          </button>
        </div>
        <button
          @click="handleSave"
          class="px-5 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all shadow-sm"
        >
          Save Changes
        </button>
      </header>

      <main class="relative pt-20 min-h-screen bg-background">
        <div class="px-container-margin py-stack-lg max-w-4xl mx-auto w-full">
          <form @submit.prevent="handleSave" class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            
            <!-- Left: Identity & Location -->
            <div class="flex flex-col gap-6">
              <section class="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/20 flex flex-col sm:flex-row items-center gap-5">
                <div class="relative group cursor-pointer shrink-0 w-24 h-24 rounded-full overflow-hidden shadow-sm ring-4 ring-surface-variant flex items-center justify-center bg-primary/20">
                  <img
                    v-if="avatarUrl || props.user?.avatar"
                    alt="Vendor Avatar"
                    class="w-full h-full object-cover"
                    :src="avatarUrl || props.user?.avatar"
                    @error="$event.target.style.display = 'none'"
                  />
                  <span v-else class="text-3xl font-bold text-primary">
                    {{ (kitchenName || props.user?.name || 'K').charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="flex-1 space-y-3 w-full">
                  <div class="space-y-1 w-full">
                    <label class="font-label-sm text-xs font-bold text-on-surface uppercase tracking-wider">Kitchen / Stall Name</label>
                    <input
                      v-model="kitchenName"
                      class="w-full bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary border border-outline-variant/20 font-semibold"
                      type="text"
                    />
                  </div>
                  <div class="space-y-1 w-full">
                    <label class="font-label-sm text-xs font-bold text-on-surface uppercase tracking-wider">Specialties & Cuisine</label>
                    <input
                      v-model="specialties"
                      class="w-full bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary border border-outline-variant/20 font-medium"
                      placeholder="e.g. North Indian • Home Cook • Thali"
                      type="text"
                    />
                  </div>
                </div>
              </section>

              <!-- Location -->
              <section class="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/20 space-y-4">
                <div class="flex items-center gap-2 pb-2 border-b border-outline-variant/20">
                  <span class="material-symbols-outlined text-primary text-[20px]">location_on</span>
                  <h2 class="font-title-md text-sm font-bold text-on-surface">Pickup Address</h2>
                </div>
                <div class="space-y-1 w-full">
                  <label class="font-label-sm text-xs font-bold text-on-surface-variant uppercase tracking-wider">Kitchen Pickup Location</label>
                  <div
                    @click="openMapModal"
                    class="w-full bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl px-3 py-2.5 outline-none border border-outline-variant/20 flex items-center justify-between cursor-pointer hover:border-primary transition-all"
                  >
                    <input
                      v-model="location"
                      class="bg-transparent border-none outline-none flex-1 min-w-0 text-sm font-medium cursor-pointer placeholder:text-xs placeholder:text-on-surface-variant/60 pr-2 truncate"
                      placeholder="Tap to set location..."
                      readonly
                    />
                    <span class="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <span class="material-symbols-outlined text-[14px]">map</span>
                      <span>Pin</span>
                    </span>
                  </div>
                  <p class="text-[11px] text-on-surface-variant/80 mt-1">
                    Tap to position your exact kitchen pickup entrance on the live map canvas.
                  </p>
                </div>
              </section>
            </div>

            <!-- Right: Bio & Actions -->
            <div class="flex flex-col gap-6">
              <section class="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/20 space-y-4">
                <div class="flex items-center gap-2 pb-2 border-b border-outline-variant/20">
                  <span class="material-symbols-outlined text-primary text-[20px]">verified_user</span>
                  <h2 class="font-title-md text-sm font-bold text-on-surface">Trust & Experience</h2>
                </div>
                <div class="space-y-1 w-full">
                  <label class="font-label-sm text-xs font-bold text-on-surface-variant uppercase tracking-wider">Experience</label>
                  <input
                    v-model="experience"
                    class="w-full bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary border border-outline-variant/20"
                    type="text"
                  />
                </div>
              </section>

              <section class="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/20 space-y-3">
                <div class="flex items-center gap-2 pb-2 border-b border-outline-variant/20">
                  <span class="material-symbols-outlined text-primary text-[20px]">auto_stories</span>
                  <h2 class="font-title-md text-sm font-bold text-on-surface">Kitchen Story / Bio</h2>
                </div>
                <textarea
                  v-model="bio"
                  rows="4"
                  class="w-full bg-surface-container-low text-on-surface font-body-md text-xs rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary border border-outline-variant/20 resize-none leading-relaxed"
                ></textarea>
              </section>

              <div class="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  @click="navigateTo('vendor_profile')"
                  class="px-5 py-2.5 rounded-xl text-xs font-semibold text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-6 py-2.5 rounded-xl text-xs font-bold text-on-primary bg-primary hover:bg-primary/90 shadow-md transition-all cursor-pointer"
                >
                  Save Profile
                </button>
              </div>
            </div>

          </form>
        </div>
      </main>
    </div>

    <!-- Location Picker Modal Canvas -->
    <LocationPickerModal
      :is-open="isMapModalOpen"
      :initial-coordinates="coordinates"
      :initial-address="location"
      @confirm="handleLocationConfirmed"
      @close="isMapModalOpen = false"
    />
  </div>
</template>
