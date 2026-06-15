<script setup lang="ts">
defineProps<{
  visible: boolean;
  image: string;
  position: { x: number; y: number };
}>();
</script>

<template>
  <div
    v-if="visible && image"
    class="card-tooltip"
    :style="{ top: position.y + 'px', left: position.x + 'px' }"
  >
    <img :src="image" class="card-tooltip-img" />
  </div>
</template>

<style scoped>
.card-tooltip {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  width: 300px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.card-tooltip-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 8px;
}

@media (max-width: 480px) {
  .card-tooltip {
    display: none;
  }
}
</style>
