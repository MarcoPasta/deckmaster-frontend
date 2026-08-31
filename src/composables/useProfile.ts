import { useApi } from "@/composables/useApi";
import type { UserProfile } from "@/interfaces/interfaces";

/** Shape of the data sent to `PUT /auth/profile`. */
export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  /** Full replacement list for the user's social links. */
  social_links?: Array<{
    id?: string;
    platform: "twitter" | "discord" | "youtube" | "custom";
    url: string;
    /** Only required when `platform === "custom"`. */
    label?: string;
  }>;
}

/**
 * Composable for the user's backend profile (distinct from Clerk account data).
 *
 * The backend profile stores data that Clerk does not manage — currently just
 * social links and a password-change audit log.  Email, username and profile
 * photo are managed directly via Clerk (see ProfileView).
 */
export function useProfile() {
  const { get, put, post, loading, error } = useApi();

  /**
   * Fetch the current user's backend profile.
   * Called on ProfileView mount to load stored social links.
   */
  async function fetchProfile(): Promise<UserProfile> {
    return await get<UserProfile>("/auth/profile");
  }

  /**
   * Persist changes to the backend profile (e.g. updated social links).
   * Returns the server-side representation so the UI can sync with any
   * server-side normalisations.
   */
  async function updateProfile(data: ProfileUpdateData): Promise<UserProfile> {
    return await put<UserProfile>("/auth/profile", data);
  }

  /**
   * Record a password change event in the backend audit log.
   * Called after a successful `user.updatePassword()` Clerk call so the
   * server can track when passwords were last changed.  Errors here are
   * non-fatal — the password was already updated.
   */
  async function logPasswordChange(): Promise<void> {
    return await post<void>("/auth/profile/log-password-change", {});
  }

  return {
    fetchProfile,
    updateProfile,
    logPasswordChange,
    /** Reactive loading flag from `useApi`. */
    loading,
    /** Reactive error from `useApi`; holds the last `ApiError` or `null`. */
    error,
  };
}
