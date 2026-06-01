import { ref, watch } from "vue";
import type { NarutoCard, NarutoDecks } from "../../interfaces/interfaces";
import { useApi } from "../useApi";

export function useNarutoDecks(userId: () => string | undefined) {
  const { get } = useApi();
  const decks = ref<NarutoDecks[]>([]);
  const imageUrls = ref<Record<string, string>>({});

  async function fetchImages() {
    try {
      const data = await get<{ images: Record<string, string> }>(
        "/naruto/cards/images",
      );
      imageUrls.value = data.images;
    } catch (e) {
      console.error("Failed to fetch card images:", e);
    }
  }

  async function fetchDecks(id: string) {
    try {
      const [deckData] = await Promise.all([
        get<{ content: NarutoDecks[] }>("/auth/naruto/decks/user", { id }),
        fetchImages(),
      ]);
      decks.value = deckData.content;
    } catch (e) {
      console.error("Failed to fetch naruto decks:", e);
    }
  }

  watch(
    userId,
    (id) => {
      if (id) fetchDecks(id);
    },
    { immediate: true },
  );

  function formatCardNumber(card: NarutoCard): string {
    if (!card.card_number || !card.rarity) return "";

    const number = parseInt(card.card_number, 10);
    if (isNaN(number)) return "";

    switch (true) {
      case number < 10:
        return "00" + number;
      case number < 100:
        return "0" + number;
      default:
        return number.toString();
    }
  }

  function getPreviewImage(deck: NarutoDecks): string {
    const entry = deck.entries?.[0];
    if (!entry?.card?.card_number || !entry?.card?.rarity) return "";
    const key = `cards/naruto/${entry.card.set}_${formatCardNumber(entry.card)}_${entry.card.rarity}.webp`;
    console.log(key);
    return imageUrls.value[key] || "";
  }

  function getCardImage(card: NarutoCard): string {
    if (!card.card_number || !card.rarity) return "";
    const key = `cards/naruto/${card.set}_${formatCardNumber(card)}_${card.rarity}.webp`;
    return imageUrls.value[key] || "";
  }

  function buildDeckText(deck: NarutoDecks): string {
    const entries = deck.entries ?? [];

    const cardCounts = new Map<number, { card: NarutoCard; count: number }>();
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
    lines.push(`Naruto Mythos: ${total}`);
    for (const { card, count } of cardCounts.values()) {
      lines.push(`${count} ${card.name} ${card.card_number} ${card.rarity}`);
    }

    return lines.join("\n").trim();
  }

  function deleteDeckLocal(deckId: number) {
    decks.value = decks.value.filter((d) => d.ID !== deckId);
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
