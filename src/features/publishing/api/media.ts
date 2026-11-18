/** SocialAPI media library (docs: guides/media, api-reference/media/*). */
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, toQuery } from "@/shared/api";

import type { MediaInput } from "./types";

/** GET /media item — only `ready` files are listed, newest first. */
export interface MediaFile {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: "pending" | "ready" | "failed";
  created_at: string;
  /** Preview link, valid 2 h, opens without an API key — don't log it. */
  url: string;
}

interface MediaListResponse {
  count: number;
  data: MediaFile[] | null;
  next_cursor?: string;
}

/** GET /media/storage — only ready files count. limit_bytes -1 = unlimited. */
export interface StorageUsage {
  used_bytes: number;
  limit_bytes: number;
  count: number;
}

/** POST /media/upload limit (the presigned flow has none, only the storage quota). */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const PAGE_SIZE = 50;

export const mediaKeys = {
  all: ["media"] as const,
  list: ["media", "list"] as const,
  /** First 100 items, used to preview media_id attachments. */
  library: ["media", "library"] as const,
  storage: ["media", "storage"] as const,
};

/** Local previews of files uploaded in this session (media_id → object URL). */
const localPreviews = new Map<string, string>();

export const isVideoType = (contentType: string) => contentType.startsWith("video/");

/** POST /media/upload (multipart field `file`, ≤ 50 MB) — the file is ready immediately. */
export async function uploadMedia(file: File): Promise<MediaInput> {
  const form = new FormData();
  form.append("file", file, file.name);
  const { media_id } = await api.upload<{ media_id: string }>("/media/upload", form);
  localPreviews.set(media_id, URL.createObjectURL(file));
  return {
    source: media_id,
    source_type: "media_id",
    type: isVideoType(file.type) ? "video" : "image",
  };
}

/** A library file as a post attachment. */
export const toMediaInput = (f: MediaFile): MediaInput => ({
  source: f.id,
  source_type: "media_id",
  type: isVideoType(f.content_type) ? "video" : "image",
});

/** Cursor-paginated GET /media; `files` is every loaded page, flattened. */
export function useMediaFiles() {
  const query = useInfiniteQuery({
    queryKey: mediaKeys.list,
    queryFn: ({ pageParam }) =>
      api.get<MediaListResponse>(
        `/media${toQuery({ limit: PAGE_SIZE, cursor: pageParam || undefined })}`,
      ),
    initialPageParam: "",
    getNextPageParam: (last) => last.next_cursor || undefined,
    // Preview links last 2 h.
    staleTime: 30 * 60_000,
  });
  const files = query.data?.pages.flatMap((p) => p.data ?? []);
  return { ...query, files };
}

export function useStorageUsage() {
  return useQuery({
    queryKey: mediaKeys.storage,
    queryFn: () => api.get<StorageUsage>("/media/storage"),
  });
}

export function useUploadMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadMedia,
    onSuccess: () => qc.invalidateQueries({ queryKey: mediaKeys.all }),
  });
}

/**
 * DELETE /media/{id} → 204. Not blocked when a scheduled post uses the file: that post
 * then fails when it publishes.
 */
export function useDeleteMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/media/${encodeURIComponent(id)}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: mediaKeys.all }),
  });
}

/** First 100 library items — only used to show previews of media_id attachments. */
function useMediaLibrary(enabled: boolean) {
  return useQuery({
    queryKey: mediaKeys.library,
    queryFn: async () => (await api.get<MediaListResponse>("/media?limit=100")).data ?? [],
    enabled,
    staleTime: 30 * 60_000,
  });
}

/** Displayable URL for a media item: the URL itself, a local preview, or the library link. */
export function useMediaPreview(m: MediaInput): string | undefined {
  const isLibrary = m.source_type === "media_id";
  const local = isLibrary ? localPreviews.get(m.source) : undefined;
  const library = useMediaLibrary(isLibrary && !local);
  if (m.source_type === "url") return m.source;
  if (local) return local;
  return library.data?.find((f) => f.id === m.source)?.url;
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString("vi-VN", { maximumFractionDigits: v < 10 ? 1 : 0 })} ${units[i]}`;
}
