<script setup lang="ts">
/**
 * VirtualCardGrid — a virtualised scrolling grid for large card catalogues.
 *
 * Uses TanStack Virtual to render only the rows currently in the viewport,
 * keeping the DOM size constant regardless of how many cards the server
 * returns.  Cards are laid out in a CSS Grid whose column count is
 * determined either by `targetCardWidth` (fluid, container-based) or falls
 * back to fixed breakpoint values.
 *
 * Slots:
 * - `#card({ card, index })` — required; renders a single card cell.
 * - `#header`               — optional; rendered above the virtual list.
 * - `#footer`               — optional; rendered below the virtual list
 *   (used by BuilderView for the Naruto mission card section).
 *
 * Exposed methods:
 * - `scrollToTop()` — scroll the grid back to the first row (called when
 *   the search query or active filter changes).
 */
import { useVirtualizer } from "@tanstack/vue-virtual";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useDisplay } from "vuetify";

const props = withDefaults(
  defineProps<{
    /** Full card array (all items, not just the visible slice). */
    cards: unknown[];
    /** Row height estimate in pixels when `targetCardWidth` is not set. */
    estimateSize?: number;
    /**
     * Target pixel width for each card cell.  When > 0 the grid calculates
     * the column count from the actual container width so columns are always
     * as close to this width as possible.  When 0 fixed breakpoints are used.
     */
    targetCardWidth?: number;
    /** Horizontal gap between card cells in pixels. */
    colGap?: number;
    /** Vertical gap between rows in pixels (added to the estimated row height). */
    rowGap?: number;
    /** Extra padding at the top of the scrollable list in pixels. */
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
  /** Emitted when a card cell is clicked. */
  "card-click": [card: unknown, index: number];
}>();

defineSlots<{
  card(props: { card: unknown; index: number }): unknown;
  header?(): unknown;
  footer?(): unknown;
}>();

/** Template ref for the scrolling container element. */
const cardGridEl = ref<HTMLElement | null>(null);
const { smAndDown, xs } = useDisplay();
/** `true` on narrow screens (smAndDown) — switches to fewer columns. */
const isNarrow = smAndDown;
/** `true` on mobile (xs) — minimal column count for thumb-friendly tap targets. */
const isMobile = xs;

/**
 * Observed pixel width of the container element.
 * Updated by a `ResizeObserver` so column counts are always correct even
 * when the container resizes without a window resize event (e.g. the split
 * divider being dragged in BuilderView).
 */
const containerWidth = ref(0);

/**
 * Number of columns in the grid.
 *
 * When `targetCardWidth` is set: fluid — derived from `containerWidth`.
 * Otherwise: fixed breakpoints based on Vuetify display helpers.
 */
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

/**
 * Height of each virtual row in pixels.
 *
 * When `targetCardWidth` is set: derived from the actual column width and
 * the 5:7 card aspect ratio plus `rowGap`.
 * Otherwise: `estimateSize` prop.
 */
const itemSize = computed(() => {
  if (props.targetCardWidth > 0 && containerWidth.value > 0) {
    const cols = columnCount.value;
    const colWidth = (containerWidth.value - props.colGap * (cols - 1)) / cols;
    // Cards have a portrait 5:7 aspect ratio; add rowGap for inter-row spacing.
    return colWidth * (7 / 5) + props.rowGap;
  }
  return props.estimateSize;
});

/** Re-measure the virtualiser when the window resizes. */
function onResize() {
  rowVirtualizer.value.measure();
}

onMounted(() => window.addEventListener("resize", onResize));
onUnmounted(() => window.removeEventListener("resize", onResize));

/** Total number of virtual rows needed to display all cards. */
const rowCount = computed(() =>
  Math.ceil(props.cards.length / columnCount.value),
);

/**
 * TanStack row virtualiser.
 *
 * `overscan: 3` renders three extra rows above and below the viewport to
 * prevent visible blank rows during fast scrolling.
 */
const rowVirtualizer = useVirtualizer(
  computed(() => ({
    count: rowCount.value,
    getScrollElement: () => cardGridEl.value,
    estimateSize: () => itemSize.value,
    overscan: 3,
    paddingStart: props.paddingStart,
  })),
);

/**
 * Watch the container element and attach a ResizeObserver so `containerWidth`
 * stays accurate when the parent pane is resized (e.g. drag-divider).
 * The `cleanup` callback disconnects the observer on component unmount.
 */
watch(cardGridEl, (el, _prev, cleanup) => {
  if (el) containerWidth.value = el.clientWidth;
  const observer = new ResizeObserver(() => {
    if (cardGridEl.value) containerWidth.value = cardGridEl.value.clientWidth;
    rowVirtualizer.value.measure();
  });
  if (el) observer.observe(el);
  cleanup(() => observer.disconnect());
});

/** Returns the card at a given row + column position, or `undefined` for
 *  empty cells in the last partial row. */
function getCardAtPosition(
  rowIndex: number,
  colIndex: number,
): unknown | undefined {
  return props.cards[rowIndex * columnCount.value + colIndex];
}

/** Scroll the grid back to position 0 (called on filter/search changes). */
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
          (el: Element | null) => el && rowVirtualizer.measureElement(el as HTMLElement)
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
