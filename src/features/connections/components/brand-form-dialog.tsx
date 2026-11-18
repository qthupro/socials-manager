import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { getErrorMessage } from "@/shared/api";
import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";

import { useCreateBrand, useRenameBrand } from "../api/brands";
import type { Brand } from "../api/types";

/** Create a brand, or rename one when `brand` is given. */
export function BrandFormDialog({ trigger, brand }: { trigger: ReactNode; brand?: Brand }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = useCreateBrand();
  const rename = useRenameBrand();
  const pending = create.isPending || rename.isPending;

  const handleOpenChange = (next: boolean) => {
    if (next) setName(brand?.name ?? "");
    setOpen(next);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    try {
      if (brand) {
        await rename.mutateAsync({ id: brand.id, name: value });
        toast.success("Đã đổi tên thương hiệu");
      } else {
        await create.mutateAsync(value);
        toast.success(`Đã tạo thương hiệu "${value}"`);
      }
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <AppDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={trigger}
      title={brand ? "Đổi tên thương hiệu" : "Tạo thương hiệu"}
      description="Thương hiệu nhóm các tài khoản của một doanh nghiệp hoặc khách hàng."
      size="sm"
      footer={
        <>
          <AppDialogClose asChild>
            <Button variant="outline" size="sm" disabled={pending}>
              Huỷ
            </Button>
          </AppDialogClose>
          <Button size="sm" type="submit" form="brand-form" disabled={!name.trim() || pending}>
            {pending ? "Đang lưu…" : brand ? "Lưu" : "Tạo"}
          </Button>
        </>
      }
    >
      <form id="brand-form" onSubmit={submit} className="grid gap-2">
        <Label htmlFor="brand-name">Tên thương hiệu</Label>
        <Input
          id="brand-name"
          autoFocus
          placeholder="VD: Quán cà phê ABC"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </form>
    </AppDialog>
  );
}
