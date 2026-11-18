import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, userKeys, type ListResponse } from "@/shared/api";

import { accountKeys, brandKeys } from "./keys";
import type { ConnectRequest, ConnectResponse, SocialAccount } from "./types";

export function useAccounts(
  brandId?: string,
  options?: { refetchInterval?: number | false; enabled?: boolean },
) {
  return useQuery({
    queryKey: accountKeys.list(brandId),
    queryFn: async () => {
      const query = brandId ? `?brand_id=${encodeURIComponent(brandId)}` : "";
      return (await api.get<ListResponse<SocialAccount>>(`/accounts${query}`)).data;
    },
    refetchInterval: options?.refetchInterval,
    enabled: options?.enabled,
  });
}

/**
 * Starts a connection (or a reconnect: same platform + the account's brand_id).
 * Credential platforms return the account right away; OAuth ones return an auth_url.
 */
export function useConnectAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: ConnectRequest) => api.post<ConnectResponse>("/accounts/connect", req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountKeys.all });
      qc.invalidateQueries({ queryKey: brandKeys.all });
    },
  });
}

/** Irreversible: stored data is deleted and a later reconnect gets a new account id. */
export function useDisconnectAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${encodeURIComponent(id)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountKeys.all });
      qc.invalidateQueries({ queryKey: brandKeys.all });
      qc.invalidateQueries({ queryKey: userKeys.usage });
    },
  });
}
