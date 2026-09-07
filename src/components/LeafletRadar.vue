<template>
  <div class="relative w-full h-full rounded-2xl lg:rounded-tl-3xl overflow-hidden shadow-[-8px_0_32px_rgba(0,0,0,0.05)] bg-surface-container flex flex-col flex-1 border border-outline-variant/30">
    <!-- Leaflet Map Div -->
    <div ref="mapContainerRef" class="w-full h-full absolute inset-0 z-0"></div>

    <!-- Top Overlay Badge -->
    <div class="absolute top-4 right-4 z-10 pointer-events-none">
      <div class="bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-md text-xs font-semibold text-on-surface-variant pointer-events-auto flex items-center gap-2 border border-outline-variant/30">
        <span class="material-symbols-outlined text-[15px] text-primary">storefront</span>
        <span>{{ foods.length }} Active {{ foods.length === 1 ? 'Dish' : 'Dishes' }}</span>
      </div>
    </div>

    <!-- Bottom Left: Center On User Button -->
    <div class="absolute bottom-6 left-4 z-10 pointer-events-auto">
      <button
        @click="centerOnUser"
        class="bg-surface/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-outline-variant/30 text-xs font-bold text-on-surface hover:text-primary flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
        title="Center on my location"
      >
        <span class="material-symbols-outlined text-[16px] text-primary">my_location</span>
        <span>My Location</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const props = defineProps({
  userCoords: {
    type: Object,
    default: () => ({ lng: 73.0188, lat: 19.0225 })
  },
  foods: {
    type: Array,
    default: () => []
  },
  radius: {
    type: String,
    default: '500m'
  }
});

const emit = defineEmits(['select-food', 'update-location']);

const mapContainerRef = ref(null);
let map = null;
let userMarker = null;
let radiusCircle = null;
let foodLayerGroup = null;

function getMetersFromRadius(radiusStr) {
  if (radiusStr === '1km') return 1000;
  if (radiusStr === '3km') return 3000;
  return 500;
}

function updateRadiusView(animate = true) {
  if (!map) return;
  const lat = props.userCoords?.lat || 19.0225;
  const lng = props.userCoords?.lng || 73.0188;
  const meters = getMetersFromRadius(props.radius);

  if (radiusCircle) {
    radiusCircle.setLatLng([lat, lng]);
    radiusCircle.setRadius(meters);
  } else {
    radiusCircle = L.circle([lat, lng], {
      radius: meters,
      color: '#a93620',
      weight: 2,
      dashArray: '6, 6',
      fillColor: '#a93620',
      fillOpacity: 0.08,
      interactive: false // Prevents the circle from showing a square focus outline on click
    }).addTo(map);
  }

  const bounds = radiusCircle.getBounds();
  map.fitBounds(bounds, {
    padding: [30, 30],
    animate: animate,
    duration: animate ? 0.6 : 0
  });
}

function centerOnUser() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        emit('update-location', { lat, lng });
        if (map) {
          if (userMarker) {
            userMarker.setLatLng([lat, lng]);
          }
          if (radiusCircle) {
            radiusCircle.setLatLng([lat, lng]);
            map.fitBounds(radiusCircle.getBounds(), { padding: [30, 30], animate: true });
          } else {
            map.setView([lat, lng], 16, { animate: true });
          }
        }
      },
      () => {
        if (map && radiusCircle) {
          map.fitBounds(radiusCircle.getBounds(), { padding: [30, 30], animate: true });
        }
      },
      { enableHighAccuracy: true }
    );
  } else if (map && radiusCircle) {
    map.fitBounds(radiusCircle.getBounds(), { padding: [30, 30], animate: true });
  }
}

