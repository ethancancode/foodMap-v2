<script setup>
import { ref, computed, watch } from 'vue'
import { foodApi, groupOrderApi } from '../services/api.js'
import { getSocket } from '../services/socket.js'
import ResidentFoodCard from './ResidentFoodCard.vue'

const props = defineProps({
  isOpen: Boolean,
  user: Object,
  foods: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close', 'order-placed', 'toast'])

const mode = ref('hub') // 'hub' | 'create' | 'join' | 'view'
const groupCodeInput = ref('')
const currentGroup = ref(null)
const isLoading = ref(false)
const addingFoodId = ref('')
const groupFoods = ref([])
const selectableFoods = computed(() => (props.foods.length ? props.foods : groupFoods.value).filter((food) =>
  food.available !== false && Number(food.quantity) > 0 && food.fulfillmentOptions !== 'PICKUP_ONLY'
))

const groupItems = computed(() => currentGroup.value?.members?.flatMap((member) =>
  (member.items || []).map((item) => ({ ...item, member }))
) || [])
const groupTotal = computed(() => currentGroup.value?.total ?? groupItems.value.reduce(
  (total, item) => total + Number(item.price) * Number(item.quantity),
  0
))
const currentUserId = computed(() => String(props.user?._id || props.user?.id || ''))
const isHost = computed(() => {
  const hostId = currentGroup.value?.host?._id || currentGroup.value?.host
  return Boolean(hostId && String(hostId) === currentUserId.value)
})
const hasGroupItems = computed(() => groupItems.value.length > 0)

function memberId(member) {
  return String(member?.user?._id || member?.user || '')
}

function isOwnItem(item) {
  return memberId(item.member) === currentUserId.value
}

function setCurrentGroup(response) {
  currentGroup.value = response.group || response.data
}

async function loadGroupFoods() {
  try {
    const response = await foodApi.getFoods()
    groupFoods.value = response.foods.filter((food) =>
      food.available !== false && Number(food.quantity) > 0 && food.fulfillmentOptions !== 'PICKUP_ONLY'
    )
  } catch (err) {
    emit('toast', err.message || 'Could not load available food')
  }
}

watch(() => props.isOpen, (isOpen) => {
  if (isOpen && groupFoods.value.length === 0) loadGroupFoods()
}, { immediate: true })

async function handleCreateGroup() {
  try {
    isLoading.value = true
    const res = await groupOrderApi.create({
      deliveryAddress: props.user?.location?.address || 'Shared Neighborhood Hub',
    })
    setCurrentGroup(res)
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
    setCurrentGroup(res)
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
  if (!currentGroup.value || !isHost.value || !hasGroupItems.value) return
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

async function handleAddItem(food) {
  if (!currentGroup.value || !food?._id) return
  try {
    addingFoodId.value = food._id
    const response = await groupOrderApi.addItem(currentGroup.value.code, { foodId: food._id, quantity: 1 })
    setCurrentGroup(response)
    emit('toast', `${food.name} added to the Group Meal`)
  } catch (err) {
    emit('toast', err.response?.data?.message || err.message || 'Could not add this food')
  } finally {
    addingFoodId.value = ''
  }
}

async function handleQuantityChange(item, quantity) {
  if (!currentGroup.value || !isOwnItem(item)) return
  try {
    isLoading.value = true
    const response = await groupOrderApi.updateItem(currentGroup.value.code, item.food?._id || item.food, { quantity })
    setCurrentGroup(response)
  } catch (err) {
    emit('toast', err.response?.data?.message || err.message || 'Could not update quantity')
  } finally {
    isLoading.value = false
  }
}

async function handleRemoveItem(item) {
  if (!currentGroup.value || !isOwnItem(item)) return
  try {
    isLoading.value = true
    const response = await groupOrderApi.removeItem(currentGroup.value.code, item.food?._id || item.food)
    setCurrentGroup(response)
  } catch (err) {
    emit('toast', err.response?.data?.message || err.message || 'Could not remove item')
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
    <div class="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface rounded-3xl border border-outline-variant/30 shadow-2xl p-6 space-y-6">
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

        <div class="space-y-3">
          <div class="flex items-center justify-between text-xs font-bold text-on-surface">
            <span>Group Meal Items</span>
            <span>₹{{ Number(groupTotal).toFixed(2) }}</span>
          </div>
          <p v-if="!hasGroupItems" class="text-xs text-on-surface-variant">Choose available food below to start this order.</p>
          <div v-else class="divide-y divide-outline-variant/20 border-y border-outline-variant/20">
            <div v-for="item in groupItems" :key="`${memberId(item.member)}-${item.food?._id || item.food}`" class="py-2 flex items-center gap-3 text-xs">
              <img :src="item.food?.image" :alt="item.name" class="w-11 h-11 rounded-lg object-cover bg-surface-container" />
              <div class="min-w-0 flex-1">
                <div class="font-bold text-on-surface truncate">{{ item.name }}</div>
                <div class="text-on-surface-variant">{{ item.member.name }} · ₹{{ Number(item.price).toFixed(2) }} each</div>
              </div>
              <template v-if="isOwnItem(item)">
                <button type="button" :disabled="isLoading || item.quantity <= 1" @click="handleQuantityChange(item, item.quantity - 1)" class="w-7 h-7 rounded-lg border border-outline-variant/40 text-on-surface disabled:opacity-40">−</button>
                <span class="w-5 text-center font-bold">{{ item.quantity }}</span>
                <button type="button" :disabled="isLoading" @click="handleQuantityChange(item, item.quantity + 1)" class="w-7 h-7 rounded-lg border border-outline-variant/40 text-on-surface">+</button>
                <button type="button" :disabled="isLoading" title="Remove item" @click="handleRemoveItem(item)" class="w-7 h-7 rounded-lg text-on-surface-variant hover:bg-surface-container">×</button>
              </template>
              <span v-else class="font-bold text-on-surface">×{{ item.quantity }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="text-xs font-bold text-on-surface">Available Food</div>
          <p v-if="selectableFoods.length === 0" class="text-xs text-on-surface-variant">No delivery-eligible food is currently available.</p>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResidentFoodCard
              v-for="food in selectableFoods"
              :key="food._id || food.id"
              :item="food"
              group-order-active
              :adding-food-id="addingFoodId"
              @select="() => {}"
              @add-to-group="handleAddItem"
            />
          </div>
        </div>

        <!-- Coordinated Checkout Button -->
        <div class="pt-2">
          <button
            @click="handleCheckoutGroup"
            :disabled="isLoading || !isHost || !hasGroupItems || currentGroup.status !== 'OPEN'"
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
