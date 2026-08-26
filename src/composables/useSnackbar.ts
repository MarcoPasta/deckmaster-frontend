import { ref } from "vue";

export function useSnackbar() {
  const message = ref("");
  const visible = ref(false);
  const color = ref<string>("success");

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