function createUserMarker() {
  if (!map) return;
  if (userMarker) {
    userMarker.remove();
  }

  const { lat, lng } = props.userCoords;

  const icon = L.divIcon({
    className: 'leaflet-user-marker-wrapper',
    html: `
      <div class="user-radar-marker">
        <div class="radar-ping"></div>
        <div class="radar-core">
          <span class="material-symbols-outlined" style="font-size: 14px; color: white;">person_pin_circle</span>
        </div>
        <div class="user-label">You</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  userMarker = L.marker([lat, lng], { icon }).addTo(map);
}

function updateFoodMarkers() {
  if (!map || !foodLayerGroup) return;

  foodLayerGroup.clearLayers();

  props.foods.forEach((food, index) => {
    const baseCoords =
      food.location?.coordinates ||
      food.vendor?.location?.coordinates ||
      [73.0198, 19.0308];

    // GeoJSON is [lng, lat], Leaflet is [lat, lng]
    const [lng, lat] = baseCoords;

    const icon = L.divIcon({
      className: 'leaflet-food-marker-wrapper',
      html: `
        <div class="food-mapbox-marker group">
          <div class="marker-card">
            <img src="${food.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}" class="marker-thumb" />
            <div class="marker-info">
              <div class="marker-name">${food.name}</div>
              <div class="marker-sub">
                <span class="marker-price">₹${food.price}</span>
                <span class="marker-stock">• ${food.quantity || 1} left</span>
              </div>
            </div>
          </div>
          <div class="marker-pointer"></div>
        </div>
      `,
      iconSize: [160, 50],
      iconAnchor: [80, 50]
    });

    const marker = L.marker([lat, lng], { icon });
    marker.on('click', () => {
      emit('select-food', food);
    });

    foodLayerGroup.addLayer(marker);
  });
}

onMounted(() => {
  const centerLat = props.userCoords?.lat || 19.0225;
  const centerLng = props.userCoords?.lng || 73.0188;

  map = L.map(mapContainerRef.value, {
    center: [centerLat, centerLng],
    zoom: 16,
    zoomControl: true
  });

  // OpenStreetMap free tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  foodLayerGroup = L.layerGroup().addTo(map);

  createUserMarker();
  updateFoodMarkers();
  updateRadiusView(false);

  // Fresh load: focus specifically on 500m around user
  setTimeout(() => {
    map?.invalidateSize();
    updateRadiusView(false);
  }, 200);

  setTimeout(() => {
    map?.invalidateSize();
  }, 600);

  // Auto-resize when container changes
  if (window.ResizeObserver && mapContainerRef.value) {
    const ro = new ResizeObserver(() => {
      map?.invalidateSize();
    });
    ro.observe(mapContainerRef.value);
  }
});

watch(
  () => props.radius,
  () => {
    updateRadiusView(true);
  }
);

watch(
  () => props.foods,
  () => {
    updateFoodMarkers();
  },
  { deep: true }
);

watch(
  () => props.userCoords,
  (newCoords) => {
    if (newCoords && map) {
      createUserMarker();
      updateRadiusView(false);
    }
  },
  { deep: true }
);

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>

<style>
/* Unscoped styles for custom HTML divIcons */
.leaflet-user-marker-wrapper,
.leaflet-food-marker-wrapper {
  background: transparent !important;
  border: none !important;
}

.user-radar-marker {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.radar-ping {
  position: absolute;
  width: 48px;
  height: 48px;
  border-radius: 9999px;
  background-color: rgba(169, 54, 32, 0.35);
  animation: leaflet-pulse 2s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.radar-core {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 9999px;
  background-color: #a93620;
  border: 3px solid #ffffff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.user-label {
  position: absolute;
  top: 30px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(4px);
  color: #1a1a1a;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.food-mapbox-marker {
  position: relative;
  cursor: pointer;
  transform: translate3d(0, 0, 0);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.food-mapbox-marker:hover {
  transform: scale(1.08) translateY(-4px);
  z-index: 9999 !important;
}

.marker-card {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(8px);
  padding: 5px 8px 5px 5px;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
  border: 1.5px solid rgba(169, 54, 32, 0.35);
}

.marker-thumb {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  object-fit: cover;
}

.marker-info {
  display: flex;
  flex-direction: column;
  max-width: 105px;
}

.marker-name {
  font-size: 11px;
  font-weight: 700;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.marker-sub {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px;
}

.marker-price {
  font-size: 11px;
  font-weight: 800;
  color: #a93620;
}

.marker-stock {
  font-size: 9px;
  font-weight: 700;
  color: #16a34a;
}

.marker-pointer {
  width: 0;
  height: 0;
  margin: 0 auto;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #a93620;
}

@keyframes leaflet-pulse {
  0% {
    transform: scale(0.6);
    opacity: 1;
  }
  100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

/* Prevent any square focus outline around the SVG circle path or map container */
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
