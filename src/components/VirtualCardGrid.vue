<script setup lang="ts">
import { useVirtualizer } from "@tanstack/vue-virtual";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    cards: unknown[];
    estimateSize?: number;
    targetCardWidth?: number;
    colGap?: number;
    rowGap?: number;
    paddingStart?: number;
  }>(),
  {
    estimateSize: 200,
    targetCardWidth: 0,
    colGap: 8,
    rowGap: 10,
    paddingStart: 0,
  },
);

const emit = defineEmits<{
  "card-click": [card: unknown, index: number];
}>();

defineSlots<{
  card(props: { card: unknown; index: number }): unknown;
  header?(): unknown;
  footer?(): unknown;
}>();

const cardGridEl = ref<HTMLElement | null>(null);
const isNarrow = ref(window.innerWidth < 1280);
const isMobile = ref(window.innerWidth <= 480);
const containerWidth = ref(0);

const columnCount = computed(() => {
  if (props.targetCardWidth > 0 && containerWidth.value > 0) {
    return Math.max(
      3,
      Math.floor(
        (containerWidth.value + props.colGap) / (props.targetCardWidth + props.colGap),
      ),
    );
  }
  if (isMobile.value) return 4;
  if (isNarrow.value) return 7;
  return 9;
});

const itemSize = computed(() => {
  if (props.targetCardWidth > 0 && containerWidth.value > 0) {
    const cols = columnCount.value;
    const colWidth = (containerWidth.value - props.colGap * (cols - 1)) / cols;
    return colWidth * (7 / 5) + props.rowGap;
  }
  return props.estimateSize;
});

function onResize() {
  isNarrow.value = window.innerWidth < 1280;
  isMobile.value = window.innerWidth <= 480;
  rowVirtualizer.value.measure();
}

onMounted(() => window.addEventListener("resize", onResize));
onUnmounted(() => window.removeEventListener("resize", onResize));

const rowCount = computed(() =>
  Math.ceil(props.cards.length / columnCount.value),
);

const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: rowCount.value,
    getScrollElement: () => cardGridEl.value,
    estimateSize: () => itemSize.value,
    overscan: 3,
    paddingStart: props.paddingStart,
  })),
);

watch(cardGridEl, (el, _prev, cleanup) => {
  if (el) containerWidth.value = el.clientWidth;
  const observer = new ResizeObserver(() => {
    if (cardGridEl.value) containerWidth.value = cardGridEl.value.clientWidth;
    rowVirtualizer.value.measure();
  });
  if (el) observer.observe(el);
  cleanup(() => observer.disconnect());
});

function getCardAtPosition(
  rowIndex: number,
  colIndex: number,
): unknown | undefined {
  return props.cards[rowIndex * columnCount.value + colIndex];
}

function scrollToTop() {
  if (cardGridEl.value) cardGridEl.value.scrollTop = 0;
}

defineExpose({ scrollToTop, columnCount });
</script>

<template>
  <div ref="cardGridEl" class="card-grid">
    <slot name="header" />
    <div
      :style="{
        height: rowVirtualizer.getTotalSize() + 'px',
        position: 'relative',
      }"
    >
      <div
        v-for="virtualRow in rowVirtualizer.getVirtualItems()"
        :key="virtualRow.index"
        :ref="
          (el: any) => el && rowVirtualizer.measureElement(el)
        "
        :data-index="virtualRow.index"
        class="virtual-row"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${virtualRow.start}px)`,
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          columnGap: `${colGap}px`,
        }"
      >
        <template v-for="col in columnCount" :key="col">
          <div
            v-if="getCardAtPosition(virtualRow.index, col - 1)"
            class="card-slot"
            @click="
              emit(
                'card-click',
                getCardAtPosition(virtualRow.index, col - 1)!,
                virtualRow.index * columnCount + (col - 1),
              )
            "
          >
            <slot
              name="card"
              :card="getCardAtPosition(virtualRow.index, col - 1)!"
              :index="virtualRow.index * columnCount + (col - 1)"
            />
          </div>
          <div v-else class="card-slot" />
        </template>
      </div>
    </div>
    <slot name="footer" />
  </div>
</template>

<style scoped>
.card-grid {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

.virtual-row {
  display: grid;
  align-items: start;
  gap: 8px;
  padding-bottom: 12px;
  box-sizing: border-box;
}

@media (max-width: 1279px) {
  .virtual-row {
    gap: 6px;
    padding-bottom: 8px;
  }
}

@media (max-width: 480px) {
  .virtual-row {
    gap: 4px;
    padding-bottom: 4px;
  }
}

.card-slot {
  aspect-ratio: 5 / 7;
  cursor: pointer;
  min-width: 0;
  overflow: hidden;
  border-radius: 4px;
}
</style>
