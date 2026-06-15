import { ref } from "vue";

export function useDragDivider(builderEl: ReturnType<typeof ref<HTMLElement | null>>) {
  const splitPercent = ref(40);
  const dragging = ref(false);

  function startDrag() {
    dragging.value = true;
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
  }

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

  function stopDrag() {
    dragging.value = false;
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", stopDrag);
  }

  return { splitPercent, dragging, startDrag };
}
