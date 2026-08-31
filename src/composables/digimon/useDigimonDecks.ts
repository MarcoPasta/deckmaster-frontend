import type { DigimonCard, DigimonDecks } from "@/interfaces/interfaces";
import { createDecksComposable } from "@/composables/tcg/createDecksComposable";
import { useApi } from "@/composables/useApi";

/**
 * Derives the canonical object-storage key for a Digimon card image.
 * CardNumber is globally unique so it can be used directly as the filename.
 */
function digimonImageKey(card: DigimonCard): string {
  if (!card.CardNumber) return "";
  return `cards/digimon/${card.CardNumber}.png`;
}

/**
 * Derives the object-storage key for the deck's preview thumbnail.
 * Prefers `deck.cover` (user-selected); falls back to the first entry.
 */
function digimonPreviewKey(deck: DigimonDecks): string {
  const coverEntry = deck.cover
    ? deck.entries?.find((e) => String(e.card.ID) === deck.cover)
    : undefined;
  const entry = coverEntry ?? deck.entries?.[0];
  return entry ? digimonImageKey(entry.card) : "";
}

/** Pre-built base composable shared by all `useDigimonDecks` calls. */
const _useBase = createDecksComposable<DigimonCard, DigimonDecks["entries"][number], DigimonDecks>({
  imagesPath: "/digimon/cards/images",
  decksPath: "/auth/digimon/decks/user",
  coverPath: (deckId, cardId) => `/auth/digimon/decks/${deckId}/image/update/${cardId}`,
  deletePath: (deckId) => `/auth/digimon/decks/${deckId}/delete`,
  cardImageKey: digimonImageKey,
  previewImageKey: digimonPreviewKey,
});

/**
 * Decks composable for the Digimon TCG.
 *
 * Extends the generic base with:
 * - `buildDeckText` — simple newline-separated export format.
 * - `updateDeck`    — a Digimon-specific PUT that also updates the local deck
 *   list reactively (other games handle this in the builder composable).
 *
 * Note: Digimon is implemented but not currently exposed in the UI
 * (see `useTcgState.ENABLED_TCGS`).
 */
export function useDigimonDecks(userId: () => string | undefined) {
  const base = _useBase(userId);
  const { put } = useApi();

  /**
   * Serialise a Digimon deck into a simple export format:
   * ```
   * Digimon: {total}
   * {count} {name} {CardNumber}
   * …
   * ```
   * The total on the header line is the raw entry count (including duplicates).
   */
  function buildDeckText(deck: DigimonDecks): string {
    const entries = deck.entries ?? [];

    // Group by CardNumber to count duplicates.
    const cardCounts = new Map<string, { card: DigimonCard; count: number }>();
    for (const entry of entries) {
      const existing = cardCounts.get(entry.card.CardNumber);
      if (existing) existing.count++;
      else cardCounts.set(entry.card.CardNumber, { card: entry.card, count: 1 });
    }

    const lines: string[] = [];
    lines.push(`Digimon: ${entries.length}`);
    for (const { card, count } of cardCounts.values()) {
      lines.push(`${count} ${card.name} ${card.CardNumber}`);
    }
    return lines.join("\n").trim();
  }

  /**
   * PUT updated deck data and sync the local `decks` list.
   *
   * Digimon has an additional deck-update flow from DecksView (the other games
   * only update through the builder), so this method is exposed here.  The
   * returned updated deck replaces the stale entry in the reactive list.
   */
  async function updateDeck(
    deckId: number,
    body: { name?: string; cardIds?: number[] },
  ) {
    try {
      const updated = await put<{ content: DigimonDecks }>(
        `/auth/digimon/decks/${deckId}/update`,
        body,
      );
      // Update the matching deck in the reactive list without a full refetch.
      const index = (base.decks.value as DigimonDecks[]).findIndex(
        (d) => d.ID === deckId,
      );
      if (index !== -1) {
        (base.decks.value as DigimonDecks[])[index] = updated.content;
      }
    } catch (e) {
      console.error("Failed to update digimon deck:", e);
    }
  }

  return { ...base, buildDeckText, updateDeck };
}
