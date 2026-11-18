/** Interactive cells for the Facebook Page tables (they need hooks, so they're components). */
import { ArrowRightLeft, Plus, Star } from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage } from "@/shared/api";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { PlatformIcon } from "@/shared/components/platform-icon";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";

import {
  useAssignPage,
  useUpdatePage,
  type AccountPage,
  type LoginPage,
} from "../api/facebook-pages";

export function PageIdentity({
  name,
  picture,
  sub,
}: {
  name: string;
  picture?: string;
  sub?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {picture ? (
        <img src={picture} alt="" className="size-8 shrink-0 rounded-lg bg-muted object-cover" />
      ) : (
        <PlatformIcon platform="facebook" />
      )}
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function PageDefaultCell({ accountId, page }: { accountId: string; page: AccountPage }) {
  const update = useUpdatePage(accountId);

  if (page.is_default) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Star className="size-3 fill-current" /> Mặc định
      </Badge>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-muted-foreground"
      disabled={!page.is_active || update.isPending}
      title={page.is_active ? undefined : "Bật Page trước khi đặt mặc định"}
      onClick={() =>
        update
          .mutateAsync({ pageId: page.id, is_default: true })
          .then(() => toast.success(`Đã đặt "${page.name}" làm Page mặc định`))
          .catch((err) => toast.error(getErrorMessage(err)))
      }
    >
      <Star /> Đặt mặc định
    </Button>
  );
}

export function PageActiveCell({ accountId, page }: { accountId: string; page: AccountPage }) {
  const update = useUpdatePage(accountId);

  return (
    <label className="flex items-center gap-2 text-sm">
      <Switch
        checked={page.is_active}
        disabled={update.isPending}
        onCheckedChange={(v) =>
          update
            .mutateAsync({ pageId: page.id, is_active: v })
            .then(() => toast.success(v ? `Đã bật "${page.name}"` : `Đã tắt "${page.name}"`))
            .catch((err) => toast.error(getErrorMessage(err)))
        }
      />
      <span className={page.is_active ? undefined : "text-muted-foreground"}>
        {page.is_active ? "Hoạt động" : "Đã tắt"}
      </span>
    </label>
  );
}

export function AssignPageCell({
  loginId,
  brandId,
  page,
}: {
  loginId: string;
  brandId: string;
  page: LoginPage;
}) {
  const assign = useAssignPage(loginId);

  const doAssign = async () => {
    await assign.mutateAsync({ platformPageId: page.platform_page_id, brandId });
    toast.success(`Đã thêm "${page.name}" vào thương hiệu`);
  };

  if (page.assignable) {
    return (
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          disabled={assign.isPending}
          onClick={() => doAssign().catch((err) => toast.error(getErrorMessage(err)))}
        >
          <Plus /> Thêm
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="ghost">
            <ArrowRightLeft /> Chuyển về đây
          </Button>
        }
        tone="primary"
        title={`Chuyển "${page.name}" về thương hiệu này?`}
        description={`Page sẽ rời khỏi "${page.assigned_brand_name ?? "thương hiệu khác"}". Mỗi Page chỉ thuộc 1 thương hiệu.`}
        confirmLabel="Chuyển"
        onConfirm={doAssign}
      />
    </div>
  );
}
