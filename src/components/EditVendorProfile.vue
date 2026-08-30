<script setup>
import { ref } from 'vue'

const props = defineProps({
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const kitchenName = ref("Anjali's Kitchen")
const vendorType = ref('home')
const location = ref('Near Ruia College Gate, Bhandup West')
const experience = ref('Selling since 2022')
const bio = ref('I love sharing the meals I cook for my family with the neighborhood. Every dish is made with fresh ingredients and authentic homemade spices.')

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

function handleSave() {
  emit('action', { action: 'toast', payload: { message: 'Kitchen profile updated successfully!' } })
  emit('navigate', 'vendor_profile')
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
                <div class="relative group cursor-pointer shrink-0">
                  <img
                    alt="Vendor Avatar"
                    class="w-24 h-24 rounded-full object-cover shadow-sm ring-4 ring-surface-variant"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUAKf21eybPUtwjXWS_WDPcM3KS176CUGgvq9K8tOR9nvREtDOtAIH3wvA0YQv6cNKpWqL-hDv_hxicHTJfpg3fJYeC-MBr5DDGUd5zeF3PPagp74DJ9-sxSew09ougUUFCmU7P-4Ce8i6LS6HlJCLLYB6TIxWUGpNIgv0PVtUx0vGt7CulFXqjZj3JdVIwzjRPc0QLiMAATn7yplewZF9vCw2IEg7qXhsjKuXymuCd9q6sdRqsf91"
                  />
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
                    <label class="font-label-sm text-xs font-bold text-on-surface uppercase tracking-wider">Vendor Type</label>
                    <select
                      v-model="vendorType"
                      class="w-full bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary border border-outline-variant/20 font-medium"
                    >
                      <option value="home">Home Kitchen</option>
                      <option value="street">Street Food Stall</option>
                      <option value="tiffin">Tiffin Service</option>
                    </select>
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
                  <label class="font-label-sm text-xs font-bold text-on-surface-variant uppercase tracking-wider">Primary Location</label>
                  <input
                    v-model="location"
                    class="w-full bg-surface-container-low text-on-surface font-body-md text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary border border-outline-variant/20"
                    type="text"
                  />
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
  </div>
</template>
