import {
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AI_PROVIDER_IDS,
  AiProviderIcon,
  modelFor,
  PROVIDERS,
  useAiConfig,
  type AiProviderId,
  type ModelInfo,
} from "@/shared/ai";
import { SettingsSection } from "@/shared/components/settings-list";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";
import { openExternal } from "@/shared/platform/opener";

const maskKey = (key: string) =>
  key.length > 12 ? `${key.slice(0, 7)}••••${key.slice(-4)}` : "••••";

const fmtDate = (ms: number) =>
  new Date(ms).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

/**
 * Model id input (free text works too) + the full, searchable list of models the key
 * can use, newest first. The input filters the list; clicking a row picks it.
 */
function ModelPicker({
  inputId,
  models,
  loading,
  value,
  onChange,
  placeholder,
}: {
  inputId: string;
  models: ModelInfo[];
  loading: boolean;
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      q
        ? models.filter((m) => m.id.toLowerCase().includes(q) || m.name?.toLowerCase().includes(q))
        : models,
    [models, q],
  );

  return (
    <div className="space-y-1.5">
      <Input
        id={inputId}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 font-mono text-xs"
      />
      {models.length > 0 && (
        <div className="overflow-hidden rounded-md border bg-background">
          <div className="relative border-b">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Tìm trong ${models.length} model…`}
              className="h-8 w-full bg-transparent pr-2 pl-8 text-xs outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1" role="listbox">
            {shown.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">Không có model khớp.</li>
            )}
            {shown.map((m) => {
              const selected = m.id === value;
              return (
                <li key={m.id} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => onChange(m.id)}
                    title={m.description}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted",
                      selected && "bg-primary/10",
                    )}
                  >
                    <Check
                      className={cn("size-3.5 shrink-0 text-primary", !selected && "invisible")}
                    />
                    <span className="min-w-0 flex-1">
                      {m.name && m.name !== m.id && (
                        <span className="block truncate text-xs font-medium">{m.name}</span>
                      )}
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">
                        {m.id}
                      </span>
                    </span>
                    {m.created && (
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {fmtDate(m.created)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {loading && !models.length && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Đang tải danh sách model…
        </p>
      )}
    </div>
  );
}

/** Key + model setup for one provider (shown when its row is expanded). */
function ProviderSetup({ id }: { id: AiProviderId }) {
  const info = PROVIDERS[id];
  const savedKey = useAiConfig((s) => s.keys[id] ?? "");
  const savedModel = useAiConfig((s) => s.models[id] ?? "");
  const { setKey, setModel, set } = useAiConfig.getState();
  const [key, setKeyDraft] = useState(savedKey);
  const [show, setShow] = useState(false);
  const [modelDraft, setModelDraft] = useState(savedModel || info.defaultModel);
  const [testing, setTesting] = useState(false);

  // Key the list was loaded with; a saved key loads it as soon as the row opens.
  const [listKey, setListKey] = useState(savedKey);
  const modelsQuery = useQuery({
    queryKey: ["ai-models", id, listKey],
    queryFn: () => info.listModels(listKey),
    enabled: !!listKey,
    staleTime: 10 * 60_000,
    retry: false,
  });
  const models = modelsQuery.data ?? [];
  const loadingModels = modelsQuery.isFetching;
  // Nothing picked yet: the newest model.
  const model = modelDraft || models[0]?.id || "";

  const loadModels = () => {
    const apiKey = key.trim();
    if (!apiKey) return;
    if (apiKey === listKey) void modelsQuery.refetch();
    else setListKey(apiKey);
  };

  /** Saves after a real request succeeds, so a wrong key / model never gets saved silently. */
  const test = async () => {
    const apiKey = key.trim();
    if (!apiKey || !model.trim()) return;
    setTesting(true);
    try {
      const reply = await info.stream([{ role: "user", content: "Trả lời đúng một từ: OK" }], {
        apiKey,
        model: model.trim(),
        maxTokens: 1024,
      });
      setKey(id, apiKey);
      setModel(id, model);
      if (!useAiConfig.getState().active) set({ active: id });
      toast.success(`${info.label} hoạt động — trả lời: “${reply.slice(0, 40) || "(trống)"}”`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3 border-t bg-muted/30 px-4 py-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`ai-key-${id}`} className="flex items-center justify-between text-xs">
          API key của bạn
          <button
            type="button"
            onClick={() => openExternal(info.keyUrl)}
            className="inline-flex items-center gap-1 font-normal text-primary hover:underline"
          >
            Lấy key {info.vendor} <ExternalLink className="size-3" />
          </button>
        </Label>
        <div className="relative">
          <Input
            id={`ai-key-${id}`}
            type={show ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            placeholder={info.keyPlaceholder}
            value={key}
            onChange={(e) => setKeyDraft(e.target.value)}
            onBlur={() => key.trim() !== listKey && loadModels()}
            className="h-8 pr-8 font-mono text-xs"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Ẩn key" : "Hiện key"}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={`ai-model-${id}`} className="flex items-center justify-between text-xs">
          Model
          <button
            type="button"
            disabled={!key.trim() || loadingModels}
            onClick={() => loadModels()}
            className="inline-flex items-center gap-1 font-normal text-primary hover:underline disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3", loadingModels && "animate-spin")} />
            {models.length ? "Tải lại danh sách" : "Tải danh sách model"}
          </button>
        </Label>
        <ModelPicker
          inputId={`ai-model-${id}`}
          models={models}
          loading={loadingModels}
          value={model}
          onChange={setModelDraft}
          placeholder={info.defaultModel || "Bấm “Tải danh sách model” rồi chọn"}
        />
        {modelsQuery.error ? (
          <p className="text-xs text-destructive">
            {modelsQuery.error instanceof Error
              ? modelsQuery.error.message
              : String(modelsQuery.error)}
          </p>
        ) : (
          modelsQuery.isSuccess &&
          !models.length && (
            <p className="text-xs text-muted-foreground">
              Key này chưa dùng được model nào của {info.vendor}.
            </p>
          )
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Key chỉ lưu trên máy này và chỉ gửi tới {info.vendor}. Chi phí tính vào tài khoản{" "}
          {info.vendor} của bạn.
        </p>
        <Button size="sm" disabled={!key.trim() || !model.trim() || testing} onClick={test}>
          {testing ? <Loader2 className="animate-spin" /> : <Check />} Kiểm tra & lưu
        </Button>
      </div>
    </div>
  );
}

function ProviderRow({
  id,
  open,
  onToggle,
}: {
  id: AiProviderId;
  open: boolean;
  onToggle: () => void;
}) {
  const info = PROVIDERS[id];
  const key = useAiConfig((s) => s.keys[id] ?? "");
  const active = useAiConfig((s) => s.active === id);
  const model = useAiConfig((s) => s.models[id]) || info.defaultModel;
  const set = useAiConfig((s) => s.set);
  const ready = !!key && !!model;

  return (
    <div>
      <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">
        <AiProviderIcon id={id} />
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="text-sm font-medium">
            {info.label} <span className="font-normal text-muted-foreground">· {info.vendor}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {ready ? (
              <span className="font-mono">
                {maskKey(key)} · {model}
              </span>
            ) : key ? (
              "Chưa chọn model"
            ) : (
              "Chưa có API key"
            )}
          </p>
        </button>
        {active ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <Check className="size-3" /> Đang dùng
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            disabled={!ready}
            title={ready ? undefined : "Nhập key và kiểm tra trước"}
            onClick={() => set({ active: id })}
          >
            Dùng
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label="Thiết lập">
          <ChevronDown className={cn("transition-transform", open && "rotate-180")} />
        </Button>
      </div>
      {open && <ProviderSetup key={id} id={id} />}
    </div>
  );
}

/** Settings → AI: pick a provider and bring your own key. */
export function AiSection() {
  const active = useAiConfig((s) => s.active);
  const [open, setOpen] = useState<AiProviderId | null>(() => active ?? "claude");

  return (
    <div className="space-y-8">
      <SettingsSection
        title="Nhà cung cấp AI"
        action={
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" />
            {active ? `${PROVIDERS[active].label} · ${modelFor(active)}` : "Chưa bật AI"}
          </span>
        }
      >
        {AI_PROVIDER_IDS.map((id) => (
          <ProviderRow
            key={id}
            id={id}
            open={open === id}
            onToggle={() => setOpen(open === id ? null : id)}
          />
        ))}
        {active && (
          <div className="flex justify-end px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => useAiConfig.getState().set({ active: null })}
            >
              Tắt AI
            </Button>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}
