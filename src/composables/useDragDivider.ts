import { ref } from "vue";

/**
 * Composable that turns the divider bar between the deck panel and the card
 * pool into a drag handle, letting the user resize both panes.
 *
 * Works in both orientations:
 * - **Horizontal** (≥1366 px wide): drag left/right.
 * - **Vertical** (<1366 px wide, stacked layout): drag up/down.
 *
 * @param builderEl - Template ref for the outer `.builder` container element.
 *   The composable measures this element to convert a raw mouse position into
 *   a percentage split.
 */
export function useDragDivider(builderEl: ReturnType<typeof ref<HTMLElement | null>>) {
  /**
   * The width (horizontal) or height (vertical) percentage allocated to the
   * left / top pane.  Bound to a CSS custom property `--split` on the
   * container so both panels update reactively.
   *
   * Clamped to [30 %, 60 %] horizontally and [35 %, 60 %] vertically so the
   * panels never become unusably small.
   */
  const splitPercent = ref(40);

  /** True while the user is actively dragging; used to apply `user-select: none`. */
  const dragging = ref(false);

  /** Attaches mousemove / mouseup listeners and sets `dragging = true`. */
  function startDrag() {
    dragging.value = true;
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
  }

  /**
   * Recalculates `splitPercent` on every mouse move during a drag.
   * The orientation is determined by window width at the time of each event
   * so resizing the window mid-drag still behaves correctly.
   */
  function onDrag(e: MouseEvent) {
    if (!dragging.value || !builderEl.value) return;
    const rect = builderEl.value.getBoundingClientRect();
    const isVertical = window.innerWidth < 1366;
    let percent: number;
    if (isVertical) {
      percent = ((e.clientY - rect.top) / rect.height) * 100;
      splitPercent.value = Math.max(35, Math.min(60, percent));
    } else {
      percent = ((e.clientX - rect.left) / rect.width) * 100;
      splitPercent.value = Math.max(30, Math.min(60, percent));
    }
  }

  /** Cleans up document listeners once the mouse button is released. */
  function stopDrag() {
    dragging.value = false;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
  }

  return { splitPercent, dragging, startDrag };
}
