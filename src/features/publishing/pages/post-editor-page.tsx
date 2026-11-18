import {
  ArrowLeft,
  CalendarClock,
  FileText,
  ListOrdered,
  Loader2,
  Save,
  Send,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { useAccounts, useBrands } from "@/features/connections";
import { ApiError, getErrorMessage } from "@/shared/api";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { EmptyState, ErrorState, RequireApiKey } from "@/shared/components/state-views";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Textarea } from "@/shared/components/ui/textarea";
import { getPlatform } from "@/shared/config/platforms";
import { cn } from "@/shared/lib/utils";

import { useCreatePost, usePost, usePublishPost, useUpdatePost } from "../api/posts";
import { useQueuePreview, useQueues } from "../api/queues";
import type { CreatePostRequest, MediaInput, Post, TargetRequest } from "../api/types";
import { AiWriter } from "../components/composer/ai-writer";
import { ChannelChecks, type ChannelCheck } from "../components/composer/channel-checks";
import { FormatPicker } from "../components/composer/format-picker";
import { MediaField } from "../components/composer/media-field";
import { PostPreview } from "../components/composer/post-preview";
import { TargetPicker } from "../components/composer/target-picker";
import {
  buildTarget,
  checkTarget,
  firstCommentFor,
  formatInfo,
  formatOfPost,
  platformLabel,
  slugOf,
  textLimitFor,
  titleFor,
  unsupportedReason,
  type PostFormat,
} from "../lib/formats";
import { DEMO_BRANDS, DEMO_TARGETS } from "../lib/demo-targets";
import { can, formatDateTime } from "../lib/status";
import { targetKey, useTargetOptions, type TargetOption } from "../lib/targets";

type When = "now" | "schedule" | "queue" | "draft";

const WHEN: { value: When; label: string; icon: typeof Send }[] = [
  { value: "now", label: "Đăng ngay", icon: Send },
  { value: "schedule", label: "Lên lịch", icon: CalendarClock },
  { value: "queue", label: "Hàng đợi", icon: ListOrdered },
  { value: "draft", label: "Lưu nháp", icon: FileText },
];

/** Prefill passed via router state (calendar day, media library selection). */
interface EditorPrefill {
  scheduledAt?: string;
  media?: MediaInput[];
}

/** Shared text, or "" = use shared. Keyed by platform slug. */
type Overrides = Record<string, string>;

interface Draft {
  format: PostFormat;
  targets: string[];
  text: string;
  title: string;
  overrides: Overrides;
  media: MediaInput[];
  firstComment: string;
  when: When;
  /** datetime-local value. */
  scheduledAt: string;
  /** Queue id, or "default" for the brand's default Queue. */
  queueId: string;
}

const EMPTY: Draft = {
  format: "post",
  targets: [],
  text: "",
  title: "",
  overrides: {},
  media: [],
  firstComment: "",
  when: "now",
  scheduledAt: "",
  queueId: "default",
};

