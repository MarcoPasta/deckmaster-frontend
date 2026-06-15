import { ref } from "vue";

type AnyCard = unknown;

export function useMobileInteractions(
  isMobile: ReturnType<typeof ref<boolean>>,
  cardKey: (card: AnyCard) => string,
  getCardImage: (card: AnyCard) => string,
  addCard: (card: AnyCard) => void,
) {
  const mobileThumbnail = ref<string | null>(null);

  let lastTapTime = 0;
  let lastTapCard: AnyCard | null = null;
  let touchDidScroll = false;
  let previewTimer: ReturnType<typeof setTimeout> | null = null;

  function onTouchStart() {
    touchDidScroll = false;
  }

  function onTouchMove() {
    touchDidScroll = true;
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = null;
    }
  }

  function onMobileTap(card: AnyCard) {
    if (!isMobile.value || touchDidScroll) return;
    const now = Date.now();
    const key = cardKey(card);
    const lastKey = lastTapCard ? cardKey(lastTapCard) : null;
    if (lastKey === key && now - lastTapTime < 400) {
      if (previewTimer) {
        clearTimeout(previewTimer);
        previewTimer = null;
      }
      mobileThumbnail.value = null;
      addCard(card);
      lastTapCard = null;
      lastTapTime = 0;
    } else {
      lastTapCard = card;
      lastTapTime = now;
      if (previewTimer) clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        mobileThumbnail.value = getCardImage(card);
        previewTimer = null;
      }, 400);
    }
  }

  function onMobileOverlayTap() {
    const now = Date.now();
    if (lastTapCard && now - lastTapTime < 400) {
      addCard(lastTapCard);
      mobileThumbnail.value = null;
      lastTapCard = null;
      lastTapTime = 0;
    } else {
      mobileThumbnail.value = null;
      lastTapCard = null;
    }
  }

  return {
    mobileThumbnail,
    onTouchStart,
    onTouchMove,
    onMobileTap,
    onMobileOverlayTap,
  };
}
