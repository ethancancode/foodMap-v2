<template>
  <div class="food-mapbox-marker group">
    <div class="marker-card">
      <img
        :src="food.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'"
        :alt="food.name"
        class="marker-thumb"
      />
      <div class="marker-info">
        <div class="marker-name">{{ food.name }}</div>
        <div class="marker-sub">
          <span class="marker-price">₹{{ food.price }}</span>
          <span class="marker-stock">• {{ food.quantity || 1 }} left</span>
        </div>
      </div>
    </div>
    <div class="marker-pointer"></div>
  </div>
</template>

<script setup>
defineProps({
  food: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
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
</style>
