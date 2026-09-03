/**
 * Typed helpers for the deck handoff between DecksView and BuilderView.
 *
 * When the user clicks "Edit" on a deck in DecksView, the deck's current
 * state (cards, name, id, cover) is written into `sessionStorage` so that
 * BuilderView can pick it up after navigation.  Without a shared typed
 * module the two views each had their own string literals for the key names,
 * creating a silent desync risk if one side was updated without the other.
 *
 * Usage:
 * - **DecksView** calls `writeBuilderHandoff(…)` before pushing to `/builder`.
 * - **BuilderView** calls `readBuilderHandoff()` on setup to pre-populate its
 *   state, and `clearBuilderHandoff()` after saving to reset the session.
 */

/** The exact `sessionStorage` key names used by both views. */
export const BUILDER_STORAGE = {
  /** JSON-serialised array of `AnyCard` objects in the deck being edited. */
  DECK: "builder-deck",
  /** Human-readable deck name. */
  NAME: "builder-deck-name",
  /** Numeric deck ID as a string; empty string for a new (unsaved) deck. */
  ID: "builder-deck-id",
  /** Cover card ID as a string; empty string when no cover is set. */
  COVER: "builder-deck-cover",
} as const;

/**
 * The shape of data passed from DecksView to BuilderView via sessionStorage.
 */
export interface BuilderHandoff {
  /** Serialisable card objects to pre-populate the deck panel. */
  cards: unknown[];
  /** Pre-populated deck name. */
  name: string;
  /** String-coerced deck ID, e.g. `"42"`.  Empty for a brand-new deck. */
  deckId: string;
  /** String-coerced cover card ID.  Empty when none is set. */
  cover: string;
}

/**
 * Persists a deck's state to `sessionStorage` so BuilderView can restore it
 * after the router navigation from DecksView.
 *
 * Call this immediately before `router.push({ name: "Builder", … })`.
 */
export function writeBuilderHandoff(data: BuilderHandoff): void {
  sessionStorage.setItem(BUILDER_STORAGE.DECK, JSON.stringify(data.cards));
  sessionStorage.setItem(BUILDER_STORAGE.NAME, data.name);
  sessionStorage.setItem(BUILDER_STORAGE.ID, data.deckId);
  sessionStorage.setItem(BUILDER_STORAGE.COVER, data.cover);
}

/**
 * Reads the deck handoff state from `sessionStorage`.
 *
 * Always returns a complete `BuilderHandoff` object — missing keys default to
 * empty values so callers don't need to null-check.  Called by BuilderView
 * during setup to restore a deck that was opened for editing from DecksView.
 */
export function readBuilderHandoff(): BuilderHandoff {
  return {
    cards: JSON.parse(sessionStorage.getItem(BUILDER_STORAGE.DECK) || "[]"),
    name: sessionStorage.getItem(BUILDER_STORAGE.NAME) || "",
    deckId: sessionStorage.getItem(BUILDER_STORAGE.ID) || "",
    cover: sessionStorage.getItem(BUILDER_STORAGE.COVER) || "",
  };
}

/**
 * Removes all builder handoff keys from `sessionStorage`.
 *
 * Called by BuilderView after a successful deck save (or when the user clears
 * the deck) to avoid stale state being picked up on the next Builder visit.
 */
export function clearBuilderHandoff(): void {
  Object.values(BUILDER_STORAGE).forEach((key) =>
    sessionStorage.removeItem(key),
  );
}
