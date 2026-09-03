import type { NarutoCard, NarutoDecks } from "@/interfaces/interfaces";
import { createDecksComposable } from "@/composables/tcg/createDecksComposable";

/**
 * Derives the canonical object-storage key for a Naruto card image.
 * MSS cards skip the zero-padding; all others are padded to 3 digits.
 */
function narutoImageKey(card: NarutoCard): string {
  if (!card.card_number || !card.rarity) return "";
  const number =
    card.rarity === "MSS"
      ? card.card_number
      : card.card_number.padStart(3, "0");
  return `cards/naruto/${card.set}_${number}_${card.rarity}.webp`;
}

/**
 * Derives the object-storage key for the deck's preview thumbnail.
 * Prefers `deck.cover` (user-selected); falls back to the first entry.
 */
function narutoPreviewKey(deck: NarutoDecks): string {
  const coverEntry = deck.cover
    ? deck.entries?.find((e) => String(e.card.ID) === deck.cover)
    : undefined;
  const entry = coverEntry ?? deck.entries?.[0];
  return entry ? narutoImageKey(entry.card) : "";
}

/** Pre-built base composable shared by all `useNarutoDecks` calls. */
const _useBase = createDecksComposable<NarutoCard, NarutoDecks["entries"][number], NarutoDecks>({
  imagesPath: "/naruto/cards/images",
  decksPath: "/auth/naruto/decks/user",
  coverPath: (deckId, cardId) => `/auth/naruto/decks/${deckId}/image/update/${cardId}`,
  deletePath: (deckId) => `/auth/naruto/decks/${deckId}/delete`,
  cardImageKey: narutoImageKey,
  previewImageKey: narutoPreviewKey,
});

/**
 * Decks composable for the Naruto Mythos TCG.
 *
 * Extends the generic base with `buildDeckText`, which serialises a deck into
 * the pipe-delimited import format used by the Naruto Mythos community tools:
 * `SET-NUMBER-RARITY--COUNT|…|DeckName`
 */
export function useNarutoDecks(userId: () => string | undefined) {
  const base = _useBase(userId);

  /**
   * Serialise a Naruto deck into the pipe-delimited export format.
   *
   * Each card token follows the pattern `SET-NUMBER-RARITY--COUNT`, e.g.:
   * `"KS-001-C--4"`.
   *
   * The deck name is appended after the last `|` as a trailing identifier.
   *
   * Special-case transforms applied to match community tool expectations:
   * - `MSS` rarity is normalised to `MMS`.
   * - `MMS` card numbers have the leading `"M"` stripped and are padded to
   *   3 digits (e.g. `"M001"` → `"001"`).
   *
   * **Important:** these transforms are applied to **local copies** of the
   * rarity/number fields, never to the reactive card objects, so calling
   * this function multiple times is safe and idempotent.
   */
  function buildDeckText(deck: NarutoDecks): string {
    const entries = deck.entries ?? [];

    // Aggregate duplicate cards by ID.
    const cardCounts = new Map<number, { card: NarutoCard; count: number }>();
    for (const entry of entries) {
      const existing = cardCounts.get(entry.card.ID);
      if (existing) existing.count++;
      else cardCounts.set(entry.card.ID, { card: entry.card, count: 1 });
    }

    let list = "";
    for (const { card, count } of cardCounts.values()) {
      // Normalise rarity: community format uses "MMS", database stores "MSS".
      const rarity = card.rarity.replace("MSS", "MMS");
      // MMS card numbers have a leading "M" that must be stripped for export.
      const cardNumber =
        rarity === "MMS"
          ? card.card_number.replace("M", "").padStart(3, "0")
          : card.card_number;
      list += `${card.set.toUpperCase()}-${cardNumber}-${rarity.toUpperCase()}--${count}|`;
    }
    // Append the deck name as a trailing token (community tool convention).
    list += deck.name;
    return list;
  }

  return { ...base, buildDeckText };
}
