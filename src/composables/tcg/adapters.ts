import { computed, watch, type Ref } from "vue";
import type {
  DigimonCard,
  DigimonDecks,
  NarutoCard,
  NarutoDecks,
  PokemonCard,
  PokemonDecks,
} from "@/interfaces/interfaces";
import { useDigimonBuilder } from "@/composables/digimon/useDigimonBuilder";
import { useDigimonDecks } from "@/composables/digimon/useDigimonDecks";
import { useNarutoBuilder } from "@/composables/naruto/useNarutoBuilder";
import { useNarutoDecks } from "@/composables/naruto/useNarutoDecks";
import { usePokemonBuilder } from "@/composables/pokemon/usePokemonBuilder";
import { usePokemonDecks } from "@/composables/pokemon/usePokemonDecks";
import { useTcgState, type TcgType } from "@/composables/useTcgState";

/**
 * Union of all card types across every supported TCG.
 * Used in views and components that must handle cards from any game.
 */
export type AnyCard = PokemonCard | NarutoCard | DigimonCard;

/**
 * Union of all deck types across every supported TCG.
 * Used in views and components that must handle decks from any game.
 */
export type AnyDeck = PokemonDecks | NarutoDecks | DigimonDecks;

// ─────────────────────────────────────────────────────────────────────────────
// Adapter interfaces
//
// These interfaces define the normalised contract that every per-game builder
// and decks composable must satisfy.  Views depend only on these shapes, never
// on a specific game type, which removes all per-game if/else dispatch from
// the view layer.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalised view of a per-game *Builder composable.
 *
 * Exposes every piece of state and behaviour that BuilderView and
 * CardEditorView need to function independently of which TCG is active.
 * Per-game `as`-casts are centralised in the `makeBuilderAdapter` factory
 * below rather than scattered across the views.
 */
export interface BuilderAdapter {
  /** Reactive list of all cards fetched from the backend for the active game. */
  allCards: Ref<AnyCard[]>;
  /** True while the initial card list is being fetched. */
  loading: Ref<boolean>;
  /** Filter chip labels shown in the toolbar (e.g. ["All", "Pokemon", …]). */
  filters: string[];
  /** Fetch all cards + image URLs from the backend. No-op if already loaded. */
  fetchCards: () => Promise<void>;
  /** Returns the presigned image URL for a card, or `""` if not available. */
  getCardImage: (card: AnyCard) => string;
  /**
   * Returns the canonical object-storage key for a card's image.
   * Used by the card editor to build the presign URL for uploads, ensuring
   * the upload target matches the key used for display.
   */
  imageKey: (card: AnyCard) => string;
  /**
   * Returns a stable, unique string identifier for a card.
   * Used for deck grouping (counting duplicates) and bounce animations.
   */
  cardKey: (card: AnyCard) => string;
  /**
   * Filters a card list by search text and the active filter chip.
   * Pure function — does not mutate the source array.
   */
  filterCards: (
    cards: AnyCard[],
    searchQuery: string,
    activeFilter: string,
  ) => AnyCard[];
  /**
   * Parse a deck list string (from the clipboard) into an ordered array of
   * cards.  Normalised to always be async so views can treat all games
   * identically (Digimon parses client-side, others call the backend).
   *
   * @param text - Raw decklist string.
   * @param pool - Full card pool; needed for Digimon's client-side lookup.
   */
  parseDeckList: (text: string, pool: AnyCard[]) => Promise<AnyCard[]>;
  /** Save a new deck to the backend. */
  saveDeck: (
    userId: string,
    name: string,
    cards: AnyCard[],
    cover?: string,
  ) => Promise<void>;
  /** Overwrite an existing deck (name, entries, cover) on the backend. */
  updateDeck: (
    deckId: number,
    name: string,
    cards: AnyCard[],
    cover?: string,
  ) => Promise<void>;
}

/**
 * Normalised view of a per-game *Decks composable.
 *
 * Exposes everything DecksView needs: the reactive deck list, image helpers,
 * deck text export, and mutation operations.
 */
