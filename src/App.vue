<script setup lang="ts">
import { watch } from "vue";
import NavBar from "./components/NavBar.vue";
import { useTcgState } from "./composables/useTcgState";
import { useSnackbar } from "./composables/useSnackbar";

const { selectedTcg } = useTcgState();
const { message, visible, color } = useSnackbar();

watch(
  selectedTcg,
  (tcg) => {
    document.body.setAttribute("data-tcg", tcg);
  },
  { immediate: true },
);
</script>

<template>
  <NavBar />
  <router-view />
  <v-snackbar v-model="visible" :color="color">
    {{ message }}
  </v-snackbar>
</template>
