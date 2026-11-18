import { Flag, RefreshCw, Unplug } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";

import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { Button } from "@/shared/components/ui/button";
import { getPlatform } from "@/shared/config/platforms";

import { useDisconnectAccount } from "../api/accounts";
import type { SocialAccount } from "../api/types";
import { needsReconnect } from "../lib/account-status";
import { ConnectDialog } from "./connect-dialog";

/** Per-account actions: reconnect + disconnect (with confirmation). */
export function AccountActions({ account }: { account: SocialAccount }) {
  const disconnect = useDisconnectAccount();
  const attention = needsReconnect(account.status);

  return (
    <div className="flex items-center justify-end gap-1">
      {getPlatform(account.platform)?.slug === "facebook" && (
        <Button
          asChild
          variant="ghost"
          size="sm"
          title="Quản lý Facebook Page"
          className="text-muted-foreground"
        >
          <Link to={`/accounts/${account.id}/pages`}>
            <Flag />
            <span className="hidden xl:inline">Page</span>
          </Link>
        </Button>
      )}
      <ConnectDialog
        reconnect={account}
        trigger={
          <Button
            variant={attention ? "default" : "ghost"}
            size="sm"
            title="Kết nối lại"
            className={attention ? undefined : "text-muted-foreground"}
          >
            <RefreshCw />
            <span className="hidden xl:inline">Kết nối lại</span>
          </Button>
        }
      />
      <ConfirmDialog
        trigger={
          <Button
            variant="ghost"
            size="icon-sm"
            title="Ngắt kết nối"
            aria-label="Ngắt kết nối"
            className="text-muted-foreground hover:text-destructive"
          >
            <Unplug />
          </Button>
        }
        title={`Ngắt kết nối ${account.name}?`}
        description="Không thể hoàn tác."
        confirmLabel="Ngắt kết nối"
        onConfirm={async () => {
          await disconnect.mutateAsync(account.id);
          toast.success(`Đã ngắt kết nối ${account.name}`);
        }}
      >
        <p className="text-sm text-muted-foreground">
          Bình luận, tin nhắn và tự động trả lời đã lưu của tài khoản này sẽ bị xoá. Nếu kết nối lại
          sau, tài khoản sẽ có ID mới.
        </p>
      </ConfirmDialog>
    </div>
  );
}
