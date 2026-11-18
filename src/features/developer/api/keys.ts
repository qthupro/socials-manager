/**
 * API key hooks (docs: guides/authentication, guides/scoped-keys, api-reference/api-keys/*).
 * Everything except GET /keys/scopes needs a full-access key.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type ListResponse } from "@/shared/api";

import type { ApiKeyItem, IssuedKey, KeyParams, KeyScope } from "./types";

export const keyKeys = {
  all: ["api-keys"] as const,
  list: ["api-keys", "list"] as const,
  scopes: ["api-keys", "scopes"] as const,
};

const path = (id: string) => `/keys/${encodeURIComponent(id)}`;

/** Newest first, revoked keys included (is_active=false). */
export function useApiKeys() {
  return useQuery({
    queryKey: keyKeys.list,
    queryFn: async () => (await api.get<ListResponse<ApiKeyItem>>("/keys")).data ?? [],
  });
}

/** Scope catalog for the picker; any valid key can read it. */
export function useKeyScopes() {
  return useQuery({
    queryKey: keyKeys.scopes,
    queryFn: async () => (await api.get<ListResponse<KeyScope>>("/keys/scopes")).data ?? [],
    staleTime: 60 * 60_000,
  });
}

export function useCreateKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: KeyParams) => api.post<IssuedKey>("/keys", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keyKeys.list }),
  });
}

/** Replaces name, scopes and brand_ids together; the secret is unchanged. */
export function useUpdateKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: KeyParams }) => api.patch(path(id), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keyKeys.list }),
  });
}

/** New secret, same id / name / restrictions. The old secret stops working at once. */
export function useRotateKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<IssuedKey>(`${path(id)}/rotate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keyKeys.list }),
  });
}

/** Irreversible. */
export function useRevokeKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(path(id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: keyKeys.list }),
  });
}
