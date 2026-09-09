<script setup>
import { ref, watch } from 'vue'
import { foodApi } from '../services/api.js'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  dish: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'saved', 'deleted', 'toast'])

const categories = ['Main Course', 'Snacks', 'Breakfast', 'Dessert', 'Beverages', 'Specialty']

const editFileInput = ref(null)
const isSavingDish = ref(false)

const editForm = ref({
  id: '',
  name: '',
  description: '',
  price: 0,
  quantity: 1,
  category: 'Main Course',
  isVeg: true,
  cookingStatus: 'Ready now',
  image: '',
  customHours: '',
  customMinutes: '',
})

watch(
  () => props.dish,
  (dish) => {
    if (!dish) return
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
      quantity: dish.quantity !== undefined ? Number(dish.quantity) : 1,
      category: dish.category || 'Main Course',
      isVeg: dish.isVeg !== undefined ? Boolean(dish.isVeg) : (dish.diet !== 'non-veg'),
      cookingStatus: matchedStatus,
      image: dish.image || '',
      customHours: ch,
      customMinutes: cm,
    }
  },
  { immediate: true }
)

function adjustEditPortion(delta) {
  const current = Number(editForm.value.quantity) || 0
  editForm.value.quantity = Math.max(0, current + delta)
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
    emit('toast', 'Dish photo should be under 5MB')
    return
  }
  const reader = new FileReader()
  reader.onload = (event) => {
    editForm.value.image = event.target.result
  }
  reader.readAsDataURL(file)
}

function handleClose() {
  emit('close')
}

async function handleDeleteDish() {
  const id = editForm.value.id
  if (!id) return
  if (!confirm(`Are you sure you want to remove ${editForm.value.name || 'this dish'} from your radar?`)) return
  try {
    await foodApi.deleteFood(id)
    emit('deleted', id)
    emit('toast', `${editForm.value.name || 'Dish'} removed successfully`)
    handleClose()
  } catch (err) {
    emit('toast', 'Failed to delete dish')
  }
}

async function saveDish() {
  if (!editForm.value.name?.trim()) {
    emit('toast', 'Please provide a dish name')
    return
  }
  if (editForm.value.price === undefined || editForm.value.price === null || Number(editForm.value.price) < 0) {
    emit('toast', 'Please provide a valid price')
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
      isVeg: Boolean(editForm.value.isVeg),
      diet: editForm.value.isVeg ? 'veg' : 'non-veg',
      cookingStatus: finalStatus,
      timeReady: finalStatus,
      readyAt: readyAt ? readyAt.toISOString() : null,
      image: editForm.value.image,
      available: qty > 0,
      isAvailable: qty > 0,
    }

    const res = await foodApi.updateFood(editForm.value.id, payload)
    const updated = res?.food || res?.data || { ...payload, _id: editForm.value.id, id: editForm.value.id }

    emit('saved', updated)
    emit('toast', `🎉 ${payload.name} updated successfully!`)
    handleClose()
  } catch (err) {
    console.error('Failed to update dish:', err)
    const msg = err.response?.data?.message || err.message || 'Failed to update dish'
    emit('toast', msg)
  } finally {
    isSavingDish.value = false
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    @click.self="handleClose"
  >
    <div
      class="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col p-5 sm:p-6 gap-5 my-auto animate-in fade-in zoom-in-95 duration-150"
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
          type="button"
          @click="handleClose"
          class="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <!-- Dish Image Preview & Upload -->
      <div class="space-y-2"> 
        <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Dish Photo</label>
        <div class="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-surface-container border border-outline-variant/30 group">
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

      <!-- Food Type / Diet (Veg vs Non-Veg) -->
      <div class="space-y-1.5">
        <label class="text-xs font-bold text-on-surface uppercase tracking-wider block">Food Type / Dietary</label>
        <div class="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            @click="editForm.isVeg = true"
            :class="editForm.isVeg ? 'bg-green-500/10 border-green-600 text-green-800 ring-2 ring-green-600/20 font-bold shadow-xs' : 'bg-surface border-outline-variant/40 text-on-surface-variant hover:bg-surface-container font-medium'"
            class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border transition-all cursor-pointer"
          >
            <span class="w-4 h-4 rounded-xs border-2 border-green-600 flex items-center justify-center p-0.5 shrink-0">
              <span class="w-2 h-2 rounded-full bg-green-600"></span>
            </span>
            <span class="text-xs">Pure Veg</span>
          </button>

          <button
            type="button"
            @click="editForm.isVeg = false"
            :class="!editForm.isVeg ? 'bg-red-500/10 border-red-600 text-red-800 ring-2 ring-red-600/20 font-bold shadow-xs' : 'bg-surface border-outline-variant/40 text-on-surface-variant hover:bg-surface-container font-medium'"
            class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border transition-all cursor-pointer"
          >
            <span class="w-4 h-4 rounded-xs border-2 border-red-600 flex items-center justify-center p-0.5 shrink-0">
              <span class="w-2 h-2 rounded-full bg-red-600"></span>
            </span>
            <span class="text-xs">Non-Veg</span>
          </button>
        </div>
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
              @click="adjustEditPortion(-1)"
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
              @click="adjustEditPortion(1)"
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
          @click="handleDeleteDish"
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-600/10 text-xs font-bold transition-colors cursor-pointer"
        >
          <span class="material-symbols-outlined text-[17px]">delete</span>
          <span>Delete Dish</span>
        </button>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="handleClose"
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
</template>
