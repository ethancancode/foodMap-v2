<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  initialCoordinates: {
    type: Array,
    default: () => [73.0188, 19.0225], // [lng, lat]
  },
  initialAddress: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['confirm', 'close'])

const mapContainer = ref(null)
const selectedAddress = ref('')
const selectedCoords = ref([73.0188, 19.0225]) // [lng, lat]
const isLocating = ref(false)

let map = null
let marker = null
let debounceTimer = null

// Custom vibrant Chef Kitchen Pin
const kitchenPinIcon = L.divIcon({
  className: 'custom-kitchen-pin-icon',
  html: `
    <div class="pin-anchor">
      <div class="pin-pulse"></div>
      <div class="pin-card">
        <span class="material-symbols-outlined pin-icon">storefront</span>
      </div>
      <div class="pin-arrow"></div>
      <div class="pin-shadow"></div>
    </div>
  `,
  iconSize: [40, 48],
  iconAnchor: [20, 48],
})

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    )
    if (res.ok) {
      const data = await res.json()
      const parts = []
      if (data.locality || data.neighbourhood || data.quarter) {
        parts.push(data.locality || data.neighbourhood || data.quarter)
      }
      if (data.city || data.principalSubdivision) {
        parts.push(data.city || data.principalSubdivision)
      }
      if (parts.length > 0) {
        selectedAddress.value = parts.join(', ')
        return
      }
    }
  } catch (err) {
    console.warn('BigDataCloud geocode failed, trying OSM fallback...', err)
  }

  // Fallback to OSM Nominatim
  try {
    const osmRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'en' } }
    )
    if (osmRes.ok) {
      const data = await osmRes.json()
      if (data.display_name) {
        const parts = data.display_name.split(',').slice(0, 3).map((s) => s.trim())
        selectedAddress.value = parts.join(', ')
        return
      }
    }
  } catch (err) {
    console.warn('Nominatim geocode failed', err)
  }

  // Generic fallback if network fails
  selectedAddress.value = `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`
}

function updatePinPosition(lat, lng, shouldPan = false) {
  selectedCoords.value = [lng, lat]
  if (marker) {
    marker.setLatLng([lat, lng])
  }
  if (shouldPan && map) {
    map.panTo([lat, lng])
  }

  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    reverseGeocode(lat, lng)
  }, 350)
}

function initMap() {
  if (!mapContainer.value) return

  // Destroy previous instance if any
  if (map) {
    map.remove()
    map = null
    marker = null
  }

  const initialLng = props.initialCoordinates?.[0] || 73.0188
  const initialLat = props.initialCoordinates?.[1] || 19.0225
  selectedCoords.value = [initialLng, initialLat]
  selectedAddress.value = props.initialAddress || 'Seawoods, Navi Mumbai'

  map = L.map(mapContainer.value, {
    center: [initialLat, initialLng],
    zoom: 16,
    zoomSnap: 0.25,
    zoomControl: true,
    attributionControl: false,
  })

  // Esri World Street Map (Matches resident radar map: clean roads, highways, 0 religious symbols, 0 watermarks, 100% free)
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
  }).addTo(map)

  // Draggable Kitchen Pin Marker
  marker = L.marker([initialLat, initialLng], {
    icon: kitchenPinIcon,
    draggable: true,
  }).addTo(map)

  marker.on('dragend', (e) => {
    const latLng = e.target.getLatLng()
    updatePinPosition(latLng.lat, latLng.lng, false)
  })

  // Map Click to drop/move pin
  map.on('click', (e) => {
    updatePinPosition(e.latlng.lat, e.latlng.lng, true)
  })

  setTimeout(() => {
    map?.invalidateSize()
  }, 200)

  // Reverse geocode initial position if address is empty
  if (!props.initialAddress) {
    reverseGeocode(initialLat, initialLng)
  }
}

