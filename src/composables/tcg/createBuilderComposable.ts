import { ref } from "vue";
import { useApi } from "@/composables/useApi";

/**
 * Static, game-specific configuration supplied to `createBuilderComposable`.
 *
 * Every property that differs between Pokémon, Naruto and Digimon lives here,
 * keeping the generic builder core completely game-agnostic.
 */
export interface BuilderConfig<TCard> {
  /** GET endpoint that returns `{ content: TCard[] }`, e.g. `"/pokemon/cards"`. */
  cardsPath: string;
  /** GET endpoint that returns `{ images: Record<string,string> }` — a map of
   *  object-storage keys to presigned image URLs. */
  imagesPath: string;
  /** Labels for the filter chips rendered in the toolbar toolbar.
   *  The first entry should always be `"All"`. */
  filters: string[];
  /**
   * Derives the object-storage key for a card's image file.
   * Must match exactly what the backend stores — used for both display
   * (`getCardImage`) and image upload presigning (`imageKey`).
   */
  cardImageKey: (card: TCard) => string;
  /**
   * Returns a stable, unique string that identifies a card within a deck.
   * Used for counting duplicates when grouping the chosen-card list.
   */
  cardKey: (card: TCard) => string;
  /**
   * Returns `true` if `card` matches the currently active filter chip.
   * Called with `activeFilter` already lowercased and guaranteed to be
   * something other than `"all"` (the "all" case is short-circuited before
   * this function is invoked).
   */
  matchesFilter: (card: TCard, activeFilter: string) => boolean;
  /**
   * Builds the JSON request body for `POST /…/decks/create`.
   * Different games use different field names and casing conventions.
   */
  buildSaveBody: (
    userId: string,
    name: string,
    cards: TCard[],
    cover?: string,
  ) => unknown;
  /**
   * Builds the JSON request body for `PUT /…/decks/:id/update`.
   */
  buildUpdateBody: (
    deckId: number,
    name: string,
    cards: TCard[],
    cover?: string,
  ) => unknown;
  /** Full path for the deck-creation endpoint, e.g. `"/auth/pokemon/decks/create"`. */
  createPath: string;
  /** Returns the full path for the deck-update endpoint given a deck ID. */
  updatePath: (deckId: number) => string;
}

/**
 * Generic builder composable factory.
 *
 * Accepts a `BuilderConfig<TCard>` and returns a `useBuilder()` composable
 * function.  All the repetitive logic that was previously copy-pasted into
 * each per-game composable (`usePokemonBuilder`, `useNarutoBuilder`, etc.)
 * now lives here once:
 * - Fetching and caching the card list + image URL map.
 * - Looking up a presigned image URL for a card.
 * - Filtering the card list by name and active filter chip.
 * - Saving and updating decks via the backend.
 *
 * Per-game composables call this factory and extend the result with any
 * extras that aren't shared (e.g. `parseDeckList` which differs per game).
 *
 * @example
 * const _useBase = createBuilderComposable<PokemonCard>({ ... });
 * export function usePokemonBuilder() {
 *   const base = _useBase();
 *   return { ...base, parseDeckList };
 * }
 */
export function createBuilderComposable<TCard extends { ID: number }>(
  config: BuilderConfig<TCard>,
) {
  return function useBuilder() {
    const { get, post, put } = useApi();

    /** Full card catalogue for this game, loaded once on first `fetchCards()`. */
    const allCards = ref<TCard[]>([]);

    /**
     * Map from object-storage key → presigned URL for each card image.
     * Fetched alongside the card list and refreshed together with it.
     */
    const imageUrls = ref<Record<string, string>>({});

    /** True while the initial card + image fetch is in progress. */
    const loading = ref(false);

    /**
     * Fetches all cards and their image URLs in parallel.
     * Returns early if cards are already loaded (the backend data rarely
     * changes while the user is in a session).
     */
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

    /**
     * Looks up the presigned image URL for a card.
     * Returns `""` when the card has no image key or the key is not (yet) in
     * the `imageUrls` map.
     */
    function getCardImage(card: TCard): string {
      const key = config.cardImageKey(card);
      return key ? imageUrls.value[key] || "" : "";
    }

    /**
     * Returns the canonical object-storage key for a card's image.
     * Exposed separately from `getCardImage` so the card editor can use the
     * same key when generating a presigned upload URL — guaranteeing that the
     * uploaded file lands at exactly the path `getCardImage` will later read.
     */
    function imageKey(card: TCard): string {
      return config.cardImageKey(card);
    }

    /**
     * Returns the stable unique identifier for a card (delegates to `config.cardKey`).
     * Used by the deck panel to group duplicate cards and count them.
     */
    function cardKey(card: TCard): string {
      return config.cardKey(card);
    }

    /**
     * Filters the card list by name search and the active filter chip.
     *
     * Name matching is case-insensitive and works across both PascalCase
     * (`Name`, used by Pokémon) and camelCase (`name`, used by Naruto/Digimon).
     * Filter matching is delegated to `config.matchesFilter` which contains
     * game-specific type/keyword logic.
     */
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
        // "all" bypasses the filter entirely.
        const matchesFilter =
          activeFilter === "all" || config.matchesFilter(card, activeFilter);
        return matchesSearch && matchesFilter;
      });
    }

    /** POST a new deck to the backend. */
    async function saveDeck(
      userId: string,
      name: string,
      cards: TCard[],
      cover?: string,
    ): Promise<void> {
      await post(config.createPath, config.buildSaveBody(userId, name, cards, cover));
    }

    /** PUT updated deck data (name, card list, cover) to the backend. */
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
      /** Filter chip labels (from config, not reactive). */
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
