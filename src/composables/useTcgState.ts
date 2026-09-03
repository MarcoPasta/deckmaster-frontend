import { ref } from "vue";

/**
 * The set of TCG games the app currently handles.
 * `digimon` is fully implemented but intentionally not exposed in the UI yet
 * (see `useTcgState` and `NavBar`).
 */
export type TcgType = "pokemon" | "naruto" | "digimon";

/** Key used to persist the selected TCG across page reloads. */
const STORAGE_KEY = "selectedTcg";

/**
 * TCGs that are currently selectable via the UI.
 * Used to validate the persisted value so a stale or manually set
 * sessionStorage entry can never leave the app in an inconsistent state
 * (e.g. landing on Digimon when CardEditor has no Digimon branch).
 */
const ENABLED_TCGS: readonly TcgType[] = ["pokemon", "naruto"];

/** Fallback when the persisted value is absent or unrecognised. */
const DEFAULT_TCG: TcgType = "pokemon";

/**
 * Returns `value` if it is a currently enabled TCG, otherwise `DEFAULT_TCG`.
 */
function sanitize(value: string | null): TcgType {
  return ENABLED_TCGS.includes(value as TcgType)
    ? (value as TcgType)
    : DEFAULT_TCG;
}

/**
 * Module-level singleton ref so every call to `useTcgState()` shares the
 * same reactive value — switching the TCG in NavBar is immediately reflected
 * in BuilderView, DecksView, etc. without prop-drilling.
 */
const selectedTcg = ref<TcgType>(sanitize(sessionStorage.getItem(STORAGE_KEY)));

/**
 * Composable for reading and updating the currently active TCG.
 *
 * - `selectedTcg` — reactive ref holding the active game (`"pokemon"` | `"naruto"`).
 * - `setTcg(tcg)` — updates the ref and persists the value to `sessionStorage`.
 */
export function useTcgState() {
  /**
   * Switch the active TCG and persist the choice so it survives page reloads.
   * Only values in `ENABLED_TCGS` should be passed here (NavBar enforces this).
   */
  function setTcg(tcg: TcgType) {
    selectedTcg.value = tcg;
    sessionStorage.setItem(STORAGE_KEY, tcg);
  }

  return {
    selectedTcg,
    setTcg,
  };
}
