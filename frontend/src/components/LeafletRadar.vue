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

    <!-- Bottom Left: Controls Row (My Location & Toggle Ruia / Original Position) -->
    <div class="absolute bottom-6 left-4 z-10 pointer-events-auto flex items-center gap-2">
      <button
        @click="centerOnUser"
        class="bg-surface/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-outline-variant/30 text-xs font-bold text-on-surface hover:text-primary flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
        title="Center on my location"
      >
        <span class="material-symbols-outlined text-[16px] text-primary">my_location</span>
        <span>My Location</span>
      </button>

      <button
        v-if="!isAtRuia"
        @click="goToRuiaCollege"
        class="bg-surface/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-primary/30 text-xs font-bold text-primary hover:bg-primary/10 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
        title="Jump to Ramnarain Ruia College, Matunga (Demo)"
      >
        <span class="material-symbols-outlined text-[16px]">school</span>
        <span>Ruia College (Demo)</span>
      </button>

      <button
        v-else
        @click="backToOriginalPosition"
        class="bg-surface/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-lg border border-primary/30 text-xs font-bold text-primary hover:bg-primary/10 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
        title="Return to original home location"
      >
        <span class="material-symbols-outlined text-[16px]">undo</span>
        <span>Original Position</span>
      </button>
    </div>

    <!-- Multi-Dish Cluster Bottom Drawer / Modal -->
    <Transition name="slide-up">
      <div
        v-if="selectedCluster"
        class="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 max-h-[75vh] bg-surface/95 backdrop-blur-xl border border-outline-variant/40 rounded-2xl shadow-2xl z-30 flex flex-col overflow-hidden animate-in"
      >
        <!-- Header -->
        <div class="p-3.5 bg-surface-container-high/60 border-b border-outline-variant/20 flex items-center justify-between">
          <div class="flex items-center gap-2 overflow-hidden">
            <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[18px]">soup_kitchen</span>
            </div>
            <div class="truncate">
              <h3 class="text-xs font-bold text-on-surface truncate">
                {{ selectedCluster.vendorNames?.length === 1 ? selectedCluster.vendorNames[0] : `${selectedCluster.vendorNames?.length} Nearby Kitchens` }}
              </h3>
              <p class="text-[11px] text-on-surface-variant flex items-center gap-1 font-medium">
                <span class="text-primary font-bold">{{ selectedCluster.items.length }} dishes</span> available right here
              </p>
            </div>
          </div>
          <button
            @click="selectedCluster = null"
            class="w-7 h-7 rounded-full bg-surface hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface border border-outline-variant/30 transition-colors cursor-pointer"
            title="Close"
          >
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <!-- Dishes List -->
        <div class="overflow-y-auto max-h-[50vh] p-2.5 space-y-2 divide-y divide-outline-variant/10">
          <div
            v-for="item in selectedCluster.items"
            :key="item._id || item.id"
            @click="handleSelectClusterDish(item)"
            class="pt-2 first:pt-0 flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-surface-container transition-all cursor-pointer group"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <img
                :src="item.image || DEFAULT_FOOD_SVG"
                :alt="item.name"
                class="w-12 h-12 rounded-lg object-cover shrink-0 border border-outline-variant/20"
              />
              <div class="min-w-0">
                <div class="text-xs font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                  {{ item.name }}
                </div>
                <div class="text-[10.5px] text-on-surface-variant truncate font-medium">
                  by {{ item.vendorName || item.vendor?.businessName || item.vendor?.name || 'Home Kitchen' }}
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs font-extrabold text-primary">₹{{ item.price }}</span>
                  <span class="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.2 rounded">
                    {{ item.quantity || 1 }} left
                  </span>
                  <span
                    v-if="item.fulfillmentOptions === 'PICKUP_ONLY'"
                    class="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded uppercase"
                  >
                    Pickup
                  </span>
                  <span
                    v-else-if="item.fulfillmentOptions === 'DELIVERY_ONLY'"
                    class="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1 py-0.2 rounded uppercase"
                  >
                    Delivery
                  </span>
                </div>
                <div class="flex items-center gap-1.5 mt-1 text-[10px] text-on-surface-variant">
                  <span v-if="item.diet" :class="item.diet === 'veg' ? 'text-green-600 font-bold' : 'text-red-500 font-bold'">
                    ● {{ item.diet === 'veg' ? 'Veg' : 'Non-veg' }}
                  </span>
                  <span v-if="item.cookingStatus" class="truncate">• {{ item.cookingStatus }}</span>
                </div>
              </div>
            </div>

            <button
              class="shrink-0 px-2.5 py-1.5 rounded-lg bg-primary/10 group-hover:bg-primary text-primary group-hover:text-on-primary text-[11px] font-bold transition-all flex items-center gap-1"
            >
              <span>View</span>
              <span class="material-symbols-outlined text-[13px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, createVNode, render } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapDishPin from './MapDishPin.vue';
