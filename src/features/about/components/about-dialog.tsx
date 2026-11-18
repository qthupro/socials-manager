import type { ReactNode } from "react";

import { AppDialog, AppDialogClose } from "@/shared/components/app-dialog";
import { Button } from "@/shared/components/ui/button";

import { APP_INFO } from "../app-info";
import { DeveloperContactList } from "./developer-contacts";

/** "About this app" dialog; `children` is the element that opens it. */
export function AboutDialog({ children }: { children: ReactNode }) {
  return (
    <AppDialog
      trigger={children}
      title={APP_INFO.name}
      description={APP_INFO.tagline}
      footerNote={APP_INFO.copyright}
      footer={
        <AppDialogClose asChild>
          <Button size="sm">Đóng</Button>
        </AppDialogClose>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <img src="/app-icon.svg" alt="" className="size-14 rounded-[22%]" />
          <div>
            <p className="font-medium">{APP_INFO.name}</p>
            <p className="font-mono text-xs text-muted-foreground">v{APP_INFO.version}</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{APP_INFO.description}</p>

        <DeveloperContactList />

        <dl className="divide-y rounded-xl border bg-muted/40 text-sm">
          {APP_INFO.details.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="truncate font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </AppDialog>
  );
}
