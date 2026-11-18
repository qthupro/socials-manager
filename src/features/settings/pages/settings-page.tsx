import { Settings2, Sparkles, type LucideIcon } from "lucide-react";
import { useSearchParams } from "react-router";

import { APP_INFO } from "@/features/about";
import { RealtimeSection } from "@/features/realtime";
import { PageHeader } from "@/shared/components/page-header";
import { SettingsRow, SettingsSection } from "@/shared/components/settings-list";
import { cn } from "@/shared/lib/utils";

import { AiSection } from "../components/ai-section";
import { ApiKeySection } from "../components/api-key-section";
import { DataStorageDialog } from "../components/data-storage-dialog";
import { DesktopSection } from "../components/desktop-section";
import { ResetSection } from "../components/reset-section";

type Tab = "general" | "ai";

const TABS: { value: Tab; label: string; icon: LucideIcon }[] = [
  { value: "general", label: "SocialAPI & ứng dụng", icon: Settings2 },
  { value: "ai", label: "AI", icon: Sparkles },
];

function AppInfoSection() {
  return (
    <SettingsSection title="Ứng dụng">
      <SettingsRow label={APP_INFO.name} hint={APP_INFO.tagline}>
        <span className="font-mono text-xs text-muted-foreground">v{APP_INFO.version}</span>
      </SettingsRow>
    </SettingsSection>
  );
}

/** Settings, in tabs; `?tab=ai` opens the AI tab (linked from AI features). */
export function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "ai" ? "ai" : "general";

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-1">
            Cài đặt
            <DataStorageDialog />
          </span>
        }
      />

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() =>
              setParams(t.value === "general" ? {} : { tab: t.value }, { replace: true })
            }
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
              tab === t.value && "border-primary font-medium text-foreground",
            )}
          >
            <t.icon className="size-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "general" ? (
        <div className="space-y-8">
          <ApiKeySection />
          <DesktopSection />
          <RealtimeSection />
          <AppInfoSection />
          <ResetSection />
        </div>
      ) : (
        <AiSection />
      )}
    </div>
  );
}
