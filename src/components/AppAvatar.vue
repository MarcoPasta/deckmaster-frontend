<script setup lang="ts">
import { useClerk, useUser } from "@clerk/vue";
import { computed } from "vue";
import { useRouter } from "vue-router";

const { user } = useUser();
const clerk = useClerk();
const router = useRouter();

const userInitials = computed(() => {
  if (user.value?.firstName && user.value?.lastName) {
    return (user.value.firstName[0] + user.value.lastName[0]).toUpperCase();
  }
  if (user.value?.emailAddresses?.[0]?.emailAddress) {
    return user.value.emailAddresses[0].emailAddress[0].toUpperCase();
  }
  return "U";
});

const avatarImage = computed(() => {
  const url = user.value?.imageUrl;
  if (!url) return undefined;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}width=80&height=80&fit=cover`;
});

async function handleSignOut() {
  if (clerk.value) {
    await clerk.value.signOut();
    router.push("/");
  }
}

function goToProfile() {
  router.push("/profile");
}
</script>

<template>
  <div class="app-avatar">
    <v-menu>
      <template #activator="{ props }">
        <v-avatar
          v-bind="props"
          :color="avatarImage ? undefined : 'deep-purple-accent-2'"
          size="40"
          class="avatar-button"
        >
          <v-img v-if="avatarImage" :src="avatarImage" cover />
          {{ userInitials }}
        </v-avatar>
      </template>

      <v-list class="avatar-menu">
        <v-list-item @click="goToProfile">
          <template #prepend>
            <v-icon icon="mdi-account" />
          </template>
          <v-list-item-title>My Profile</v-list-item-title>
        </v-list-item>

        <v-divider />

        <v-list-item @click="handleSignOut">
          <template #prepend>
            <v-icon icon="mdi-logout" />
          </template>
          <v-list-item-title>Sign Out</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </div>
</template>

<style scoped>
.app-avatar {
  display: flex;
  align-items: center;
  padding: 4px 12px;
}

.avatar-button {
  cursor: pointer;
  transition: transform 0.2s;
}

.avatar-button:hover {
  transform: scale(1.05);
}

.avatar-menu {
  min-width: 180px;
}
</style>