export interface DecksAdapter {
  /** Reactive list of the user's saved decks for the active game. */
  decks: Ref<AnyDeck[]>;
  /** Fetch the user's deck list from the backend. */
  fetchDecks: (id: string) => Promise<void>;
  /**
   * Returns the presigned image URL to use as the deck's thumbnail.
   * Prefers the deck's `cover` card; falls back to the first entry.
   */
  getPreviewImage: (deck: AnyDeck) => string;
  /** Returns the presigned image URL for a specific card in a deck. */
  getCardImage: (card: AnyCard) => string;
  /**
   * Serialises a deck into the game-specific export format used when copying
   * to the clipboard (e.g. Pokémon PTCGO format, Naruto pipe-delimited list).
   */
  buildDeckText: (deck: AnyDeck) => string;
  /**
   * Optimistically remove a deck from the local list then DELETE it on the
   * backend.
   */
  deleteDeck: (id: number) => Promise<void>;
  /** PATCH the deck's cover card on the backend. */
  updateCoverCard: (deckId: number, cardId: number) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the display name of a card regardless of which TCG it belongs to.
 *
 * Different games use different field names:
 * - Pokémon uses `Name` (PascalCase)
 * - Naruto and Digimon use `name` (camelCase)
 */
export function cardName(card: AnyCard): string {
  if ("Name" in card) return (card as PokemonCard).Name ?? "";
  if ("name" in card) return (card as NarutoCard | DigimonCard).name ?? "";
  return "";
}

/**
 * Returns `true` if the card is a Naruto "Mission" card.
 *
 * Mission cards have a landscape aspect ratio and are rendered in a separate
 * section of the deck panel and card grid, so they need to be identified and
 * segregated before rendering.
 *
 * @param card - The card to test.
 * @param tcg  - The currently active game (only Naruto has mission cards).
 */
export function isMissionCard(card: AnyCard, tcg: TcgType): boolean {
  return (
    tcg === "naruto" &&
    (card as NarutoCard).group?.toLowerCase() === "mission"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Private adapter factories
//
// These functions bridge the per-game composable return values (which have
// concrete card types) to the `AnyCard` / `AnyDeck` unions expected by the
// adapter interfaces.  The `any` params are intentional: the composable
// return shapes are structurally compatible but TypeScript cannot verify this
// without heavyweight generics across the call sites.
// ─────────────────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Wraps a raw builder composable return value in a `BuilderAdapter`.
 *
 * @param builder        - The raw composable return (usePokemonBuilder etc.).
 * @param parseDeckList  - Normalised parse function; allows each game to use
 *   its own implementation (async API call vs. sync client-side parse) while
 *   presenting a uniform async signature to the caller.
 */
function makeBuilderAdapter(
  builder: any,
  parseDeckList: (text: string, pool: AnyCard[]) => Promise<AnyCard[]>,
): BuilderAdapter {
  return {
    allCards: builder.allCards,
    loading: builder.loading,
    filters: builder.filters,
    fetchCards: builder.fetchCards,
    getCardImage: builder.getCardImage,
    imageKey: builder.imageKey,
    cardKey: builder.cardKey,
    filterCards: builder.filterCards,
    parseDeckList,
    saveDeck: builder.saveDeck,
    updateDeck: builder.updateDeck,
  };
}

/**
 * Wraps a raw decks composable return value in a `DecksAdapter`.
 *
 * @param decks - The raw composable return (usePokemonDecks etc.).
 */
function makeDecksAdapter(decks: any): DecksAdapter {
  return {
    decks: decks.decks,
    fetchDecks: decks.fetchDecks,
    getPreviewImage: decks.getPreviewImage,
    getCardImage: decks.getCardImage,
    buildDeckText: decks.buildDeckText,
    deleteDeck: decks.deleteDeck,
    updateCoverCard: decks.updateCoverCard,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─────────────────────────────────────────────────────────────────────────────
// Registry composables
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Instantiates all three per-game builder composables and returns a reactive
 * `builder` computed ref that always points to the one matching `selectedTcg`.
 *
 * Views (BuilderView, CardEditorView) call this instead of the per-game hooks
 * directly, eliminating all `if selectedTcg === "naruto" … else …` dispatch.
 *
 * All three composables are instantiated upfront so Vue can track their
 * reactive deps regardless of which game is active — switching games is
 * instantaneous with no additional setup work.
 */
export function useTcgBuilder() {
  const { selectedTcg } = useTcgState();

  // Instantiate all builders once in component setup scope.
  const pokemon = usePokemonBuilder();
  const naruto = useNarutoBuilder();
  const digimon = useDigimonBuilder();

  /**
   * Static map from TcgType → BuilderAdapter.
   * Digimon's parseDeckList wraps the synchronous client-side function in a
   * Promise to match the async signature of the other two games.
   */
  const adapters: Record<TcgType, BuilderAdapter> = {
    pokemon: makeBuilderAdapter(pokemon, (text) => pokemon.parseDeckList(text)),
    naruto: makeBuilderAdapter(naruto, (text) => naruto.parseDeckList(text)),
    digimon: makeBuilderAdapter(digimon, async (text, pool) =>
      digimon.parseDeckList(text, pool as DigimonCard[]),
    ),
  };

  /** Reactive adapter for the currently active game. */
  const builder = computed<BuilderAdapter>(() => adapters[selectedTcg.value]);
  return { selectedTcg, builder };
}

/**
 * Instantiates all three per-game decks composables and returns a reactive
 * `decks` computed ref that always points to the one matching `selectedTcg`.
 *
 * Only the **active** game's decks are fetched — a watcher fires `fetchDecks`
 * whenever `userId` becomes available or `selectedTcg` changes, so switching
 * from Pokémon to Naruto will load Naruto decks on demand rather than loading
 * all games upfront (which would be 6 network requests).
 *
 * @param userId - Getter function returning the Clerk user ID (or undefined
 *   when not signed in).  Passed as a getter rather than a raw value so the
 *   watcher can react to the user signing in after the component mounts.
 */
export function useTcgDecks(userId: () => string | undefined) {
  const { selectedTcg } = useTcgState();

  // Instantiate all decks composables. Their internal state (decks list,
  // imageUrls) persists as long as the parent component is mounted, so
  // switching games and back does not re-fetch unnecessarily.
  const pokemon = usePokemonDecks(userId);
  const naruto = useNarutoDecks(userId);
  const digimon = useDigimonDecks(userId);

  /** Static map from TcgType → DecksAdapter. */
  const adapters: Record<TcgType, DecksAdapter> = {
    pokemon: makeDecksAdapter(pokemon),
    naruto: makeDecksAdapter(naruto),
    digimon: makeDecksAdapter(digimon),
  };

  /** Reactive adapter for the currently active game. */
  const decks = computed<DecksAdapter>(() => adapters[selectedTcg.value]);

  /**
   * Lazy fetch: only load the active game's decks.
   *
   * Watching both `userId` and `selectedTcg` covers two cases:
   * 1. The user navigates to DecksView after signing in → `userId` becomes
   *    available and triggers the first fetch.
   * 2. The user switches the active TCG → `selectedTcg` changes and triggers
   *    a fetch for the newly selected game if its deck list is empty.
   */
  watch(
    [() => userId(), selectedTcg],
    ([id]) => {
      if (id) decks.value.fetchDecks(id);
    },
    { immediate: true },
  );

  return { selectedTcg, decks };
}
