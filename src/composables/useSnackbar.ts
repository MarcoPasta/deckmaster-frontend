import { ref } from "vue";

// Module-level singleton state so every caller shares the same snackbar.
// The global <v-snackbar> lives in App.vue; without shared state, show()
// calls from other components would update refs nobody renders.
const message = ref("");
const visible = ref(false);
const color = ref<string>("success");

export function useSnackbar() {
  function show(msg: string, colorType: string = "success") {
    message.value = msg;
    color.value = colorType;
    visible.value = true;
  }

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
