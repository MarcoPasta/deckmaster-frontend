import { ref } from "vue";
import type { PokemonCard } from "../../interfaces/interfaces";
import { useApi } from "../useApi";

export function usePokemonBuilder() {
  const { get, post, put } = useApi();

  const allCards = ref<PokemonCard[]>([]);
  const imageUrls = ref<Record<string, string>>({});
  const loading = ref(false);
  const filters = ["All", "Pokémon", "Trainer", "Energy"];

  async function fetchCards() {
    if (allCards.value.length > 0) return;
    loading.value = true;
    try {
      const [cardData, imageData] = await Promise.all([
        get<{ content: PokemonCard[] }>("/pokemon/cards"),
        get<{ images: Record<string, string> }>("/pokemon/cards/images"),
      ]);
      allCards.value = cardData.content;
      imageUrls.value = imageData.images;
    } catch (e) {
      console.error("Failed to fetch cards:", e);
    } finally {
      loading.value = false;
    }
  }

  function getCardImage(card: PokemonCard): string {
    if (!card.CardNumber || !card.Code) return "";
    const number = card.CardNumber.split("/")[0];
    const key = `cards/pokemon/${card.Code}_${number}.png`;
    return imageUrls.value[key] || "";
  }

  function cardKey(card: PokemonCard): string {
    return `${card.Code}_${card.CardNumber}`;
  }

  function filterCards(
    cards: PokemonCard[],
    searchQuery: string,
    activeFilter: string,
  ): PokemonCard[] {
    return cards.filter((card) => {
      const matchesSearch = (card.Name ?? "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      let matchesFilter = activeFilter === "all";
      if (!matchesFilter) {
        const type = (card.CardType ?? "").toLowerCase();
        if (activeFilter === "energy") {
          matchesFilter = type === "energie" || type === "energy";
        } else {
          matchesFilter = type === activeFilter.toLowerCase();
        }
      }
      return matchesSearch && matchesFilter;
    });
  }

  async function parseDeckList(text: string): Promise<PokemonCard[]> {
    const cardPool: PokemonCard[] = [];
    try {
      const parsedList = await get<{ content: PokemonCard[] }>(
        "/pokemon/cards/names",
        {
          decklist: text,
        },
      );
      cardPool.push(...parsedList.content);
    } catch (e) {
      console.error("Failed to fetch cards:", e);
    } finally {
      loading.value = false;
    }
    return cardPool;
  }

  async function saveDeck(
    userId: string,
    name: string,
    cards: PokemonCard[],
  ): Promise<void> {
    await post("/auth/pokemon/decks/create", {
      UserId: userId,
      Name: name,
      Entries: cards.map((card) => ({ cardId: card.ID })),
    });
  }

  async function updateDeck(
    deckId: number,
    name: string,
    cards: PokemonCard[],
  ): Promise<void> {
    console.log(cards.map((card) => ({ cardId: card.ID })));
    await put(`/auth/pokemon/decks/${deckId}/update`, {
      DeckId: deckId,
      Name: name,
      Entries: cards.map((card) => ({ cardId: card.ID })),
    });
  }

  return {
    allCards,
    loading,
    fetchCards,
    filters,
    getCardImage,
    cardKey,
    filterCards,
    parseDeckList,
    saveDeck,
    updateDeck,
  };
}
