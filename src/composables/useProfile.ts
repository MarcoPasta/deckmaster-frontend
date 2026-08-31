import { useApi } from "./useApi";
import type { UserProfile } from "@/interfaces/interfaces";

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  social_links?: Array<{
    id?: string;
    platform: "twitter" | "discord" | "youtube" | "custom";
    url: string;
    label?: string;
  }>;
}

export function useProfile() {
  const { get, put, post, loading, error } = useApi();

  async function fetchProfile(): Promise<UserProfile> {
    return await get<UserProfile>("/auth/profile");
  }

  async function updateProfile(data: ProfileUpdateData): Promise<UserProfile> {
    return await put<UserProfile>("/auth/profile", data);
  }

  async function logPasswordChange(): Promise<void> {
    return await post<void>("/auth/profile/log-password-change", {});
  }

  return {
    fetchProfile,
    updateProfile,
    logPasswordChange,
    loading,
    error,
  };
}
