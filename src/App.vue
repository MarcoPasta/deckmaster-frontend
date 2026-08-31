<script setup lang="ts">
/**
 * App.vue — root application shell.
 *
 * Responsibilities:
 * 1. Render the persistent NavBar at the top of every page.
 * 2. Render the active route via `<router-view>`.
 * 3. Host the single global `<v-snackbar>` — bound to the module-level
 *    `useSnackbar` singleton so any component can surface toast messages by
 *    calling `show(msg, color)`.
 * 4. Mirror the active TCG into a `data-tcg` attribute on `<body>` so CSS
 *    themes can be applied per-game via attribute selectors.
 */
import { watch } from "vue";
import NavBar from "@/components/NavBar.vue";
import { useTcgState } from "@/composables/useTcgState";
import { useSnackbar } from "@/composables/useSnackbar";

const { selectedTcg } = useTcgState();

/**
 * Destructure the module-level snackbar singleton refs.
 * These are the same refs that every `show(…)` call (from any component)
 * writes to, so this single `<v-snackbar>` renders all global feedback.
 */
const { message, visible, color } = useSnackbar();

/**
 * Keep `document.body[data-tcg]` in sync with the selected TCG.
 * CSS rules in `style.css` use this attribute to apply game-specific
 * colour variables (accent colours, backgrounds, etc.).
 */
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
  <!-- Global toast messages; driven by the useSnackbar singleton. -->
  <v-snackbar v-model="visible" :color="color">
    {{ message }}
  </v-snackbar>
</template>
