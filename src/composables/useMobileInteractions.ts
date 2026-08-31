import { ref } from "vue";

type AnyCard = unknown;

/**
 * Composable that handles card interaction gestures on touch devices.
 *
 * Desktop users click a card to add it to the deck.  On mobile (no hover),
 * this composable implements a **double-tap** pattern instead:
 *
 * 1. **First tap** — shows a full-screen thumbnail preview of the card and
 *    starts a 400 ms timer.  If the user taps the overlay within the window,
 *    the card is added immediately (see `onMobileOverlayTap`).
 * 2. **Second tap on the same card within 400 ms** — adds the card to the
 *    deck without waiting for the overlay.
 * 3. **Scroll during a tap** — `onTouchMove` cancels the pending preview
 *    so scrolling the grid never accidentally adds cards.
 *
 * @param isMobile - Reactive boolean; interactions are only handled when true.
 * @param cardKey - Returns a stable string identifier for a card (used to
 *   detect double-taps on the same card).
 * @param getCardImage - Returns the image URL for a card (used to populate
 *   the full-screen preview).
 * @param addCard - Callback to add the card to the current deck.
 */
export function useMobileInteractions(
  isMobile: ReturnType<typeof ref<boolean>>,
  cardKey: (card: AnyCard) => string,
  getCardImage: (card: AnyCard) => string,
  addCard: (card: AnyCard) => void,
) {
  /** Image URL of the card currently displayed in the full-screen overlay, or
   *  `null` when the overlay is hidden. */
  const mobileThumbnail = ref<string | null>(null);

  /** Timestamp (ms) of the most recent tap, used to detect double-taps. */
  let lastTapTime = 0;

  /** The card that was tapped last, used to confirm the second tap is on the
   *  same card. */
  let lastTapCard: AnyCard | null = null;

  /** Set to `true` by `onTouchMove` so we can ignore taps that followed a
   *  scroll gesture. */
  let touchDidScroll = false;

  /** Handle for the setTimeout that shows the thumbnail preview.  Kept so
   *  it can be cancelled on a quick second tap or a scroll. */
  let previewTimer: ReturnType<typeof setTimeout> | null = null;

  /** Reset the scroll-detection flag at the start of each new touch. */
  function onTouchStart() {
    touchDidScroll = false;
  }

  /** Mark the touch as a scroll and cancel any pending preview timer so the
   *  thumbnail never pops up while the user is scrolling the card grid. */
  function onTouchMove() {
    touchDidScroll = true;
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = null;
    }
  }

  /**
   * Main tap handler, attached to each card slot in the grid.
   *
   * - Ignores taps on desktop or when the touch movement indicates a scroll.
   * - On the **second tap** of the same card within 400 ms, adds the card
   *   immediately.
   * - On the **first tap**, schedules a preview thumbnail after 400 ms.
   */
  function onMobileTap(card: AnyCard) {
    if (!isMobile.value || touchDidScroll) return;
    const now = Date.now();
    const key = cardKey(card);
    const lastKey = lastTapCard ? cardKey(lastTapCard) : null;

    if (lastKey === key && now - lastTapTime < 400) {
      // Double-tap on the same card — add it and reset state.
      if (previewTimer) {
        clearTimeout(previewTimer);
        previewTimer = null;
      }
      mobileThumbnail.value = null;
      addCard(card);
      lastTapCard = null;
      lastTapTime = 0;
    } else {
      // First tap — record it and schedule the preview.
      lastTapCard = card;
      lastTapTime = now;
      if (previewTimer) clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        mobileThumbnail.value = getCardImage(card);
        previewTimer = null;
      }, 400);
    }
  }

  /**
   * Handles a tap on the full-screen thumbnail overlay.
   *
   * - Tapping the overlay within 400 ms of the first card tap adds the card
   *   (the user has "confirmed" their selection).
   * - Tapping later simply dismisses the overlay.
   */
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
    /** URL for the full-screen card preview overlay, or `null` when hidden. */
    mobileThumbnail,
    onTouchStart,
    onTouchMove,
    onMobileTap,
    onMobileOverlayTap,
  };
}
