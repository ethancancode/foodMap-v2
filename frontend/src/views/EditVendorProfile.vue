<script setup>
import { ref, onMounted } from 'vue'
import { vendorApi } from '../services/api.js'
import LocationPickerModal from '../components/LocationPickerModal.vue'
import AppSidebar from '../components/AppSidebar.vue'
import AppHeader from '../components/AppHeader.vue'

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
    <!-- Unified Vendor Sidebar -->
    <AppSidebar
      :is-open="false"
      role="vendor"
      active-route="vendor_profile"
      :user="props.user"
      @navigate="navigateTo"
      @logout="navigateTo('welcome')"
    />

    <!-- Main Content Area -->
    <div class="lg:pl-72">
      <!-- Unified Header -->
      <AppHeader
        :show-back="true"
        back-label="Back to Profile"
        back-route="vendor_profile"
        :show-sync-badge="false"
        @navigate="navigateTo"
      />

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
