import { ref } from "vue";

/**
 * Module-level singleton state.
 *
 * These refs live outside `useSnackbar()` so that every component calling
 * `useSnackbar()` shares the exact same reactive values. Without this, each
 * call would create isolated refs and `show()` calls from child components
 * (e.g. ProfileView) would never update the `<v-snackbar>` rendered in App.vue.
 */

/** The text content currently shown inside the snackbar. */
const message = ref("");

/** Controls snackbar visibility; bound to `v-model` on `<v-snackbar>`. */
const visible = ref(false);

/** Vuetify colour name passed to the snackbar's `:color` prop (e.g. "success", "error"). */
const color = ref<string>("success");

/**
 * Global snackbar composable.
 *
 * Call `show(msg, colorType)` from any component to surface a toast message.
 * The actual `<v-snackbar>` element lives in `App.vue` and binds to the
 * module-level refs above.
 *
 * @example
 * const { show } = useSnackbar();
 * show("Deck saved", "success");
 * show("Something went wrong", "error");
 */
export function useSnackbar() {
  /**
   * Display a snackbar message.
   * @param msg - Text to show.
   * @param colorType - Vuetify colour string. Defaults to `"success"`.
   */
  function show(msg: string, colorType: string = "success") {
    message.value = msg;
    color.value = colorType;
    visible.value = true;
  }

  /** Hide the snackbar immediately (also called automatically by Vuetify on timeout). */
  function hide() {
    visible.value = false;
  }

  return {
    message,
    visible,
    color,
    show,
    hide,
  };
}
