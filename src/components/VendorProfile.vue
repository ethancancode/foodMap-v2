<script setup>
import { ref } from 'vue'

const props = defineProps({
  user: Object,
  currentRole: String
})

const emit = defineEmits(['navigate', 'action', 'role-switch'])

const items = ref([
  {
    id: 1,
    name: 'Rajma Chawal',
    price: 80,
    portions: '8 portions left',
    time: 'Ready now',
    desc: 'Homestyle kidney beans cooked in aromatic spices, served with steaming jeera rice.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5tj44PBk_pXA_-WXZGHdA-t1aeLtsjItWwoODao564te6kYMnEP0nty7ZmOM1uGDAyCKeo4ZYgD29FWPxya4vFyDPBKuIYhfbZ2r_4nqxWX2NWHuZSb-U__HojUGlV7Qry_kdbWUTrcyLsEX02meeaz_G9Og5CwwN55pjxKG7NpNoYWSjq69eI9DSj9SGrl1IVowEZ0jKsCnvaymZkSjT65zjQQSkEjmH1Cu6jClqXYIOkburuor5'
  },
  {
    id: 2,
    name: 'Aloo Paratha with Butter & Curd',
    price: 60,
    portions: '5 portions left',
    time: 'Ready in 10m',
    desc: 'Crispy spiced potato stuffed flatbreads served with fresh white butter and thick curd.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9loq5f3DeAN_7at5D5kkMwb96XqWwjFh2Fu8HiIHqZOOOl8lW56ZQWFkODdUyfnTjaXJlLpRpE5u-eUmPJciTOp2AWsk5TePK5XoCyVJqJQ-wrV-XsZAsiT6J3rz7LzXMN8M64YToEZc-zBy5BLfX-Ww5MIpFxAVzRIJthXEgBo4YpNdewqVnSpebJByMGIbWQKztSLT11wIR6rnCbnXO9MKrckv5qwlH2-y8VZSOI9YoEsTIPlww'
  }
])

function navigateTo(route, payload = null) {
  emit('navigate', route, payload)
}

function selectFood(item) {
  emit('navigate', 'food_details', {
    food: {
      id: item.id,
      name: item.name,
      price: item.price,
      vendor: "Anjali's Kitchen",
      distance: '420m away',
      portions: item.portions,
      time: item.time,
      image: item.image,
      desc: item.desc
    }
  })
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
          @click="navigateTo('edit_vendor_profile')"
          class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container text-on-surface font-label-md text-xs font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[18px]">edit</span>
          <span>Edit Kitchen Info</span>
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
            <div class="relative w-full h-[220px] bg-surface-container-high">
              <img
                alt="Anjali's Kitchen Cover"
                class="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida/AP1WRLuDc9bH-IA06P2L6_W9Q5aP_zcaHr2Gr4AXjE7Y0mB862tCkeRCYN5TMn-2hXCZ8XGRJoFkIlXV2K-34snxDNuh5ovfaL3cXQcCk7mD8sxnEolrnZDzyli7ub0Xfw4Wl2GKdIrC-UmLrLN-6dDs-Tj-wfqKn9Z906nuXRDDesZSGnk9Cw3RykuAEVJ_T8Rnh-zxLeyb-7wsQ_29vRY14YlxDViP6YaQnUuxSzT4xjDVM0gsPpR1gIEyCjo"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              
              <div class="absolute bottom-4 left-6 right-6 flex items-end justify-between text-white">
                <div class="flex items-center gap-4">
                  <div class="w-20 h-20 rounded-full border-4 border-surface overflow-hidden bg-surface-variant shadow-lg shrink-0">
                    <img
                      class="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAa_bwPjHF4-UEAiI4g5QpEUhysOA60vRVbWAtpUJdovb-DsF0Nwr89fLNBADH3P9XPSxVmlA18etggDwZ5Cw5Bl3wTsXi_SGa7y6x4oAclP0w5US1AWf1oa9_pJAkUSAOZ-b4-vYBIyhdXhHWAFG-cVG_xToI84-GLHz928ndgHHMciMrrffmLzqG4yWZ-hZLSM_I4j1WLnUEHY6WB6zf8rx4sxjG0uMMcoRQdE-DkkemszKJt7D0p"
                    />
                  </div>
                  <div>
                    <h1 class="font-headline-lg text-2xl font-bold text-white mb-0.5">Anjali's Kitchen</h1>
                    <p class="font-label-md text-xs text-white/90 flex items-center gap-1.5">
                      <span class="material-symbols-outlined text-[16px]">soup_kitchen</span>
                      Home Cook • North Indian Specialties • Bhandup West
                    </p>
                  </div>
                </div>

                <div class="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1">
                  <span class="material-symbols-outlined text-yellow-400 text-[16px]">star</span>
                  <span>4.9 (42 Reviews)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Menu Section -->
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h2 class="font-title-md font-bold text-on-surface text-lg flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                <span>Active Live Dishes</span>
              </h2>
              <span class="text-xs text-on-surface-variant">Tap a dish to order</span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div
                v-for="item in items"
                :key="item.id"
                @click="selectFood(item)"
                class="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/20 shadow-sm flex flex-col group hover:shadow-md transition-all cursor-pointer"
              >
                <div class="relative h-44 w-full bg-surface-variant overflow-hidden">
                  <img :src="item.image" :alt="item.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div class="absolute top-3 left-3 bg-black/70 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                    {{ item.portions }}
                  </div>
                  <div class="absolute bottom-3 left-3 bg-surface/95 backdrop-blur-md text-on-surface px-3 py-1 rounded-full shadow font-bold text-sm">
                    ₹{{ item.price }}
                  </div>
                </div>

                <div class="p-4 flex flex-col gap-2 flex-1">
                  <h3 class="font-title-md font-bold text-on-surface group-hover:text-primary transition-colors text-base">{{ item.name }}</h3>
                  <p class="font-body-md text-xs text-on-surface-variant line-clamp-2">{{ item.desc }}</p>
                  
                  <div class="mt-auto pt-3 flex items-center justify-between border-t border-outline-variant/10">
                    <span class="text-xs text-green-600 font-semibold flex items-center gap-1">
                      <span class="material-symbols-outlined text-[16px]">schedule</span>
                      {{ item.time }}
                    </span>
                    <button class="bg-primary text-on-primary font-label-md text-xs px-4 py-1.5 rounded-lg font-bold">
                      Order Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  </div>
</template>
