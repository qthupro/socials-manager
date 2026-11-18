/**
 * Facebook Page management (docs: platforms/facebook, api-reference/accounts + facebook).
 * There is no API to remove or rename a single Page: deactivate it, or disconnect the account.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/shared/api";

import { accountKeys, brandKeys, facebookKeys } from "./keys";

/** A Page held by a connected Facebook account. */
export interface AccountPage {
  /** sapi_page_… — the id used as page_id everywhere in SocialAPI. */
  id: string;
  /** Facebook's own Page id. */
  platform_page_id: string;
  name: string;
  /** Inactive Pages can't be published to; only active ones count toward the plan's Page cap. */
  is_active: boolean;
  /** Used when no page_id is given (e.g. insights). */
  is_default: boolean;
  username?: string;
  category?: string;
  followers_count?: number;
  link?: string;
  profile_picture_url?: string;
  cover_photo_url?: string;
  about?: string;
  verification_status?: string;
}

/** A Page the Facebook login can manage, and which brand (if any) holds it. */
export interface LoginPage {
  platform_page_id: string;
  name: string;
  /** true when none of your brands holds the Page. */
  assignable: boolean;
  assigned_brand_id?: string;
  assigned_brand_name?: string;
  assigned_account_id?: string;
  category?: string;
  picture_url?: string;
}

/** Query options for GET /accounts/{id}/pages — shared so other features hit the same cache. */
export const accountPagesQuery = (accountId: string) => ({
  queryKey: facebookKeys.accountPages(accountId),
  queryFn: async () =>
    (await api.get<{ data: AccountPage[] }>(`/accounts/${encodeURIComponent(accountId)}/pages`))
      .data,
  staleTime: 5 * 60_000,
});

export function useAccountPages(accountId: string, enabled = true) {
  return useQuery({ ...accountPagesQuery(accountId), enabled });
}

export function useLoginPages(loginId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: facebookKeys.loginPages(loginId ?? ""),
    queryFn: async () =>
      (
        await api.get<{ pages: LoginPage[]; count: number }>(
          `/platforms/facebook/logins/${encodeURIComponent(loginId!)}/pages`,
        )
      ).pages,
    enabled: enabled && !!loginId,
  });
}

/** Toggle is_active / set is_default on one Page. */
export function useUpdatePage(accountId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      pageId,
      ...body
    }: {
      pageId: string;
      is_active?: boolean;
      is_default?: boolean;
    }) =>
      api.patch<AccountPage>(
        `/accounts/${encodeURIComponent(accountId)}/pages/${encodeURIComponent(pageId)}`,
        body,
      ),
    onSuccess: () => {
      // Setting a default may change other Pages too — refetch the list.
      qc.invalidateQueries({ queryKey: facebookKeys.accountPages(accountId) });
      qc.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

/**
 * Add a Page to a brand. A Page held by another of your brands moves here
 * (each Page belongs to exactly one brand). Subject to the plan's Page cap.
 */
export function useAssignPage(loginId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ platformPageId, brandId }: { platformPageId: string; brandId: string }) =>
      api.post<{ account_id: string; brand_id: string; platform_page_id: string }>(
        `/platforms/facebook/logins/${encodeURIComponent(loginId)}/pages/${encodeURIComponent(platformPageId)}/assign`,
        { brand_id: brandId },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: facebookKeys.all });
      qc.invalidateQueries({ queryKey: accountKeys.all });
      qc.invalidateQueries({ queryKey: brandKeys.all });
    },
  });
}
