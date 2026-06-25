import { ref, watch } from "vue";
import type { DigimonCard, DigimonDecks } from "../../interfaces/interfaces";
import { useApi } from "../useApi";

export function useDigimonDecks(userId: () => string | undefined) {
  const { get, del, put, patch } = useApi();
  const decks = ref<DigimonDecks[]>([]);
  const imageUrls = ref<Record<string, string>>({});

  async function fetchImages() {
    try {
      const data = await get<{ images: Record<string, string> }>(
        "/digimon/cards/images",
      );
      imageUrls.value = data.images;
    } catch (e) {
      console.error("Failed to fetch digimon card images:", e);
    }
  }

  async function fetchDecks(id: string) {
    try {
      const [deckData] = await Promise.all([
        get<{ content: DigimonDecks[] }>("/auth/digimon/decks/user", { id }),
        fetchImages(),
      ]);
      decks.value = deckData.content;
    } catch (e) {
      console.error("Failed to fetch digimon decks:", e);
    }
  }

  watch(
    userId,
    (id) => {
      if (id) fetchDecks(id);
    },
    { immediate: true },
  );

  function getPreviewImage(deck: DigimonDecks): string {
    const coverEntry = deck.cover
      ? deck.entries?.find((e) => String(e.card.ID) === deck.cover)
      : undefined;
    const entry = coverEntry ?? deck.entries?.[0];
    if (!entry?.card?.CardNumber) return "";
    const key = `cards/digimon/${entry.card.CardNumber}.png`;
    return imageUrls.value[key] || "";
  }

  function getCardImage(card: DigimonCard): string {
    if (!card.CardNumber) return "";
    const key = `cards/digimon/${card.CardNumber}.png`;
    return imageUrls.value[key] || "";
  }

  function buildDeckText(deck: DigimonDecks): string {
    const entries = deck.entries ?? [];

    const cardCounts = new Map<string, { card: DigimonCard; count: number }>();
    for (const entry of entries) {
      const existing = cardCounts.get(entry.card.CardNumber);
      if (existing) {
        existing.count++;
      } else {
        cardCounts.set(entry.card.CardNumber, { card: entry.card, count: 1 });
      }
    }

    const lines: string[] = [];
    const total = entries.length;
    lines.push(`Digimon: ${total}`);
    for (const { card, count } of cardCounts.values()) {
      lines.push(`${count} ${card.name} ${card.CardNumber}`);
    }

    return lines.join("\n").trim();
  }

  async function updateCoverCard(deckId: number, cardId: number) {
    try {
      await patch<void>(`/auth/digimon/decks/${deckId}/image/update/${cardId}`);
    } catch (e) {
      console.error("Failed to update digimon deck cover:", e);
    }
  }

  async function deleteDeck(deckId: number) {
    decks.value = decks.value.filter((d) => d.ID !== deckId);
    try {
      await del(`/auth/digimon/decks/${deckId}/delete`);
    } catch (e) {
      console.error("Failed to delete digimon deck:", e);
    }
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
      const index = decks.value.findIndex((d) => d.ID === deckId);
      if (index !== -1) {
        decks.value[index] = updated.content;
      }
    } catch (e) {
      console.error("Failed to update digimon deck:", e);
    }
  }

  return {
    decks,
    fetchDecks,
    getPreviewImage,
    getCardImage,
    buildDeckText,
    deleteDeck,
    updateDeck,
    updateCoverCard,
  };
}
