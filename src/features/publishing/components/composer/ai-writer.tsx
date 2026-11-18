import { Loader2, Sparkles, Square, Wand2, X } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import { getAiProvider, PROVIDERS, useAiConfig, useAiReady, type AiMessage } from "@/shared/ai";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/shared/lib/utils";

const TONES = ["Thân thiện", "Chuyên nghiệp", "Hài hước", "Sang trọng", "Thúc đẩy mua hàng"];
const LENGTHS = [
  { value: "short", label: "Ngắn", hint: "1–2 câu" },
  { value: "medium", label: "Vừa", hint: "1 đoạn" },
  { value: "long", label: "Dài", hint: "2–4 đoạn" },
] as const;

/** One-click edits on the text already written. */
const QUICK = [
  { label: "Viết hay hơn", prompt: "Viết lại cho cuốn hút và mạch lạc hơn, giữ nguyên ý." },
  { label: "Ngắn gọn hơn", prompt: "Rút gọn còn khoảng một nửa, giữ ý chính." },
  { label: "Thêm hashtag", prompt: "Giữ nguyên nội dung, thêm 3–6 hashtag phù hợp ở cuối." },
  { label: "Thêm emoji", prompt: "Giữ nguyên nội dung, chèn emoji phù hợp một cách vừa phải." },
  { label: "Dịch sang tiếng Anh", prompt: "Dịch sang tiếng Anh tự nhiên, giữ emoji và hashtag." },
];

export interface WriterContext {
  /** e.g. "Facebook, Instagram". */
  platforms: string;
  /** Strictest text limit among the selected channels. */
  maxChars?: number;
  /** "Bài viết" / "Reel / Short" / … */
  formatLabel: string;
}

function systemPrompt(ctx: WriterContext): AiMessage {
  return {
    role: "system",
    content:
      "Bạn là chuyên gia viết nội dung mạng xã hội cho doanh nghiệp Việt Nam. " +
      `Loại bài: ${ctx.formatLabel}. Kênh đăng: ${ctx.platforms || "mạng xã hội"}. ` +
      (ctx.maxChars ? `Tối đa ${ctx.maxChars} ký tự. ` : "") +
      "Chỉ dùng thông tin doanh nghiệp được cung cấp, không bịa giá, khuyến mãi hay số liệu. " +
      "Chỉ trả về nội dung bài đăng, không tiêu đề phụ, không giải thích, không đặt trong dấu ngoặc kép.",
  };
}

/** "✨ Viết bằng AI" panel inside the composer's content section. */
export function AiWriter({
  currentText,
  context,
  onApply,
}: {
  currentText: string;
  context: WriterContext;
  onApply: (text: string) => void;
}) {
  const ready = useAiReady();
  const active = useAiConfig((s) => s.active);
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState(TONES[0]);
  const [length, setLength] = useState<(typeof LENGTHS)[number]["value"]>("medium");
  const [emoji, setEmoji] = useState(true);
  const [hashtags, setHashtags] = useState(true);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const run = async (user: string) => {
    const provider = getAiProvider();
    if (!provider) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setResult("");
    setBusy(true);
    try {
      const text = await provider.complete(
        [systemPrompt(context), { role: "user", content: user }],
        {
          maxTokens: 4096,
          signal: controller.signal,
          onText: (delta) => setResult((r) => r + delta),
        },
      );
      setResult(text);
    } catch (err) {
      if (!controller.signal.aborted) toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const generate = () => {
    const len = LENGTHS.find((l) => l.value === length)!;
    run(
      `Viết bài đăng về: ${topic.trim()}\n` +
        `Giọng văn: ${tone}. Độ dài: ${len.label.toLowerCase()} (${len.hint}). ` +
        `${emoji ? "Có dùng emoji vừa phải." : "Không dùng emoji."} ` +
        `${hashtags ? "Thêm 3–6 hashtag phù hợp ở cuối." : "Không thêm hashtag."}`,
    );
  };

  const quick = (prompt: string) => run(`${prompt}\n\nNội dung hiện tại:\n${currentText}`);

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="text-primary" /> Viết bằng AI
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="size-4 text-primary" /> Viết bằng AI
          {ready && active && (
            <span className="font-normal text-muted-foreground">· {PROVIDERS[active].label}</span>
          )}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Đóng"
          onClick={() => (abort.current?.abort(), setOpen(false))}
        >
          <X />
        </Button>
      </div>

      {!ready ? (
        <p className="text-sm text-muted-foreground">
          Cần cấu hình AI với API key của bạn trước.{" "}
          <Link to="/settings?tab=ai" className="font-medium text-primary hover:underline">
            Mở Cài đặt → AI
          </Link>
        </p>
      ) : (
        <>
          <Textarea
            rows={2}
            value={topic}
            placeholder="Chủ đề / ý chính, VD: ra mắt bộ sưu tập áo len thu đông, giảm 20% tuần đầu"
            onChange={(e) => setTopic(e.target.value)}
            className="bg-background text-sm"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {TONES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                className={cn(
                  "rounded-full border bg-background px-2.5 py-0.5 text-xs transition-colors hover:bg-muted",
                  tone === t && "border-primary bg-primary/10 text-primary",
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex rounded-md border bg-background p-0.5">
              {LENGTHS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  title={l.hint}
                  onClick={() => setLength(l.value)}
                  className={cn(
                    "rounded px-2 py-0.5",
                    length === l.value && "bg-muted font-medium",
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5">
              <Checkbox checked={emoji} onCheckedChange={(v) => setEmoji(!!v)} /> Emoji
            </label>
            <label className="flex items-center gap-1.5">
              <Checkbox checked={hashtags} onCheckedChange={(v) => setHashtags(!!v)} /> Hashtag
            </label>
            <Button
              size="sm"
              className="ml-auto"
              disabled={!topic.trim() || busy}
              onClick={generate}
            >
              <Wand2 /> Viết bài
            </Button>
          </div>

          {currentText.trim() && (
            <div className="flex flex-wrap items-center gap-1.5 border-t pt-3">
              <span className="text-xs text-muted-foreground">Sửa nội dung đang có:</span>
              {QUICK.map((q) => (
                <Button
                  key={q.label}
                  variant="outline"
                  size="sm"
                  className="h-7 bg-background text-xs"
                  disabled={busy}
                  onClick={() => quick(q.prompt)}
                >
                  {q.label}
                </Button>
              ))}
            </div>
          )}

          {(busy || result) && (
            <div className="space-y-2 rounded-md border bg-background p-3">
              <p className="min-h-10 text-sm whitespace-pre-wrap">
                {result}
                {busy && (
                  <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground/60 align-text-bottom" />
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {context.maxChars && result && (
                  <span
                    className={cn(
                      "text-xs text-muted-foreground tabular-nums",
                      result.length > context.maxChars && "text-destructive",
                    )}
                  >
                    {result.length}/{context.maxChars} ký tự
                  </span>
                )}
                <div className="ml-auto flex gap-2">
                  {busy ? (
                    <Button variant="outline" size="sm" onClick={() => abort.current?.abort()}>
                      <Square /> Dừng
                    </Button>
                  ) : (
                    <>
                      {currentText.trim() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onApply(`${currentText.trim()}\n\n${result}`)}
                        >
                          Chèn thêm vào cuối
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => (onApply(result), toast.success("Đã dùng nội dung AI"))}
                      >
                        Dùng nội dung này
                      </Button>
                    </>
                  )}
                  {busy && (
                    <Loader2 className="size-4 animate-spin self-center text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
