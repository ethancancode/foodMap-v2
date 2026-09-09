<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  coordinates: {
    type: Array,
    default: () => [73.0188, 19.0225], // [lng, lat]
  },
  residentName: {
    type: String,
    default: 'Resident',
  },
  address: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close'])

const mapContainer = ref(null)
let map = null
let marker = null

const residentPinIcon = L.divIcon({
  className: 'custom-resident-pin-icon',
  html: `
    <div class="pin-anchor">
      <div class="pin-pulse"></div>
      <div class="pin-card">
        <span class="material-symbols-outlined pin-icon">person_pin_circle</span>
      </div>
      <div class="pin-arrow"></div>
      <div class="pin-shadow"></div>
    </div>
  `,
  iconSize: [40, 48],
  iconAnchor: [20, 48],
})

function initMap() {
  if (!mapContainer.value) return
  if (map) {
    map.remove()
    map = null
  }

  const rawCoords = props.coordinates || [73.0188, 19.0225]
  const lng = Number(rawCoords[0]) || 73.0188
  const lat = Number(rawCoords[1]) || 19.0225

  map = L.map(mapContainer.value, {
    center: [lat, lng],
    zoom: 15,
    zoomControl: false,
    attributionControl: false,
  })

  L.control.zoom({ position: 'bottomright' }).addTo(map)

  // Esri World Street Map (Matches resident radar map)
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
  }).addTo(map)

  marker = L.marker([lat, lng], {
    icon: residentPinIcon,
  }).addTo(map)

  marker.bindPopup(`<b>${props.residentName}</b><br/>${props.address || 'Pickup Location'}`).openPopup()
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      nextTick(() => {
        setTimeout(() => {
          initMap()
          if (map) map.invalidateSize()
        }, 150)
      })
    } else {
      if (map) {
        map.remove()
        map = null
      }
    }
  }
)

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div
          class="relative w-full max-w-xl bg-surface-container-lowest rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-outline-variant/30 animate-in fade-in zoom-in-95 duration-200"
        >
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/60">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <span class="material-symbols-outlined text-[22px]">location_on</span>
              </div>
              <div>
                <h3 class="text-base font-extrabold text-on-surface">{{ residentName }}'s Location</h3>
                <p class="text-xs text-on-surface-variant truncate max-w-xs">{{ address || 'Live order location' }}</p>
              </div>
            </div>
            <button
              @click="emit('close')"
              class="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <!-- Map Container -->
          <div class="relative w-full h-80 bg-surface-container-high">
            <div ref="mapContainer" class="w-full h-full z-0"></div>
          </div>

          <!-- Modal Footer -->
          <div class="p-4 border-t border-outline-variant/20 bg-surface-container-low/40 flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 text-xs text-on-surface-variant min-w-0">
              <span class="material-symbols-outlined text-[18px] text-primary shrink-0">pin_drop</span>
              <span class="truncate">{{ address || 'Seawoods, Navi Mumbai' }}</span>
            </div>
            <button
              @click="emit('close')"
              class="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-sm shrink-0"
            >
              Close Map
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

:deep(.custom-resident-pin-icon) {
  background: transparent;
  border: none;
}

:deep(.pin-anchor) {
  position: relative;
  width: 40px;
  height: 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

:deep(.pin-card) {
  width: 40px;
  height: 40px;
  background: #b91c1c;
  color: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(185, 28, 28, 0.4);
  z-index: 2;
}

:deep(.pin-icon) {
  font-size: 24px;
}

:deep(.pin-arrow) {
  width: 0;
  height: 0;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-top: 8px solid #b91c1c;
  margin-top: -1px;
  z-index: 2;
}

:deep(.pin-pulse) {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 38px;
  height: 38px;
  background: rgba(185, 28, 28, 0.35);
  border-radius: 50%;
  animation: pinPulse 2s infinite ease-out;
  z-index: 1;
}

@keyframes pinPulse {
  0% {
    transform: translateX(-50%) scale(0.8);
    opacity: 0.8;
  }
  100% {
    transform: translateX(-50%) scale(2);
    opacity: 0;
  }
}
</style>
