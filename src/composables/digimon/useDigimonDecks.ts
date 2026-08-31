import type { DigimonCard, DigimonDecks } from "@/interfaces/interfaces";
import { createDecksComposable } from "@/composables/tcg/createDecksComposable";
import { useApi } from "@/composables/useApi";

function digimonImageKey(card: DigimonCard): string {
  if (!card.CardNumber) return "";
  return `cards/digimon/${card.CardNumber}.png`;
}

function digimonPreviewKey(deck: DigimonDecks): string {
  const coverEntry = deck.cover
    ? deck.entries?.find((e) => String(e.card.ID) === deck.cover)
    : undefined;
  const entry = coverEntry ?? deck.entries?.[0];
  return entry ? digimonImageKey(entry.card) : "";
}

const _useBase = createDecksComposable<DigimonCard, DigimonDecks["entries"][number], DigimonDecks>({
  imagesPath: "/digimon/cards/images",
  decksPath: "/auth/digimon/decks/user",
  coverPath: (deckId, cardId) => `/auth/digimon/decks/${deckId}/image/update/${cardId}`,
  deletePath: (deckId) => `/auth/digimon/decks/${deckId}/delete`,
  cardImageKey: digimonImageKey,
  previewImageKey: digimonPreviewKey,
});

export function useDigimonDecks(userId: () => string | undefined) {
  const base = _useBase(userId);
  const { put } = useApi();

  function buildDeckText(deck: DigimonDecks): string {
    const entries = deck.entries ?? [];
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

  async function updateDeck(
    deckId: number,
    body: { name?: string; cardIds?: number[] },
  ) {
    try {
      const updated = await put<{ content: DigimonDecks }>(
        `/auth/digimon/decks/${deckId}/update`,
        body,
      );
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
