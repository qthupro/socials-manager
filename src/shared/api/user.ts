/** Account-level SocialAPI data used across features: current user and plan usage. */
import { useQuery } from "@tanstack/react-query";

import { useApiKey } from "./api-key-store";
import { api } from "./client";

export interface Me {
  id: string;
  email: string;
  plan: string;
  allowed_platforms: string[];
  avatar_url: string | null;
  billing_blocked: boolean;
  facebook_page_selection: boolean;
  lock_accounts_to_brand: boolean;
}

export interface Usage {
  /** -1 = unlimited for every *_limit field. */
  brands_used: number;
  brands_limit: number;
  posts_used: number;
  posts_limit: number;
  interactions_used: number;
  interactions_limit: number;
  period_start: string;
  period_end: string;
}

export const userKeys = {
  me: ["me"] as const,
  usage: ["usage"] as const,
};

export function useMe() {
  const hasKey = useApiKey((s) => !!s.apiKey);
  return useQuery({
    queryKey: userKeys.me,
    queryFn: () => api.get<Me>("/users/me"),
    enabled: hasKey,
  });
}

export function useUsage() {
  const hasKey = useApiKey((s) => !!s.apiKey);
  return useQuery({
    queryKey: userKeys.usage,
    queryFn: () => api.get<Usage>("/usage"),
    enabled: hasKey,
  });
}
