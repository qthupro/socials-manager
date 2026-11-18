import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, userKeys, type ListResponse } from "@/shared/api";

import { accountKeys, brandKeys } from "./keys";
import type { Brand } from "./types";

export function useBrands() {
  return useQuery({
    queryKey: brandKeys.all,
    queryFn: async () => (await api.get<ListResponse<Brand>>("/brands")).data,
  });
}

export function useCreateBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.post<Brand>("/brands", { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brandKeys.all });
      qc.invalidateQueries({ queryKey: userKeys.usage });
    },
  });
}

export function useRenameBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<Brand>(`/brands/${encodeURIComponent(id)}`, { name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: brandKeys.all }),
  });
}

/** Deleting a brand also disconnects all its accounts. */
export function useDeleteBrand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/brands/${encodeURIComponent(id)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: brandKeys.all });
      qc.invalidateQueries({ queryKey: accountKeys.all });
      qc.invalidateQueries({ queryKey: userKeys.usage });
    },
  });
}
