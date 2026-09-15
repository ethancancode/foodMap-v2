<template>
  <div class="food-mapbox-marker group" :class="{ 'is-stack': totalCount > 1 }">
    <!-- Visual stack background layer cards if multiple dishes exist -->
    <div v-if="totalCount > 1" class="marker-card-underlay-2"></div>
    <div v-if="totalCount > 1" class="marker-card-underlay-1"></div>

    <div class="marker-card">
      <div class="thumb-wrapper">
        <img
          :src="food.image || DEFAULT_FOOD_SVG"
          :alt="food.name"
          class="marker-thumb"
        />
        <div v-if="totalCount > 1" class="stack-badge-icon" :title="`${totalCount} dishes available here`">
          <span class="material-symbols-outlined text-[10px]">layers</span>
        </div>
      </div>

      <div class="marker-info">
        <div class="marker-name">{{ food.name }}</div>
        <div class="marker-sub">
          <span class="marker-price">₹{{ food.price }}</span>
          <span class="marker-stock">• {{ food.quantity || 1 }} left</span>
        </div>
      </div>

      <!-- If 2+ dishes, show '+N more' pill; if only 1 dish, show Pickup / Delivery badge -->
      <div class="marker-meta-col">
        <span v-if="totalCount > 1" class="marker-stack-pill">+{{ totalCount - 1 }} more</span>
        <template v-else>
          <div
            v-if="food.fulfillmentOptions === 'PICKUP_ONLY'"
            class="marker-badge pickup"
            title="Pickup Only"
          >
            Pickup
          </div>
          <div
            v-else-if="food.fulfillmentOptions === 'DELIVERY_ONLY'"
            class="marker-badge delivery"
            title="Delivery Only"
          >
            Delivery
          </div>
          <div
            v-else
            class="marker-badge both"
            title="Pickup & Delivery"
          >
            Pickup
          </div>
        </template>
      </div>
    </div>
    <div class="marker-pointer"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { DEFAULT_FOOD_SVG } from '../utils/defaultFoodImage.js'

const props = defineProps({
  food: {
    type: Object,
    required: true
  },
  count: {
    type: Number,
    default: 1
  },
  allFoods: {
    type: Array,
    default: () => []
  }
})

const totalCount = computed(() => {
  if (props.allFoods && props.allFoods.length > 0) {
    return props.allFoods.length
  }
  return props.count || 1
})
</script>

<style scoped>
.food-mapbox-marker {
  position: relative;
  cursor: pointer;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  user-select: none;
}

.food-mapbox-marker:hover {
  transform: scale(1.06) translateY(-3px);
  z-index: 9999 !important;
}

.marker-card {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  padding: 4px 6px 4px 4px;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14), 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1.5px solid rgba(169, 54, 32, 0.35);
  position: relative;
  z-index: 2;
  white-space: nowrap;
}

.thumb-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  min-width: 26px;
  max-width: 26px;
  border-radius: 6px;
  overflow: visible;
  flex-shrink: 0;
}

.marker-thumb {
  width: 26px;
  height: 26px;
  max-width: 26px;
  max-height: 26px;
  border-radius: 6px;
  object-fit: cover;
  background: #fdfaf9;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: block;
}

.stack-badge-icon {
  position: absolute;
  top: -4px;
  left: -4px;
  background: #a93620;
  color: white;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  z-index: 5;
}

.marker-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 105px;
  line-height: 1.1;
}

.marker-name {
  font-size: 11px;
  font-weight: 700;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.marker-sub {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 1px;
  line-height: 1;
}

.marker-price {
  font-size: 10.5px;
  font-weight: 800;
  color: #a93620;
}

.marker-stock {
  font-size: 8.5px;
  font-weight: 700;
  color: #16a34a;
}

.marker-meta-col {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 2px;
}

.marker-stack-pill {
  font-size: 8.5px;
  font-weight: 800;
  color: #a93620;
  background: rgba(169, 54, 32, 0.1);
  border: 1px solid rgba(169, 54, 32, 0.25);
  padding: 1.5px 5px;
  border-radius: 5px;
  line-height: 1.1;
  white-space: nowrap;
}

.marker-badge {
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1.5px 5px;
  border-radius: 5px;
  white-space: nowrap;
  line-height: 1.1;
}

.marker-badge.pickup,
.marker-badge.both {
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fde68a;
}

.marker-badge.delivery {
  background: #dbeafe;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.marker-card-underlay-1 {
  position: absolute;
  top: -2.5px;
  left: 2px;
  right: -2px;
  bottom: 8px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  border: 1px solid rgba(169, 54, 32, 0.25);
  z-index: 1;
  pointer-events: none;
}

.marker-card-underlay-2 {
  position: absolute;
  top: -5px;
  left: 4px;
  right: -4px;
  bottom: 10px;
  background: rgba(255, 255, 255, 0.55);
  border-radius: 12px;
  border: 1px solid rgba(169, 54, 32, 0.15);
  z-index: 0;
  pointer-events: none;
}

.marker-pointer {
  width: 0;
  height: 0;
  margin: 0 auto;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #a93620;
  position: relative;
  z-index: 2;
}
</style>