function fromPrefill(prefill: EditorPrefill | null): Draft {
  if (!prefill) return EMPTY;
  return {
    ...EMPTY,
    ...(prefill.media?.length && { media: prefill.media }),
    ...(prefill.scheduledAt && { when: "schedule" as const, scheduledAt: prefill.scheduledAt }),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");
/** ISO → "YYYY-MM-DDTHH:mm" in local time (datetime-local input). */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const inOneHour = () => toLocalInput(new Date(Date.now() + 60 * 60_000).toISOString());

function fromPost(p: Post): Draft {
  const overrides: Overrides = {};
  for (const t of p.targets ?? []) {
    const slug = slugOf(t.platform);
    if (slug && t.text && t.text !== p.text) overrides[slug] = t.text;
  }
  return {
    format: formatOfPost(p),
    targets: (p.targets ?? []).map(targetKey),
    text: p.text ?? "",
    title: p.title ?? "",
    overrides,
    media: p.media ?? [],
    firstComment: p.first_comment ?? "",
    when: p.scheduled_at ? "schedule" : "draft",
    scheduledAt: p.scheduled_at ? toLocalInput(p.scheduled_at) : "",
    queueId: p.queue_id ?? "default",
  };
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Editor({ post }: { post?: Post }) {
  const navigate = useNavigate();
  const location = useLocation();
  const accounts = useAccounts();
  const brands = useBrands();
  const queues = useQueues();
  const real = useTargetOptions(accounts.data ?? []);
  // DEV ONLY: /posts/new?demo shows 100+ fake channels to preview the picker.
  const demo = import.meta.env.DEV && new URLSearchParams(location.search).has("demo");
  const options = demo ? DEMO_TARGETS : real.options;
  const brandList = demo ? DEMO_BRANDS : (brands.data ?? []);
  const create = useCreatePost();
  const update = useUpdatePost();
  const publish = usePublishPost();
  const [d, setD] = useState<Draft>(() =>
    post ? fromPost(post) : fromPrefill(location.state as EditorPrefill | null),
  );
  /** Text tab: "" = shared text, otherwise a platform slug override. */
  const [tab, setTab] = useState("");
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const [uploading, setUploading] = useState(false);

  const selected = useMemo(
    () => d.targets.map((k) => options.find((o) => o.key === k)).filter(Boolean) as TargetOption[],
    [d.targets, options],
  );
  /** One entry per selected platform (slug), in selection order. */
  const platforms = useMemo(
    () => [...new Set(selected.map((o) => slugOf(o.platform) ?? o.platform))],
    [selected],
  );
  const textFor = (platform: string) => d.overrides[slugOf(platform) ?? platform] || d.text;
  const accountFor = (platform: string) =>
    selected.find((o) => (slugOf(o.platform) ?? o.platform) === platform);

  const format = formatInfo(d.format);
  const titleMode = platforms.some((p) => titleFor(p, d.format) === "required")
    ? "required"
    : platforms.some((p) => titleFor(p, d.format))
      ? "optional"
      : null;
  const showFirstComment = platforms.some((p) => firstCommentFor(p, d.format));
  const activeTab = platforms.includes(tab) ? tab : "";
  const editingText = activeTab ? (d.overrides[activeTab] ?? "") : d.text;
  const ctxFor = (p: string) => ({ text: textFor(p), title: d.title, media: d.media });
  /** Smallest text limit among the selected channels (for the AI writer). */
  const limits = platforms.map((p) => textLimitFor(p, d.format)).filter((n): n is number => !!n);
  const strictestLimit = limits.length ? Math.min(...limits) : undefined;

  /** Switching type drops channels that can't take it. */
  const setFormat = (next: PostFormat) => {
    const dropped = selected.filter((o) => unsupportedReason(o.platform, next));
    set({
      format: next,
      targets: d.targets.filter((k) => !dropped.some((o) => o.key === k)),
    });
    if (dropped.length) {
      toast.info(
        `Đã bỏ ${dropped.length} kênh không hỗ trợ ${formatInfo(next).label}: ${[
          ...new Set(dropped.map((o) => platformLabel(o.platform))),
        ].join(", ")}`,
      );
    }
  };

  // Per channel: exactly what each platform would reject or change.
  const checks: ChannelCheck[] = platforms.map((p) => ({
    platform: p,
    ...checkTarget(p, d.format, ctxFor(p)),
  }));

  // Queue: needs targets all in one Brand; "default" = that Brand's default Queue.
  const targetBrands = [...new Set(selected.map((o) => o.brandId))];
  const queueBrand = targetBrands.length === 1 ? targetBrands[0] : undefined;
  const brandQueues = (queues.data ?? []).filter((q) => q.brand_id === queueBrand);
  const queue =
    brandQueues.find((q) => q.id === d.queueId) ?? brandQueues.find((q) => q.is_default);
  const nextFree = useQueuePreview(d.when === "queue" ? queue?.id : undefined, 1);

  // Blocking problems (drafts may be incomplete).
  const problems: string[] = [];
  if (d.when !== "draft") {
    if (selected.length === 0) problems.push("Chọn ít nhất một kênh đăng.");
    if (checks.some((c) => c.errors.length)) problems.push("Sửa các lỗi theo kênh ở trên.");
    if (d.when === "schedule" && (!d.scheduledAt || new Date(d.scheduledAt) <= new Date()))
      problems.push("Chọn thời điểm đăng trong tương lai.");
    if (d.when === "queue" && selected.length) {
      if (targetBrands.length > 1)
        problems.push("Hàng đợi chỉ dùng khi mọi kênh thuộc cùng một thương hiệu.");
      else if (!queue) problems.push("Thương hiệu này chưa có hàng đợi — tạo trong mục Hàng đợi.");
      else if (!queue.active) problems.push(`Hàng đợi “${queue.name}” đang tạm dừng.`);
    }
  }
  if (uploading) problems.push("Đợi tải ảnh / video lên xong.");

  const busy = create.isPending || update.isPending || publish.isPending;

  const submit = async () => {
    const targets: TargetRequest[] = selected.map((o) => {
      const p = slugOf(o.platform) ?? o.platform;
      const override = d.overrides[p];
      // Per-platform settings for this post type (Instagram content_type, TikTok media_type…).
      const built = buildTarget(o.platform, d.format, ctxFor(p));
      const text = built.text ?? (override?.trim() ? override : undefined);
      return {
        account_id: o.accountId,
        ...(o.pageId && { page_id: o.pageId }),
        ...(format.caption && text && { text }),
        ...(built.platform_data && { platform_data: built.platform_data }),
      };
    });
    const body: CreatePostRequest = {
      // Stories carry no caption.
      text: format.caption ? d.text || undefined : undefined,
      title: titleMode && d.title ? d.title : undefined,
      media: d.media,
      first_comment: showFirstComment && d.firstComment ? d.firstComment : undefined,
      targets,
      ...(d.when === "schedule" && { scheduled_at: new Date(d.scheduledAt).toISOString() }),
      ...(d.when === "now" && { publish_now: true }),
      // Takes the earliest free time; can't be combined with scheduled_at / publish_now.
      ...(d.when === "queue" && queue && { queue_id: queue.id }),
    };
    try {
      let saved: Post | undefined;
      if (post) {
        const { publish_now, ...patch } = body;
        saved = await update.mutateAsync({ id: post.id, body: patch });
        // PATCH can't publish: save first, then POST /posts/{id}/publish.
        if (publish_now) await publish.mutateAsync(post.id);
      } else {
        saved = await create.mutateAsync(body);
      }
      toast.success(
        d.when === "now"
          ? "Đang đăng bài…"
          : d.when === "schedule"
            ? "Đã lên lịch bài viết"
            : d.when === "queue"
              ? `Đã thêm vào hàng đợi${saved?.scheduled_at ? ` — đăng lúc ${formatDateTime(saved.scheduled_at)}` : ""}`
              : "Đã lưu nháp",
      );
      navigate("/posts");
    } catch (err) {
      // 422 with the post as body: it was created, but every channel failed right away.
      if (err instanceof ApiError && err.code === "http.422") {
        toast.error("Đăng thất bại trên mọi kênh — xem lỗi từng kênh trong danh sách.");
        navigate("/posts");
        return;
      }
      toast.error(getErrorMessage(err));
    }
  };

  const ActionIcon = WHEN.find((w) => w.value === d.when)!.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Quay lại">
          <Link to="/posts">
            <ArrowLeft />
          </Link>
        </Button>
        <h2 className="text-xl font-semibold tracking-tight">
          {post ? "Sửa bài viết" : "Tạo bài viết"}
        </h2>
      </div>

      {demo && (
        <p className="rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Chế độ demo (chỉ khi dev): {options.length} kênh giả để xem giao diện — đừng bấm đăng.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <Section title="Loại bài">
            <FormatPicker value={d.format} onChange={setFormat} />
          </Section>

          <Section title="Đăng lên" hint={selected.length ? `${selected.length} kênh` : undefined}>
            <TargetPicker
              options={options}
              brands={brandList}
              selected={d.targets}
              onChange={(targets) => set({ targets })}
              disabledReason={(o) => unsupportedReason(o.platform, d.format)}
              loading={accounts.isLoading}
            />
          </Section>

          {!format.caption ? (
            <Section title="Nội dung">
              <p className="text-sm text-muted-foreground">
                Story chỉ có ảnh / video — không kèm chữ hay caption.
              </p>
            </Section>
          ) : (
            <Section title="Nội dung">
              {platforms.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {["", ...platforms].map((p) => (
                    <button
                      key={p || "shared"}
                      type="button"
                      onClick={() => setTab(p)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors hover:bg-muted",
                        activeTab === p && "bg-muted font-medium",
                      )}
                    >
                      {p ? (
                        <>
                          <PlatformIcon
                            platform={p}
                            size="sm"
                            className="size-4 [&_svg]:size-2.5"
                          />
                          {getPlatform(p)?.label}
                          {d.overrides[p] && <span className="size-1.5 rounded-full bg-primary" />}
                        </>
                      ) : (
                        "Nội dung chung"
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* AI writes / edits the shared text (or the open platform tab). */}
              <AiWriter
                currentText={editingText}
                context={{
                  platforms: platforms.map(platformLabel).join(", "),
                  maxChars: strictestLimit,
                  formatLabel: format.label,
                }}
                onApply={(text) =>
                  activeTab
                    ? set({ overrides: { ...d.overrides, [activeTab]: text } })
                    : set({ text })
                }
              />

              {titleMode && !activeTab && (
                <Input
                  placeholder={`Tiêu đề${titleMode === "required" ? " (bắt buộc" : " (tuỳ chọn"} cho ${platforms
                    .filter((p) => titleFor(p, d.format))
                    .map(platformLabel)
                    .join(", ")})`}
                  value={d.title}
                  onChange={(e) => set({ title: e.target.value })}
                />
              )}

              <Textarea
                rows={8}
                value={editingText}
                placeholder={
                  activeTab
                    ? `Để trống để dùng nội dung chung. Nội dung riêng cho ${getPlatform(activeTab)?.label}…`
                    : "Bạn muốn chia sẻ điều gì?"
                }
                onChange={(e) =>
                  activeTab
                    ? set({ overrides: { ...d.overrides, [activeTab]: e.target.value } })
                    : set({ text: e.target.value })
                }
                className="resize-y text-sm"
              />

              {platforms.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {platforms.map((p) => {
                    const limit = textLimitFor(p, d.format);
                    if (!limit) return null;
                    const len = textFor(p).length;
                    return (
                      <span
                        key={p}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums",
                          len > limit && "font-medium text-destructive",
                          len <= limit && len > limit * 0.9 && "text-amber-600",
                        )}
                      >
                        <PlatformIcon platform={p} size="sm" className="size-4 [&_svg]:size-2.5" />
                        {len.toLocaleString("vi-VN")}/{limit.toLocaleString("vi-VN")}
                      </span>
                    );
                  })}
                </div>
              )}
            </Section>
          )}

          <Section
            title={
              d.format === "post"
                ? "Ảnh / video"
                : d.format === "story"
                  ? "Ảnh hoặc video"
                  : "Video"
            }
            hint={d.media.length ? `${d.media.length} mục` : undefined}
          >
            <MediaField
              accept={format.accept}
              hint={format.mediaHint}
              max={d.format === "post" ? undefined : 1}
              value={d.media}
              onChange={(update) =>
                setD((prev) => ({
                  ...prev,
                  media: typeof update === "function" ? update(prev.media) : update,
                }))
              }
              onUploadingChange={setUploading}
            />
          </Section>

          {showFirstComment && (
            <Section
              title="Bình luận đầu tiên"
              hint={platforms
                .filter((p) => firstCommentFor(p, d.format))
                .map(platformLabel)
                .join(", ")}
            >
              <Textarea
                rows={2}
                value={d.firstComment}
                placeholder="VD: link sản phẩm, hashtag… tự đăng ngay dưới bài"
                onChange={(e) => set({ firstComment: e.target.value })}
                className="text-sm"
              />
            </Section>
          )}

          <Section title="Thời gian đăng">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {/* Moving an existing post into a Queue (PATCH queue_id) isn't documented. */}
              {WHEN.filter((w) => !(post && w.value === "queue")).map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() =>
                    set({
                      when: w.value,
                      ...(w.value === "schedule" && !d.scheduledAt && { scheduledAt: inOneHour() }),
                    })
                  }
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/60",
                    d.when === w.value && "border-primary bg-primary/5 font-medium text-primary",
                  )}
                >
                  <w.icon className="size-4" /> {w.label}
                </button>
              ))}
            </div>
            {d.when === "schedule" && (
              <div className="grid gap-1.5 sm:max-w-xs">
                <Label htmlFor="scheduled-at" className="text-xs">
                  Đăng lúc (giờ máy này)
                </Label>
                <Input
                  id="scheduled-at"
                  type="datetime-local"
                  value={d.scheduledAt}
                  min={toLocalInput(new Date().toISOString())}
                  onChange={(e) => set({ scheduledAt: e.target.value })}
                />
              </div>
            )}
            {d.when === "queue" && (
              <div className="space-y-2">
                {!queueBrand ? (
                  <p className="text-xs text-muted-foreground">
                    {targetBrands.length > 1
                      ? "Các kênh đã chọn thuộc nhiều thương hiệu — hàng đợi chỉ dùng cho một thương hiệu."
                      : "Chọn kênh đăng để thấy hàng đợi của thương hiệu."}
                  </p>
                ) : brandQueues.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Thương hiệu này chưa có hàng đợi.{" "}
                    <Link to="/queues" className="text-primary hover:underline">
                      Tạo hàng đợi
                    </Link>
                  </p>
                ) : (
                  <>
                    <Select value={queue?.id} onValueChange={(queueId) => set({ queueId })}>
                      <SelectTrigger className="w-full sm:max-w-xs">
                        <SelectValue placeholder="Chọn hàng đợi" />
                      </SelectTrigger>
                      <SelectContent>
                        {brandQueues.map((q) => (
                          <SelectItem key={q.id} value={q.id} disabled={!q.active}>
                            {q.name}
                            {q.is_default && " · mặc định"}
                            {!q.active && " · tạm dừng"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {nextFree.isLoading
                        ? "Đang xem khung giờ trống…"
                        : nextFree.data?.[0]
                          ? `Dự kiến đăng: ${nextFree.data[0].time.slice(0, 10).split("-").reverse().join("/")} ${nextFree.data[0].slot_time} (${queue?.timezone}). Giờ thật do SocialAPI chọn khi lưu.`
                          : "Hàng đợi không còn khung giờ trống."}
                    </p>
                  </>
                )}
              </div>
            )}
            {d.when === "draft" && (
              <p className="text-xs text-muted-foreground">
                Nháp không tốn credit và có thể lưu khi chưa đủ nội dung.
              </p>
            )}
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <Section title="Xem trước">
            <PostPreview
              format={d.format}
              platforms={platforms}
              accountFor={accountFor}
              textFor={textFor}
              title={d.title}
              media={d.media}
            />
          </Section>

          {checks.length > 0 && (
            <Section title="Kiểm tra theo kênh">
              <ChannelChecks checks={checks} />
            </Section>
          )}

          <div className="space-y-3 rounded-xl border bg-card p-4">
            {problems.length > 0 && (
              <ul className="space-y-1 text-xs text-destructive">
                {problems.map((p) => (
                  <li key={p} className="flex gap-1.5">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {p}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/posts">Huỷ</Link>
              </Button>
              <Button className="flex-1" disabled={busy || problems.length > 0} onClick={submit}>
                {busy ? (
                  <Loader2 className="animate-spin" />
                ) : d.when === "draft" ? (
                  <Save />
                ) : (
                  <ActionIcon />
                )}
                {WHEN.find((w) => w.value === d.when)!.label}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function EditPost({ id }: { id: string }) {
  const post = usePost(id);
  if (post.error) return <ErrorState error={post.error} onRetry={() => post.refetch()} />;
  if (!post.data) return <Skeleton className="h-96 rounded-xl" />;
  if (!can.edit(post.data)) {
    return (
      <EmptyState
        icon={FileText}
        title="Bài này không sửa được nữa"
        description="Chỉ sửa được bài nháp, đã lên lịch hoặc thất bại."
        action={
          <Button asChild size="sm" variant="outline">
            <Link to="/posts">Về danh sách</Link>
          </Button>
        }
      />
    );
  }
  return <Editor post={post.data} />;
}

/** /posts/new and /posts/:postId/edit. Endpoints: POST /posts, GET|PATCH /posts/{id}. */
export function PostEditorPage() {
  const { postId } = useParams();
  const location = useLocation();
  // DEV ONLY demo (see Editor): viewable without an API key.
  if (import.meta.env.DEV && !postId && new URLSearchParams(location.search).has("demo")) {
    return <Editor />;
  }
  return (
    <RequireApiKey>{postId ? <EditPost key={postId} id={postId} /> : <Editor />}</RequireApiKey>
  );
}
