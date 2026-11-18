import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { api, getErrorMessage, useApiKey, useMe, type Me } from "@/shared/api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { SettingsRow, SettingsSection } from "@/shared/components/settings-list";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { openExternal } from "@/shared/platform/opener";

/** Where new users create a SocialAPI account (referral link). */
export const SOCIAL_API_SIGNUP_URL = "https://social-api.ai?via=qthupro";

/** Buying through SOCIAL_API_SIGNUP_URL applies this discount automatically. */
export function SignupDiscountBadge() {
  return (
    <Badge className="h-4 bg-green-600 px-1.5 text-[10px] text-white">
      Giảm 50% khi mua qua link này
    </Badge>
  );
}

const maskKey = (key: string) => `${key.slice(0, 13)}••••${key.slice(-4)}`;

function KeyForm({ onDone }: { onDone?: () => void }) {
  const setApiKey = useApiKey((s) => s.setApiKey);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);

  // Test the key against GET /users/me before saving it.
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const key = draft.trim();
    setTesting(true);
    try {
      const user = await api.getWithKey<Me>("/users/me", key);
      setApiKey(key);
      queryClient.clear(); // Cached data belongs to the previous key.
      toast.success(`Đã kết nối: ${user.email}`);
      onDone?.();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <form onSubmit={save} className="flex w-full gap-2 px-4 pb-3">
      <div className="relative flex-1">
        <Input
          autoFocus
          type={show ? "text" : "password"}
          placeholder="sapi_key_…"
          autoComplete="off"
          spellCheck={false}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
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
      <Button type="submit" size="sm" disabled={!draft.trim() || testing}>
        {testing ? "Đang kiểm tra…" : "Lưu"}
      </Button>
      {onDone && (
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Huỷ
        </Button>
      )}
    </form>
  );
}

export function ApiKeySection() {
  const { apiKey, setApiKey } = useApiKey();
  const queryClient = useQueryClient();
  const me = useMe();
  const [editing, setEditing] = useState(false);

  const remove = () => {
    setApiKey("");
    queryClient.clear();
    toast.success("Đã xoá API key");
  };

  return (
    <SettingsSection title="SocialAPI">
      {apiKey ? (
        <div>
          <SettingsRow
            label={
              <span className="flex items-center gap-2">
                {me.data?.email ?? "API key"}
                {me.data && (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[10px] uppercase">
                    {me.data.plan}
                  </Badge>
                )}
              </span>
            }
            hint={
              me.error ? (
                <span className="text-destructive">{getErrorMessage(me.error)}</span>
              ) : (
                <span className="font-mono">{maskKey(apiKey)}</span>
              )
            }
          >
            {!editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                Đổi
              </Button>
            )}
            <ConfirmDialog
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  Xoá
                </Button>
              }
              title="Xoá API key?"
              description="App sẽ không gọi được SocialAPI cho tới khi bạn nhập key mới."
              confirmLabel="Xoá"
              onConfirm={remove}
            />
          </SettingsRow>
          {editing && <KeyForm onDone={() => setEditing(false)} />}
        </div>
      ) : (
        <div>
          <SettingsRow
            label="API key"
            hint={
              <>
                Tạo key trong dashboard SocialAPI. Chưa có tài khoản?{" "}
                <button
                  type="button"
                  onClick={() => openExternal(SOCIAL_API_SIGNUP_URL)}
                  className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                >
                  Đăng ký SocialAPI <ExternalLink className="size-3" />
                </button>{" "}
                <SignupDiscountBadge />
              </>
            }
          />
          <KeyForm />
        </div>
      )}
    </SettingsSection>
  );
}
