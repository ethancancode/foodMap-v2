<script setup>
import { ref, onMounted } from 'vue'
import { groupOrderApi } from '../services/api.js'
import { getSocket } from '../services/socket.js'

const props = defineProps({
  isOpen: Boolean,
  user: Object,
})

const emit = defineEmits(['close', 'order-placed', 'toast'])

const mode = ref('hub') // 'hub' | 'create' | 'join' | 'view'
const groupCodeInput = ref('')
const currentGroup = ref(null)
const isLoading = ref(false)

async function handleCreateGroup() {
  try {
    isLoading.value = true
    const res = await groupOrderApi.create({
      deliveryAddress: props.user?.location?.address || 'Shared Neighborhood Hub',
    })
    currentGroup.value = res.group || res.data
    mode.value = 'view'
    listenToGroup(currentGroup.value.code)
    emit('toast', `Group order ${currentGroup.value.code} created! Share this code with neighbors.`)
  } catch (err) {
    emit('toast', err.message || 'Failed to create group order')
  } finally {
    isLoading.value = false
  }
}

async function handleJoinGroup() {
  if (!groupCodeInput.value.trim()) return
  try {
    isLoading.value = true
    const code = groupCodeInput.value.trim().toUpperCase()
    const res = await groupOrderApi.join(code, { name: props.user?.name || 'Neighbor' })
    currentGroup.value = res.group || res.data
    mode.value = 'view'
    listenToGroup(code)
    emit('toast', `Joined group ${code}!`)
  } catch (err) {
    emit('toast', err.message || 'Could not join group order')
  } finally {
    isLoading.value = false
  }
}

async function handleCheckoutGroup() {
  if (!currentGroup.value) return
  try {
    isLoading.value = true
    const res = await groupOrderApi.checkout(currentGroup.value.code, {
      orderType: 'DELIVERY',
    })
    emit('toast', 'Group order placed successfully!')
    emit('order-placed', res.order)
    emit('close')
  } catch (err) {
    emit('toast', err.message || 'Could not place group order')
  } finally {
    isLoading.value = false
  }
}

function listenToGroup(code) {
  const socket = getSocket()
  socket.emit('order:subscribe', `group:${code}`)
  socket.on('groupOrder:updated', (updated) => {
    if (updated.code === code) {
      currentGroup.value = updated
    }
  })
}

function copyCode() {
  if (currentGroup.value?.code) {
    navigator.clipboard.writeText(currentGroup.value.code)
    emit('toast', 'Group code copied to clipboard!')
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in">
    <div class="relative w-full max-w-lg bg-surface rounded-3xl border border-outline-variant/30 shadow-2xl p-6 space-y-6">
      <!-- Close Button -->
      <button
        @click="emit('close')"
        class="absolute top-5 right-5 w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant cursor-pointer transition-colors"
      >
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>

      <!-- Header -->
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <span class="material-symbols-outlined text-[24px]">groups</span>
        </div>
        <div>
          <h2 class="text-base font-extrabold text-on-surface">Community Group Ordering</h2>
          <p class="text-xs text-on-surface-variant">Order together with your apartment neighbors to save on delivery fees</p>
        </div>
      </div>

      <!-- Hub Menu -->
      <div v-if="mode === 'hub'" class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <button
          @click="handleCreateGroup"
          :disabled="isLoading"
          class="p-4 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-left space-y-1 transition-all cursor-pointer group"
        >
          <div class="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold mb-2">
            <span class="material-symbols-outlined text-[18px]">add</span>
          </div>
          <div class="text-xs font-extrabold text-on-surface group-hover:text-primary">Host New Group</div>
          <p class="text-[11px] text-on-surface-variant">Create a group code and invite neighbors in your wing</p>
        </button>

        <button
          @click="mode = 'join'"
          class="p-4 rounded-2xl border border-outline-variant/40 bg-surface hover:bg-surface-container text-left space-y-1 transition-all cursor-pointer group"
        >
          <div class="w-8 h-8 rounded-xl bg-surface-container text-on-surface flex items-center justify-center font-bold mb-2">
            <span class="material-symbols-outlined text-[18px]">key</span>
          </div>
          <div class="text-xs font-extrabold text-on-surface group-hover:text-primary">Join With Code</div>
          <p class="text-[11px] text-on-surface-variant">Enter a code shared by your building group host</p>
        </button>
      </div>

      <!-- Join Form -->
      <div v-if="mode === 'join'" class="space-y-4 pt-2">
        <div class="space-y-1.5">
          <label class="text-xs font-bold text-on-surface">Enter 8-Character Group Code</label>
          <input
            v-model="groupCodeInput"
            type="text"
            placeholder="e.g. GRP-4821"
            class="w-full px-4 py-2.5 rounded-xl bg-surface-container/60 border border-outline-variant/40 text-xs font-mono font-bold uppercase tracking-wider focus:outline-none focus:border-primary"
          />
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="mode = 'hub'"
            class="flex-1 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-bold cursor-pointer"
          >
            Back
          </button>
          <button
            @click="handleJoinGroup"
            :disabled="isLoading || !groupCodeInput"
            class="flex-1 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
          >
            Join Group
          </button>
        </div>
      </div>

      <!-- Active Group View -->
      <div v-if="mode === 'view' && currentGroup" class="space-y-4">
        <!-- Code Banner -->
        <div class="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
          <div>
            <div class="text-[10px] font-bold text-primary uppercase tracking-wider">Group Access Code</div>
            <div class="text-lg font-black font-mono tracking-widest text-on-surface">{{ currentGroup.code }}</div>
          </div>
          <button
            @click="copyCode"
            class="px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <span class="material-symbols-outlined text-[14px]">content_copy</span>
            <span>Copy</span>
          </button>
        </div>

        <!-- Participants List -->
        <div class="space-y-2">
          <div class="text-xs font-bold text-on-surface flex items-center justify-between">
            <span>Participants ({{ currentGroup.members?.length || 1 }})</span>
            <span class="text-[11px] text-green-700 font-semibold">● Group Open</span>
          </div>

          <div class="divide-y divide-outline-variant/10 max-h-48 overflow-y-auto bg-surface-container/40 rounded-2xl p-2">
            <div
              v-for="m in currentGroup.members"
              :key="m.user"
              class="py-2 px-2 flex items-center justify-between text-xs"
            >
              <div>
                <span class="font-bold text-on-surface">{{ m.name }}</span>
                <span v-if="m.user === currentGroup.host" class="ml-1 text-[10px] font-bold text-primary">(Host)</span>
                <div class="text-[11px] text-on-surface-variant">
                  {{ m.items?.length ? `${m.items.length} items added` : 'Browsing dishes...' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Coordinated Checkout Button -->
        <div class="pt-2">
          <button
            @click="handleCheckoutGroup"
            :disabled="isLoading"
            class="w-full py-3 rounded-2xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer transition-all hover:brightness-105"
          >
            <span class="material-symbols-outlined text-[18px]">shopping_cart_checkout</span>
            <span>Place Coordinated Group Order</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
