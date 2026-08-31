import { ref } from "vue";
import { useApi } from "../useApi";

/**
 * Static configuration that differs per TCG game.
 */
export interface BuilderConfig<TCard> {
  /** GET endpoint for all cards, e.g. "/pokemon/cards" */
  cardsPath: string;
  /** GET endpoint for the image URL map, e.g. "/pokemon/cards/images" */
  imagesPath: string;
  /** Filter labels shown in the UI, e.g. ["All", "Pokemon", "Trainer", "Energy"] */
  filters: string[];
  /** Build the object-storage key for a card image. */
  cardImageKey: (card: TCard) => string;
  /** Build a stable string key to identify a card (used for deck grouping). */
  cardKey: (card: TCard) => string;
  /** Return true if the card matches the active filter. */
  matchesFilter: (card: TCard, activeFilter: string) => boolean;
  /** POST body factory for creating a deck. */
  buildSaveBody: (
    userId: string,
    name: string,
    cards: TCard[],
    cover?: string,
  ) => unknown;
  /** PUT body factory for updating a deck. */
  buildUpdateBody: (
    deckId: number,
    name: string,
    cards: TCard[],
    cover?: string,
  ) => unknown;
  /** POST endpoint for creating a deck. */
  createPath: string;
  /** PUT endpoint template for updating a deck. */
  updatePath: (deckId: number) => string;
}

/**
 * Creates a Builder composable for a specific TCG.
 *
 * Returns everything BuilderView / CardEditorView need: reactive card state,
 * image helpers, filtering, deck save/update — all game-specific logic is
 * supplied via config.
 */
export function createBuilderComposable<TCard extends { ID: number }>(
  config: BuilderConfig<TCard>,
) {
  return function useBuilder() {
    const { get, post, put } = useApi();
    const allCards = ref<TCard[]>([]);
    const imageUrls = ref<Record<string, string>>({});
    const loading = ref(false);

    async function fetchCards() {
      if (allCards.value.length > 0) return;
      loading.value = true;
      try {
        const [cardData, imageData] = await Promise.all([
          get<{ content: TCard[] }>(config.cardsPath),
          get<{ images: Record<string, string> }>(config.imagesPath),
        ]);
        allCards.value = cardData.content;
        imageUrls.value = imageData.images;
      } catch (e) {
        console.error(`Failed to fetch cards (${config.cardsPath}):`, e);
      } finally {
        loading.value = false;
      }
    }

    function getCardImage(card: TCard): string {
      const key = config.cardImageKey(card);
      return key ? imageUrls.value[key] || "" : "";
    }

    function imageKey(card: TCard): string {
      return config.cardImageKey(card);
    }

    function cardKey(card: TCard): string {
      return config.cardKey(card);
    }

    function filterCards(
      cards: TCard[],
      searchQuery: string,
      activeFilter: string,
    ): TCard[] {
      return cards.filter((card) => {
        const name =
          (card as unknown as Record<string, string>)["Name"] ??
          (card as unknown as Record<string, string>)["name"] ??
          "";
        const matchesSearch = name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesFilter =
          activeFilter === "all" || config.matchesFilter(card, activeFilter);
        return matchesSearch && matchesFilter;
      });
    }

    async function saveDeck(
      userId: string,
      name: string,
      cards: TCard[],
      cover?: string,
    ): Promise<void> {
      await post(config.createPath, config.buildSaveBody(userId, name, cards, cover));
    }

    async function updateDeck(
      deckId: number,
      name: string,
      cards: TCard[],
      cover?: string,
    ): Promise<void> {
      await put(
        config.updatePath(deckId),
        config.buildUpdateBody(deckId, name, cards, cover),
      );
    }

    return {
      allCards,
      loading,
      filters: config.filters,
      fetchCards,
      getCardImage,
      imageKey,
      cardKey,
      filterCards,
      saveDeck,
      updateDeck,
    };
  };
}
