<script setup lang="ts">
import { Show, SignInButton, UserButton, useUser } from "@clerk/vue";
import { computed, ref } from "vue";
import { useTcgState, type TcgType } from "../composables/useTcgState";

const { selectedTcg, setTcg } = useTcgState();
const { user } = useUser();
const isAdmin = computed(
  () => (user.value?.publicMetadata as { role?: string })?.role === "admin",
);

const navItems = [
  { label: "Home", path: "/" },
  { label: "Builder", path: "/builder" },
  { label: "Decks", path: "/decks", ShowWhen: "signed-in" as const },
  { label: "Upload", path: "/upload", adminOnly: true },
  { label: "Cardeditor", path: "/cardeditor", adminOnly: true },
  // { label: "Profile", path: "/profile" },
];

const tcgOptions: { label: string; value: TcgType }[] = [
  { label: "Pokémon", value: "pokemon" },
  { label: "Naruto Mythos", value: "naruto" },
];
const tcgMenuOpen = ref(false);
const mobileMenuOpen = ref(false);

const tcgLabel = () =>
  tcgOptions.find((o) => o.value === selectedTcg.value)?.label ?? "Pokémon";
</script>

<template>
  <nav class="navbar">
    <div class="nav-item nav-user">
      <Show when="signed-in">
        <UserButton />
      </Show>
      <Show when="signed-out">
        <SignInButton />
      </Show>
    </div>
    <div class="tcg-dropdown">
      <button class="nav-item tcg-trigger" @click="tcgMenuOpen = !tcgMenuOpen">
        {{ tcgLabel() }}
        <v-icon icon="mdi-chevron-down" class="tcg-arrow" />
      </button>
      <div v-if="tcgMenuOpen" class="tcg-menu">
        <button
          v-for="option in tcgOptions"
          :key="option.value"
          class="tcg-option"
          :class="{ 'tcg-option--active': option.value === selectedTcg }"
          @click="
            setTcg(option.value);
            tcgMenuOpen = false;
          "
        >
          {{ option.label }}
        </button>
      </div>
    </div>
    <button class="burger-btn" @click="mobileMenuOpen = !mobileMenuOpen">
      <v-icon :icon="mobileMenuOpen ? 'mdi-close' : 'mdi-menu'" />
    </button>
    <div class="nav-links">
      <template v-for="item in navItems" :key="item.path">
        <template v-if="item.adminOnly">
          <router-link
            v-if="isAdmin"
            :to="item.path"
            class="nav-item"
            active-class="nav-item--active"
          >
            {{ item.label }}
          </router-link>
        </template>
        <Show v-else-if="item.ShowWhen" :when="item.ShowWhen">
          <router-link
            :to="item.path"
            class="nav-item"
            active-class="nav-item--active"
          >
            {{ item.label }}
          </router-link>
        </Show>
        <router-link
          v-else
          :to="item.path"
          class="nav-item"
          active-class="nav-item--active"
        >
          {{ item.label }}
        </router-link>
      </template>
    </div>
  </nav>
  <Teleport to="body">
    <Transition name="sidebar">
      <div
        v-if="mobileMenuOpen"
        class="sidebar-overlay"
        @click="mobileMenuOpen = false"
      >
        <div class="sidebar" @click.stop>
          <template v-for="item in navItems" :key="item.path">
            <template v-if="item.adminOnly">
              <router-link
                v-if="isAdmin"
                :to="item.path"
                class="sidebar-item"
                active-class="sidebar-item--active"
                @click="mobileMenuOpen = false"
              >
                {{ item.label }}
              </router-link>
            </template>
            <Show v-else-if="item.ShowWhen" :when="item.ShowWhen">
              <router-link
                :to="item.path"
                class="sidebar-item"
                active-class="sidebar-item--active"
                @click="mobileMenuOpen = false"
              >
                {{ item.label }}
              </router-link>
            </Show>
            <router-link
              v-else
              :to="item.path"
              class="sidebar-item"
              active-class="sidebar-item--active"
              @click="mobileMenuOpen = false"
            >
              {{ item.label }}
            </router-link>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow);
  width: fit-content;
  margin: 8px auto 0;
}

.nav-item {
  padding: 8px 20px;
  border-radius: 8px;
  font-family: var(--sans);
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  text-decoration: none;
  transition:
    background 0.2s,
    color 0.2s;
  min-width: 40px;
  text-align: center;
}

.nav-item:hover {
  background: var(--accent-bg);
  color: var(--text-h);
}

.nav-item--active {
  background: var(--accent);
  color: #fff;
}

.nav-item--active:hover {
  background: var(--accent);
  color: #fff;
}

.nav-user {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
}

.tcg-dropdown {
  position: relative;
}

.tcg-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  border: none;
  background: none;
}

.tcg-arrow {
  font-size: 12px;
  opacity: 0.7;
}

.tcg-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 160px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow);
  padding: 4px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.tcg-option {
  padding: 8px 14px;
  border: none;
  background: none;
  border-radius: 6px;
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.tcg-option:hover {
  background: var(--accent-bg);
  color: var(--text-h);
}

.tcg-option--active {
  background: var(--accent);
  color: #fff;
}

.tcg-option--active:hover {
  background: var(--accent);
  color: #fff;
}

.burger-btn {
  display: none;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: none;
  background: none;
  border-radius: 8px;
  color: var(--text);
  cursor: pointer;
  transition: background 0.2s;
}

.burger-btn:hover {
  background: var(--accent-bg);
}

.nav-links {
  display: contents;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 9999;
}

.sidebar {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 260px;
  background: var(--code-bg);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-item {
  padding: 12px 16px;
  border-radius: 8px;
  font-family: var(--sans);
  font-size: 16px;
  font-weight: 500;
  color: var(--text);
  text-decoration: none;
  transition:
    background 0.2s,
    color 0.2s;
}

.sidebar-item:hover {
  background: var(--accent-bg);
  color: var(--text-h);
}

.sidebar-item--active {
  background: var(--accent);
  color: #fff;
}

.sidebar-item--active:hover {
  background: var(--accent);
  color: #fff;
}

.sidebar-enter-active,
.sidebar-leave-active {
  transition: opacity 0.2s ease;
}

.sidebar-enter-active .sidebar,
.sidebar-leave-active .sidebar {
  transition: transform 0.2s ease;
}

.sidebar-enter-from,
.sidebar-leave-to {
  opacity: 0;
}

.sidebar-enter-from .sidebar,
.sidebar-leave-to .sidebar {
  transform: translateX(100%);
}

@media (max-width: 480px) {
  .navbar {
    gap: 2px;
    padding: 4px;
    border-radius: 10px;
    margin: 6px auto 0;
  }

  .burger-btn {
    display: flex;
  }

  .nav-links {
    display: none;
  }

  .nav-item {
    padding: 6px 10px;
    font-size: 13px;
    min-width: unset;
  }

  .nav-user {
    padding: 4px 8px;
  }
}
</style>