import { DEFAULT_FOOD_SVG } from '../utils/defaultFoodImage.js';

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
const selectedCluster = ref(null);
let map = null;
let userMarker = null;
let radiusCircle = null;
let foodLayerGroup = null;

function getMetersFromRadius(radiusStr) {
  if (radiusStr === '1km') return 1000;
  if (radiusStr === '3km') return 3000;
  return 500;
}

function handleSelectClusterDish(dish) {
  selectedCluster.value = null;
  emit('select-food', dish);
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

const RUIA_LAT = 19.02298;
const RUIA_LNG = 72.85592;

const isAtRuia = computed(() => {
  const lat = props.userCoords?.lat;
  const lng = props.userCoords?.lng;
  if (!lat || !lng) return false;
  return Math.abs(lat - RUIA_LAT) < 0.005 && Math.abs(lng - RUIA_LNG) < 0.005;
});

function goToRuiaCollege() {
  const lat = RUIA_LAT;
  const lng = RUIA_LNG;
  emit('update-location', { lat, lng });
  if (map) {
    if (userMarker) {
      userMarker.setLatLng([lat, lng]);
    }
    if (radiusCircle) {
      radiusCircle.setLatLng([lat, lng]);
      map.fitBounds(radiusCircle.getBounds(), { padding: [30, 30], animate: true });
    } else {
      map.flyTo([lat, lng], 17, { duration: 1.0 });
    }
  }
}

function backToOriginalPosition() {
  emit('update-location', null);
  centerOnUser();
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

  // Cluster nearby dishes within ~30 meters (0.0003 deg latitude/longitude)
  // so any dishes or vendors very close to each other are grouped cleanly instead of overlapping
  const PROXIMITY_THRESHOLD_DEG = 0.0003;
  const clusters = [];

  props.foods.forEach((food) => {
    const baseCoords =
      food.location?.coordinates ||
      food.vendor?.location?.coordinates ||
      [73.0198, 19.0308];

    // GeoJSON is [lng, lat], Leaflet is [lat, lng]
    const [lng, lat] = baseCoords;
    const vendorName = food.vendorName || (typeof food.vendor === 'object' ? food.vendor?.businessName || food.vendor?.name : null) || 'Home Kitchen';

    // Check if this dish fits into an existing proximity cluster
    let matchedCluster = clusters.find((c) => {
      const dLat = Math.abs(c.lat - lat);
      const dLng = Math.abs(c.lng - lng);
      return dLat < PROXIMITY_THRESHOLD_DEG && dLng < PROXIMITY_THRESHOLD_DEG;
    });

    if (matchedCluster) {
      matchedCluster.items.push(food);
      if (!matchedCluster.vendorNames.includes(vendorName)) {
        matchedCluster.vendorNames.push(vendorName);
      }
    } else {
      clusters.push({
        lat,
        lng,
        vendorNames: [vendorName],
        items: [food]
      });
    }
  });

  // Render a marker for each unique cluster
  clusters.forEach((cluster) => {
    const primaryFood = cluster.items[0];
    const totalCount = cluster.items.length;

    // Create container and mount MapDishPin with stack indicator
    const el = document.createElement('div');
    const vnode = createVNode(MapDishPin, {
      food: primaryFood,
      count: totalCount,
      allFoods: cluster.items
    });
    render(vnode, el);

    const icon = L.divIcon({
      className: 'leaflet-food-marker-wrapper',
      html: el,
      iconSize: [180, 50],
      iconAnchor: [90, 46]
    });

    const marker = L.marker([cluster.lat, cluster.lng], { icon });

    marker.on('click', () => {
      if (cluster.items.length > 1) {
        selectedCluster.value = cluster;
      } else {
        selectedCluster.value = null;
        emit('select-food', primaryFood);
      }
    });

    foodLayerGroup.addLayer(marker);
  });
}

onMounted(() => {
  const centerLat = props.userCoords?.lat || 19.0225;
  const centerLng = props.userCoords?.lng || 73.0188;

  map = L.map(mapContainerRef.value, {
    center: [centerLat, centerLng],
    zoom: 17,
    maxZoom: 18.5,
    minZoom: 12,
    zoomSnap: 0.25,
    zoomControl: true,
    attributionControl: false
  });

  // Esri World Street Map (Native tiles up to level 18; maxNativeZoom scales tiles up cleanly without showing 'Map data not yet available' blank tiles)
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    maxNativeZoom: 18
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

/* Clean modern map rendering */
.leaflet-container .leaflet-tile {
  filter: saturate(0.85) contrast(1.05) brightness(1.02);
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

/* Drawer slide transition */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(20px) scale(0.97);
  opacity: 0;
}
</style>
