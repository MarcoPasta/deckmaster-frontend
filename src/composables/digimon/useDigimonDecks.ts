import { ref, watch } from "vue";
import type { DigimonCard, DigimonDecks } from "../../interfaces/interfaces";
import { useApi } from "../useApi";

export function useDigimonDecks(userId: () => string | undefined) {
  const { get, del } = useApi();
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
    const entry = deck.entries?.[0];
    if (!entry?.card?.cardId) return "";
    const key = `cards/digimon/${entry.card.cardId}.png`;
    return imageUrls.value[key] || "";
  }

  function getCardImage(card: DigimonCard): string {
    if (!card.cardId) return "";
    const key = `cards/digimon/${card.cardId}.png`;
    return imageUrls.value[key] || "";
  }

  function buildDeckText(deck: DigimonDecks): string {
    const entries = deck.entries ?? [];

    const cardCounts = new Map<number, { card: DigimonCard; count: number }>();
    for (const entry of entries) {
      const existing = cardCounts.get(entry.card.ID);
      if (existing) {
        existing.count++;
      } else {
        cardCounts.set(entry.card.ID, { card: entry.card, count: 1 });
      }
    }

    const lines: string[] = [];
    const total = entries.length;
    lines.push(`Digimon: ${total}`);
    for (const { card, count } of cardCounts.values()) {
      lines.push(`${count} ${card.name} ${card.cardId}`);
    }

    return lines.join("\n").trim();
  }

  async function deleteDeckLocal(deckId: number) {
    decks.value = decks.value.filter((d) => d.ID !== deckId);
    try {
      await del(`/auth/digimon/decks/${deckId}/delete`);
    } catch (e) {
      console.error("Failed to delete digimon deck:", e);
    }
  }

  return {
    decks,
    fetchDecks,
    getPreviewImage,
    getCardImage,
    buildDeckText,
    deleteDeckLocal,
  };
}
