import { createPersistedStore } from "@/shared/lib/storage";

/** The webhook this install registered on SocialAPI. */
export interface RegisteredWebhook {
  id: string;
  /** Returned once by POST /webhooks — needed to verify every delivery. */
  secret: string;
  /** Which API key (account) it belongs to; a different key needs its own webhook. */
  keyFingerprint: string;
}

/** The user's own Convex deployment, once the backend has been deployed to it. */
export interface DeployedBackend {
  name: string;
  /** https://<name>.convex.cloud — the app subscribes here. */
  url: string;
  /** https://<name>.convex.site — SocialAPI posts webhooks here. */
  siteUrl: string;
  /** Required by the events queries; also stored as READ_TOKEN on the deployment. */
  readToken: string;
  /** Bundle version deployed (see backend/version.ts); a newer app redeploys. */
  version: string;
  /** Webhook whose secret is currently set as WEBHOOK_SECRET on the deployment. */
  secretHookId: string | null;
}

interface RealtimeConfigState {
  enabled: boolean;
  /** The user's own Convex deploy key — admin access to their deployment only. */
  deployKey: string;
  backend: DeployedBackend | null;
  /** Random per-install id; the webhook path is /hook/<installId>, so installs never collide. */
  installId: string;
  webhook: RegisteredWebhook | null;
  set: (patch: Partial<Omit<RealtimeConfigState, "set" | "installId">>) => void;
}

export const useRealtimeConfig = createPersistedStore<RealtimeConfigState>(
  "realtime",
  (set) => ({
    enabled: false,
    deployKey: "",
    backend: null,
    installId: crypto.randomUUID().replace(/-/g, ""),
    webhook: null,
    set: (patch) => set(patch),
  }),
  {
    version: 2,
    migrate: (persisted, version) => {
      const old = persisted as Record<string, unknown>;
      if (version < 2) {
        // v1 used an ngrok tunnel (authtoken/domain): needs a Convex deploy first.
        delete old.authtoken;
        delete old.domain;
        return { ...old, enabled: false, deployKey: "", backend: null } as never;
      }
      return old as never;
    },
  },
);

/** Short, non-secret tag of an API key. */
export const keyFingerprint = (apiKey: string) => apiKey.slice(-8);
