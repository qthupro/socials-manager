import type { MediaInput } from "../api/types";

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)(\?|$)/i;

export const isVideoUrl = (url: string) => VIDEO_EXT.test(url);

export const isVideo = (m: MediaInput) => m.type === "video" || isVideoUrl(m.source);
