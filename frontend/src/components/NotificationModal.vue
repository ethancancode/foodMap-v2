<script setup>
import { ref, onMounted } from 'vue'
import api from '../services/api.js'

const props = defineProps({
  isOpen: Boolean,
})

const emit = defineEmits(['close', 'toast'])

const notifications = ref([])
const isLoading = ref(false)

async function fetchNotifications() {
  try {
    isLoading.value = true
    const res = await api.get('/notifications')
    notifications.value = res.data?.notifications || res.data?.data || []
  } catch (err) {
    // If empty or non-critical
  } finally {
    isLoading.value = false
  }
}

async function markAsRead(n) {
  try {
    await api.patch(`/notifications/${n._id}/read`)
    n.read = true
  } catch (err) {
    // ignore
  }
}

onMounted(() => {
  fetchNotifications()
})
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in">
    <div class="relative w-full max-w-md bg-surface rounded-3xl border border-outline-variant/30 shadow-2xl p-6 space-y-4">
      <!-- Close Button -->
      <button
        @click="emit('close')"
        class="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant cursor-pointer transition-colors"
      >
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>

      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <span class="material-symbols-outlined text-[20px]">notifications</span>
        </div>
        <div>
          <h2 class="text-base font-extrabold text-on-surface">Neighborhood Alerts</h2>
          <p class="text-xs text-on-surface-variant">Order updates, new chef dishes, and subscription reminders</p>
        </div>
      </div>

      <div class="divide-y divide-outline-variant/10 max-h-80 overflow-y-auto pr-1">
        <div
          v-for="n in notifications"
          :key="n._id"
          @click="markAsRead(n)"
          :class="[
            'py-3 px-3 rounded-2xl transition-colors cursor-pointer flex items-start gap-3',
            n.read ? 'opacity-70 hover:bg-surface-container/30' : 'bg-surface-container/60 hover:bg-surface-container'
          ]"
        >
          <div class="w-2 h-2 rounded-full mt-1.5 shrink-0" :class="n.read ? 'bg-transparent' : 'bg-primary'"></div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-bold text-on-surface">{{ n.title }}</div>
            <div class="text-[11px] text-on-surface-variant mt-0.5">{{ n.message }}</div>
            <div class="text-[9px] text-on-surface-variant/70 mt-1">
              {{ new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
            </div>
          </div>
        </div>

        <div v-if="notifications.length === 0" class="py-8 text-center text-xs text-on-surface-variant">
          No new notifications. You're all caught up!
        </div>
      </div>
    </div>
  </div>
</template>