function locateMe() {
  if (!('geolocation' in navigator)) {
    alert('Geolocation is not supported by your browser')
    return
  }

  isLocating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude
      const lng = pos.coords.longitude
      if (map) {
        map.flyTo([lat, lng], 17, { duration: 1.2 })
      }
      updatePinPosition(lat, lng, false)
      isLocating.value = false
    },
    (err) => {
      console.warn('Geolocation failed', err.message)
      isLocating.value = false
      alert('Could not access your GPS location. You can drag the pin on the map instead.')
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

function confirmLocation() {
  emit('confirm', {
    coordinates: selectedCoords.value,
    address: selectedAddress.value || 'Seawoods, Navi Mumbai',
  })
  emit('close')
}

function closeModal() {
  emit('close')
}

watch(
  () => props.isOpen,
  async (newVal) => {
    if (newVal) {
      await nextTick()
      initMap()
    } else {
      if (map) {
        map.remove()
        map = null
        marker = null
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
    <Transition name="modal-fade">
      <div v-if="isOpen" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-container">
          <!-- Modal Header -->
          <div class="modal-header">
            <div class="header-left">
              <div class="pin-badge">
                <span class="material-symbols-outlined text-[20px]">pin_drop</span>
              </div>
              <div>
                <h3 class="modal-title">Set Kitchen Pickup Location</h3>
                <p class="modal-subtitle">
                  Tap anywhere on the map or drag the pin to your exact kitchen or stall entrance.
                </p>
              </div>
            </div>
            <button class="close-btn" @click="closeModal" title="Close map">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <!-- Map Viewport -->
          <div class="map-viewport">
            <div ref="mapContainer" class="leaflet-map-canvas"></div>

            <!-- Floating Top-Left Hint -->
            <div class="map-tip-pill">
              <span class="material-symbols-outlined text-[15px]">touch_app</span>
              <span>Tap or drag the pin to set exact entrance</span>
            </div>

            <!-- Floating GPS Button (Bottom-Right of Map) -->
            <button
              type="button"
              class="floating-gps-btn"
              @click="locateMe"
              :disabled="isLocating"
              title="Center on my current GPS location"
            >
              <span class="material-symbols-outlined text-[18px]" :class="{ 'animate-spin': isLocating }">
                my_location
              </span>
              <span>{{ isLocating ? 'Locating...' : 'Use Current GPS' }}</span>
            </button>
          </div>

          <!-- Address Preview Bar -->
          <div class="address-preview-box">
            <div class="address-row">
              <span class="material-symbols-outlined location-icon">location_on</span>
              <div class="address-info">
                <div class="address-label-row">
                  <span class="address-label">Selected Pickup Address</span>
                  <span class="coords-pill">
                    {{ selectedCoords[1].toFixed(5) }}° N, {{ selectedCoords[0].toFixed(5) }}° E
                  </span>
                </div>
                <div class="address-text-wrap">
                  <input
                    v-model="selectedAddress"
                    type="text"
                    class="address-text-input"
                    placeholder="Enter or refine street / landmark name..."
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Actions Footer -->
          <div class="modal-footer">
            <button type="button" class="btn-cancel" @click="closeModal">
              Cancel
            </button>
            <button type="button" class="btn-confirm" @click="confirmLocation">
              <span class="material-symbols-outlined text-[18px]">check_circle</span>
              <span>Confirm Location</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Backdrop */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

/* Modal Window */
.modal-container {
  width: 100%;
  max-width: 720px;
  height: 85vh;
  max-height: 720px;
  background: #ffffff;
  border-radius: 1.5rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.35),
              0 0 0 1px rgba(223, 191, 185, 0.4);
  animation: scaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Header */
.modal-header {
  padding: 1.15rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-bottom: 1px solid #ede8e7;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.pin-badge {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #fdf0ed;
  color: #a93620;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modal-title {
  font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 1.0625rem;
  font-weight: 700;
  color: #151c27;
  margin: 0;
}

.modal-subtitle {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0.15rem 0 0 0;
}

.close-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #4b5563;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.close-btn:hover {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fca5a5;
}

/* Map Viewport */
.map-viewport {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 320px;
}

.leaflet-map-canvas {
  width: 100%;
  height: 100%;
}

.map-tip-pill {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1f2937;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(229, 231, 235, 0.8);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  pointer-events: none;
}

.floating-gps-btn {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  z-index: 1000;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #ffffff;
  color: #a93620;
  border: 1.5px solid #a93620;
  padding: 0.5rem 0.9rem;
  border-radius: 9999px;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(169, 54, 32, 0.25);
  transition: all 0.2s ease;
}

.floating-gps-btn:hover:not(:disabled) {
  background: #a93620;
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(169, 54, 32, 0.35);
}

.floating-gps-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

/* Address Preview Box */
.address-preview-box {
  padding: 0.9rem 1.5rem;
  background: #fdfaf9;
  border-top: 1px solid #ede8e7;
  border-bottom: 1px solid #ede8e7;
}

.address-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.location-icon {
  color: #a93620;
  font-size: 22px;
  margin-top: 0.25rem;
}

.address-info {
  flex: 1;
}

.address-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.address-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6b7280;
}

.coords-pill {
  font-size: 0.7rem;
  font-family: monospace;
  font-weight: 600;
  color: #a93620;
  background: #fee2e2;
  padding: 0.1rem 0.45rem;
  border-radius: 6px;
}

.address-text-input {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 0.4rem 0.65rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
  background: #ffffff;
  outline: none;
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}

.address-text-input:focus {
  border-color: #a93620;
  box-shadow: 0 0 0 3px rgba(169, 54, 32, 0.12);
}

/* Footer Actions */
.modal-footer {
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.85rem;
  background: #ffffff;
}

.btn-cancel {
  padding: 0.65rem 1.15rem;
  border-radius: 0.75rem;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #4b5563;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-cancel:hover {
  background: #f3f4f6;
  color: #111827;
}

.btn-confirm {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 1.35rem;
  border-radius: 0.75rem;
  border: none;
  background: #a93620;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(169, 54, 32, 0.3);
  transition: all 0.2s ease;
}

.btn-confirm:hover {
  background: #952e1a;
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(169, 54, 32, 0.4);
}

.btn-confirm:active {
  transform: scale(0.98);
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>

<style>
/* Global Leaflet Custom Pin Styles (Not Scoped so Leaflet divIcon can style) */
.custom-kitchen-pin-icon {
  background: transparent !important;
  border: none !important;
}

.pin-anchor {
  position: relative;
  width: 40px;
  height: 48px;
  cursor: grab;
}

.pin-anchor:active {
  cursor: grabbing;
}

.pin-pulse {
  position: absolute;
  bottom: 0px;
  left: 50%;
  transform: translateX(-50%);
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(169, 54, 32, 0.3);
  animation: pinPulseRing 2s ease-out infinite;
  pointer-events: none;
}

@keyframes pinPulseRing {
  0% {
    transform: translateX(-50%) scale(0.6);
    opacity: 0.8;
  }
  100% {
    transform: translateX(-50%) scale(2.4);
    opacity: 0;
  }
}

.pin-card {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #a93620;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(169, 54, 32, 0.45),
              0 0 0 2.5px #ffffff;
  z-index: 2;
  transition: transform 0.15s ease;
}

.pin-card:hover {
  transform: translateX(-50%) scale(1.1);
}

.pin-icon {
  font-size: 19px !important;
  color: #ffffff !important;
}

.pin-arrow {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 9px solid #a93620;
  z-index: 1;
}

.pin-shadow {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 16px;
  height: 5px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  filter: blur(1.5px);
  z-index: 0;
}

/* Clean modern map rendering matching resident radar */
.leaflet-container .leaflet-tile {
  filter: saturate(0.85) contrast(1.05) brightness(1.02);
}

/* Prevent any square focus outline */
.leaflet-container,
.leaflet-container svg,
.leaflet-container svg path,
.leaflet-container path,
.leaflet-interactive,
.leaflet-interactive:focus,
.leaflet-pane,
.leaflet-pane:focus {
  outline: none !important;
  box-shadow: none !important;
  -webkit-tap-highlight-color: transparent !important;
}
</style>
