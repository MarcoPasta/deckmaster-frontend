<script setup lang="ts">
import { useUser } from "@clerk/vue";
import { computed, onMounted, ref } from "vue";
import { useProfile } from "../composables/useProfile";
import { useSnackbar } from "../composables/useSnackbar";
import type { SocialLink } from "../interfaces/interfaces";

const { user } = useUser();
const { fetchProfile, updateProfile, logPasswordChange } = useProfile();
const { show: showSnackbar } = useSnackbar();

// Profile fields
const email = ref("");
const username = ref("");
const profileImage = ref<string | null>(null);

function optimizedImageUrl(rawUrl: string | null | undefined): string | undefined {
  if (!rawUrl) return undefined;
  const separator = rawUrl.includes("?") ? "&" : "?";
  return `${rawUrl}${separator}width=160&height=160&fit=cover`;
}

// Social links
const socialLinks = ref<SocialLink[]>([]);
const newPlatform = ref<"twitter" | "discord" | "youtube" | "custom">(
  "twitter",
);
const newUrl = ref("");
const newLabel = ref("");

// Password fields
const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const showCurrentPw = ref(false);
const showNewPw = ref(false);
const showConfirmPw = ref(false);

// UI state
const savingProfile = ref(false);
const savingSocial = ref(false);
const savingPassword = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const deleteConfirmOpen = ref(false);
const linkToDelete = ref<number | null>(null);

// Computed
const fullName = computed(() => {
  if (!user.value) return "";
  const first = user.value.firstName || "";
  const last = user.value.lastName || "";
  return `${first} ${last}`.trim();
});

const displayInitials = computed(() => {
  if (user.value?.firstName && user.value?.lastName) {
    return (user.value.firstName[0] + user.value.lastName[0]).toUpperCase();
  }
  if (email.value) {
    return email.value[0].toUpperCase();
  }
  return "U";
});

const passwordsMatch = computed(() => {
  if (!newPassword.value) return false;
  return newPassword.value === confirmPassword.value;
});

// Load initial data
onMounted(async () => {
  if (user.value) {
    email.value = user.value.emailAddresses?.[0]?.emailAddress || "";
    username.value = user.value.username || "";
    profileImage.value = user.value.imageUrl || null;
  }

  // Fetch user profile from backend to get social links
  try {
    const profile = await fetchProfile();
    if (profile.social_links) {
      socialLinks.value = profile.social_links;
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    // Non-critical error - continue anyway
  }
});

// Avatar upload
async function uploadAvatar(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !user.value) return;

  savingProfile.value = true;
  try {
    await user.value.setProfileImage({ file });
    profileImage.value = user.value.imageUrl || null;
    showSnackbar("Profile photo updated successfully", "success");
  } catch (error) {
    console.error("Error uploading avatar:", error);
    showSnackbar("Failed to upload profile photo", "error");
  } finally {
    savingProfile.value = false;
  }
}

function removeImage() {
  profileImage.value = null;
  if (fileInput.value) fileInput.value.value = "";
}

// Profile save
async function saveProfile() {
  savingProfile.value = true;
  try {
    const updates: any = {};

    // Update first name if changed
    if (user.value?.firstName !== email.value) {
      updates.first_name = email.value;
    }

    // Note: Email and username changes should be handled through Clerk UI
    // since they require verification. We only update local profile fields.

    if (Object.keys(updates).length === 0) {
      showSnackbar("No changes to save", "info");
      return;
    }

    // Call backend to save profile updates
    await updateProfile(updates);

    // Refresh profile from backend to ensure sync
    const freshProfile = await fetchProfile();
    if (freshProfile) {
      if (freshProfile.social_links) {
        socialLinks.value = freshProfile.social_links;
      }
    }

    showSnackbar("Profile updated successfully", "success");
  } catch (error: any) {
    console.error("Error saving profile:", error);

    // Check if error response has validation errors
    const errorMessage =
      error?.response?.data?.errors?.join(", ") ||
      error?.response?.data?.error ||
      "Failed to save profile";

    showSnackbar(errorMessage, "error");
  } finally {
    savingProfile.value = false;
  }
}

// Social links
async function addSocialLink() {
  if (!newUrl.value) {
    showSnackbar("Please enter a URL", "warning");
    return;
  }

  const link: SocialLink = {
    platform: newPlatform.value,
    url: newUrl.value,
    label: newPlatform.value === "custom" ? newLabel.value : undefined,
  };

  socialLinks.value.push(link);
  newUrl.value = "";
  newLabel.value = "";
  newPlatform.value = "twitter";

  await saveSocialLinks();
}

function removeSocialLink(index: number) {
  linkToDelete.value = index;
  deleteConfirmOpen.value = true;
}

async function confirmRemoveSocialLink() {
  if (linkToDelete.value === null) return;

  socialLinks.value.splice(linkToDelete.value, 1);
  linkToDelete.value = null;
  deleteConfirmOpen.value = false;

  await saveSocialLinks();
}

