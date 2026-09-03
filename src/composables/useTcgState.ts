import { ref } from "vue";

export type TcgType = "pokemon" | "naruto" | "digimon";

const STORAGE_KEY = "selectedTcg";

// TCGs currently surfaced in the UI. Digimon is fully implemented but
// intentionally not exposed yet (see NavBar). Keeping it out of this list
// prevents a stale/invalid sessionStorage value from leaving the app in an
// unselectable, inconsistent state.
const ENABLED_TCGS: readonly TcgType[] = ["pokemon", "naruto"];
const DEFAULT_TCG: TcgType = "pokemon";

function sanitize(value: string | null): TcgType {
  return ENABLED_TCGS.includes(value as TcgType)
    ? (value as TcgType)
    : DEFAULT_TCG;
}

const selectedTcg = ref<TcgType>(sanitize(sessionStorage.getItem(STORAGE_KEY)));

export function useTcgState() {
  function setTcg(tcg: TcgType) {
    selectedTcg.value = tcg;
    sessionStorage.setItem(STORAGE_KEY, tcg);
  }

  return {
    selectedTcg,
    setTcg,
  };
}
