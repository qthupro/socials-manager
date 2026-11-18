import { QrCode } from "lucide-react";
import { useState, type ReactNode } from "react";

import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { CopyButton } from "@/shared/components/copy-button";
import { Button } from "@/shared/components/ui/button";

import { DONATE_INFO } from "../donate-info";

function QrImage() {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <div className="flex size-56 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center text-xs text-muted-foreground">
        <QrCode className="size-10" />
        Đặt ảnh mã QR vào
        <code className="rounded bg-muted px-1.5 py-0.5">public/donate-qr.png</code>
      </div>
    );
  }

  return (
    <img
      src={DONATE_INFO.qrImage}
      alt="Mã QR ủng hộ"
      onError={() => setMissing(true)}
      className="size-56 rounded-xl bg-white object-contain p-3 shadow-sm ring-1 ring-black/5"
    />
  );
}

/** "Support the developer" dialog with a QR code; `children` is the element that opens it. */
export function DonateDialog({ children }: { children: ReactNode }) {
  return (
    <AppDialog
      trigger={children}
      title="Ủng hộ tác giả"
      description="Cảm ơn bạn đã sử dụng Social Manager"
      footerNote="Quét mã bằng app ngân hàng hoặc ví điện tử"
      footer={
        <AppDialogClose asChild>
          <Button size="sm">Đóng</Button>
        </AppDialogClose>
      }
    >
      <div className="flex flex-col items-center gap-5">
        <QrImage />

        <p className="text-center text-sm leading-relaxed text-muted-foreground">
          {DONATE_INFO.message}
        </p>

        <dl className="w-full divide-y rounded-xl border bg-muted/40 text-sm">
          {DONATE_INFO.details.map(({ label, value, copy }) => (
            <div key={label} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="flex items-center gap-1.5 font-medium">
                {value}
                {copy && <CopyButton value={value} />}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </AppDialog>
  );
}