async function saveSocialLinks() {
  savingSocial.value = true;
  try {
    await updateProfile({ social_links: socialLinks.value });

    // Fetch updated profile to ensure UI is in sync with server
    const updatedProfile = await fetchProfile();
    if (updatedProfile.social_links) {
      socialLinks.value = updatedProfile.social_links;
    }

    showSnackbar("Social links updated", "success");
  } catch (error: any) {
    console.error("Error saving social links:", error);

    // Check if error response has validation errors
    const errorMessage =
      error?.response?.data?.errors?.join(", ") ||
      error?.response?.data?.error ||
      "Failed to save social links";

    showSnackbar(errorMessage, "error");
  } finally {
    savingSocial.value = false;
  }
}

// Password change
async function savePassword() {
  if (!user.value) return;
  if (!passwordsMatch.value) {
    showSnackbar("Passwords do not match", "error");
    return;
  }

  savingPassword.value = true;
  try {

    
    await user.value.updatePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });

    // Log the password change to backend for audit trail
    try {
      await logPasswordChange();
    } catch (logError) {
      console.error("Failed to log password change:", logError);
      // Don't show error to user - password was already changed successfully
    }

    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    showSnackbar("Password updated successfully", "success");
  } catch (error: any) {
    console.error("Error updating password:", error);

    // Check if error response has validation errors
    const errorMessage =
      error?.errors?.[0]?.message ||
      error?.response?.data?.error ||
      "Failed to update password";

    showSnackbar(errorMessage, "error");
  } finally {
    savingPassword.value = false;
  }
}

const platformLabels: Record<
  "twitter" | "discord" | "youtube" | "custom",
  string
> = {
  twitter: "Twitter/X",
  discord: "Discord",
  youtube: "YouTube",
  custom: "Custom",
};

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    twitter: "mdi-twitter",
    discord: "mdi-discord",
    youtube: "mdi-youtube",
    custom: "mdi-link",
  };
  return icons[platform] || "mdi-link";
}
</script>

