import type { NarutoCard, NarutoDecks } from "../../interfaces/interfaces";
import { createDecksComposable } from "../tcg/createDecksComposable";

function narutoImageKey(card: NarutoCard): string {
  if (!card.card_number || !card.rarity) return "";
  const number =
    card.rarity === "MSS"
      ? card.card_number
      : card.card_number.padStart(3, "0");
  return `cards/naruto/${card.set}_${number}_${card.rarity}.webp`;
}

function narutoPreviewKey(deck: NarutoDecks): string {
  const coverEntry = deck.cover
    ? deck.entries?.find((e) => String(e.card.ID) === deck.cover)
    : undefined;
  const entry = coverEntry ?? deck.entries?.[0];
  return entry ? narutoImageKey(entry.card) : "";
}

const _useBase = createDecksComposable<NarutoCard, NarutoDecks["entries"][number], NarutoDecks>({
  imagesPath: "/naruto/cards/images",
  decksPath: "/auth/naruto/decks/user",
  coverPath: (deckId, cardId) => `/auth/naruto/decks/${deckId}/image/update/${cardId}`,
  deletePath: (deckId) => `/auth/naruto/decks/${deckId}/delete`,
  cardImageKey: narutoImageKey,
  previewImageKey: narutoPreviewKey,
});

export function useNarutoDecks(userId: () => string | undefined) {
  const base = _useBase(userId);

  function buildDeckText(deck: NarutoDecks): string {
    const entries = deck.entries ?? [];
    const cardCounts = new Map<number, { card: NarutoCard; count: number }>();
    for (const entry of entries) {
      const existing = cardCounts.get(entry.card.ID);
      if (existing) existing.count++;
      else cardCounts.set(entry.card.ID, { card: entry.card, count: 1 });
    }

    let list = "";
    for (const { card, count } of cardCounts.values()) {
      const rarity = card.rarity.replace("MSS", "MMS");
      const cardNumber =
        rarity === "MMS"
          ? card.card_number.replace("M", "").padStart(3, "0")
          : card.card_number;
      list += `${card.set.toUpperCase()}-${cardNumber}-${rarity.toUpperCase()}--${count}|`;
    }
    list += deck.name;
    return list;
  }

  return { ...base, buildDeckText };
}
