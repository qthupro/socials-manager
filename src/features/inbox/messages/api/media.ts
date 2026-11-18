import { useQuery } from "@tanstack/react-query";

import { api, API_BASE_URL } from "@/shared/api";

import { inboxKeys } from "./keys";

/** POST /media/upload (multipart, ≤ 50 MB). The returned id is sent as source_type "media_id". */
export async function uploadMedia(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await api.upload<{ media_id: string }>("/media/upload", form);
  return res.media_id;
}

/**
 * Displayable URL for an attachment. SocialAPI-hosted media (/inbox/media/…) needs the
 * Bearer header, so it's fetched as a blob; platform CDN URLs are used as-is.
 */
export function useAttachmentUrl(url: string | null) {
  const authed = !!url && url.startsWith(API_BASE_URL);
  const blob = useQuery({
    queryKey: inboxKeys.media(url ?? ""),
    queryFn: async () => URL.createObjectURL(await api.getBlob(url!)),
    enabled: authed,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    // 503 = not ready yet; 404/410 = gone.
    retry: (count, err) => count < 3 && (err as { status?: number }).status === 503,
  });

  if (!url) return { src: undefined, loading: false, error: null };
  if (!authed) return { src: url, loading: false, error: null };
  return { src: blob.data, loading: blob.isLoading, error: blob.error };
}