<template>
  <div class="profile-page">
    <div class="profile-card">
      <h2 class="section-title">Profile</h2>

      <!-- Avatar -->
      <div class="avatar-section">
        <div class="avatar-container">
          <v-avatar
            :color="
              profileImage || user?.imageUrl
                ? undefined
                : 'deep-purple-accent-2'
            "
            size="80"
          >
            <v-img
              v-if="optimizedImageUrl(profileImage || user?.imageUrl)"
              :src="optimizedImageUrl(profileImage || user?.imageUrl)"
              cover
            />
            {{ displayInitials }}
          </v-avatar>
        </div>
        <div class="avatar-actions">
          <v-btn size="small" variant="outlined" @click="fileInput?.click()">
            Upload Photo
          </v-btn>
          <v-btn
            v-if="profileImage"
            size="small"
            variant="text"
            color="error"
            @click="removeImage"
          >
            Remove
          </v-btn>
        </div>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          hidden
          @change="uploadAvatar"
        />
      </div>

      <v-divider class="my-4" />

      <!-- Name fields -->
      <div class="form-section">
        <h3 class="subsection-title">Name</h3>
        <p v-if="fullName" class="form-text">{{ fullName }}</p>
        <p v-else class="form-text form-text--placeholder">No name set</p>
      </div>

      <!-- Email & Username -->
      <div class="form-section">
        <h3 class="subsection-title">Account</h3>
        <div class="form-stack">
          <v-text-field
            v-model="email"
            label="Email"
            variant="outlined"
            density="compact"
            hide-details
            type="email"
          />
          <v-text-field
            v-model="username"
            label="Username"
            variant="outlined"
            density="compact"
            hide-details
          />
        </div>
        <div class="form-actions">
          <v-btn
            color="deep-purple-accent-2"
            :loading="savingProfile"
            :disabled="savingProfile"
            @click="saveProfile"
          >
            Save Changes
          </v-btn>
        </div>
      </div>

      <v-divider class="my-6" />

      <!-- Social Links -->
      <div class="form-section">
        <h3 class="subsection-title">Social Links</h3>

        <!-- List existing links -->
        <div v-if="socialLinks.length > 0" class="social-links-list">
          <div
            v-for="(link, index) in socialLinks"
            :key="index"
            class="social-link-item"
          >
            <div class="social-link-content">
              <v-icon :icon="getPlatformIcon(link.platform)" size="20" />
              <div class="social-link-info">
                <p class="social-link-platform">
                  {{
                    platformLabels[
                      link.platform as keyof typeof platformLabels
                    ] || link.platform
                  }}
                  <span v-if="link.label" class="social-link-label"
                    >({{ link.label }})</span
                  >
                </p>
                <a :href="link.url" target="_blank" class="social-link-url">
                  {{ link.url }}
                </a>
              </div>
            </div>
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="removeSocialLink(index)"
            />
          </div>
        </div>

        <!-- Add new link -->
        <div class="social-links-form">
          <div class="form-row">
            <v-select
              v-model="newPlatform"
              :items="[
                { title: 'Twitter/X', value: 'twitter' },
                { title: 'Discord', value: 'discord' },
                { title: 'YouTube', value: 'youtube' },
                { title: 'Custom', value: 'custom' },
              ]"
              label="Platform"
              variant="outlined"
              density="compact"
              hide-details
            />
            <v-text-field
              v-model="newUrl"
              label="URL"
              variant="outlined"
              density="compact"
              hide-details
              type="url"
            />
          </div>
          <v-text-field
            v-if="newPlatform === 'custom'"
            v-model="newLabel"
            label="Link Label (e.g., 'Personal Website')"
            variant="outlined"
            density="compact"
            hide-details
          />
          <div class="form-actions">
            <v-btn
              color="deep-purple-accent-2"
              :loading="savingSocial"
              :disabled="savingSocial"
              @click="addSocialLink"
            >
              Add Link
            </v-btn>
          </div>
        </div>
      </div>

      <v-divider class="my-6" />

      <!-- Password section -->
      <div class="form-section">
        <h3 class="subsection-title">Change Password</h3>

        <div class="form-stack">
          <v-text-field
            v-model="currentPassword"
            label="Current Password"
            :type="showCurrentPw ? 'text' : 'password'"
            variant="outlined"
            density="compact"
            hide-details
            :append-inner-icon="showCurrentPw ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showCurrentPw = !showCurrentPw"
          />
          <v-text-field
            v-model="newPassword"
            label="New Password"
            :type="showNewPw ? 'text' : 'password'"
            variant="outlined"
            density="compact"
            hide-details
            :append-inner-icon="showNewPw ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showNewPw = !showNewPw"
          />
          <v-text-field
            v-model="confirmPassword"
            label="Confirm New Password"
            :type="showConfirmPw ? 'text' : 'password'"
            variant="outlined"
            density="compact"
            hide-details
            :error="confirmPassword.length > 0 && !passwordsMatch"
            :append-inner-icon="showConfirmPw ? 'mdi-eye-off' : 'mdi-eye'"
            @click:append-inner="showConfirmPw = !showConfirmPw"
          />
        </div>

        <div class="form-actions">
          <v-btn
            color="deep-purple-accent-2"
            :disabled="
              !currentPassword ||
              !newPassword ||
              !passwordsMatch ||
              savingPassword
            "
            :loading="savingPassword"
            @click="savePassword"
          >
            Update Password
          </v-btn>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Social Link Confirmation Dialog -->
  <v-dialog v-model="deleteConfirmOpen" max-width="400">
    <v-card rounded="xl">
      <v-card-title class="text-h6">Delete Social Link?</v-card-title>
      <v-card-text>
        Are you sure you want to remove this social link? This action cannot be
        undone.
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn variant="text" @click="deleteConfirmOpen = false">
          Cancel
        </v-btn>
        <v-btn color="error" variant="tonal" @click="confirmRemoveSocialLink">
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.profile-page {
  display: flex;
  justify-content: center;
  padding: 24px 16px;
  box-sizing: border-box;
}

.profile-card {
  width: 100%;
  max-width: 560px;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px 32px;
  box-shadow: var(--shadow);
}

.section-title {
  font-size: 20px;
  margin: 0 0 20px;
  font-weight: 600;
}

.subsection-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--text);
  opacity: 0.8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-section {
  margin-bottom: 20px;
}

.form-text {
  margin: 0;
  padding: 8px 0;
  font-size: 14px;
  color: var(--text);
}

.form-text--placeholder {
  opacity: 0.6;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.avatar-container {
  flex-shrink: 0;
}

.avatar-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.form-row > :deep(*) {
  flex: 1;
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  gap: 8px;
}

.social-links-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.social-link-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--accent-bg);
  border-radius: 8px;
  border: 1px solid var(--border);
  gap: 12px;
}

.social-link-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}

.social-link-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.social-link-platform {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.social-link-label {
  opacity: 0.7;
  font-size: 12px;
}

.social-link-url {
  margin: 0;
  font-size: 12px;
  color: var(--accent);
  text-decoration: none;
  word-break: break-all;
}

.social-link-url:hover {
  text-decoration: underline;
}

.social-links-form {
  padding: 12px;
  background: var(--accent-bg);
  border-radius: 8px;
  border: 1px dashed var(--border);
}

.my-4 {
  margin: 16px 0;
}

.my-6 {
  margin: 24px 0;
}

@media (max-width: 480px) {
  .profile-card {
    padding: 20px 16px;
  }

  .avatar-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-row {
    flex-direction: column;
  }
}
</style>
