import { Mail } from "lucide-react";
import { SiFacebook, SiZalo } from "react-icons/si";

import { openExternal } from "@/shared/platform/opener";

import { DEVELOPER } from "../app-info";

const CONTACTS = [
  {
    key: "email",
    label: "Email",
    value: DEVELOPER.email,
    href: `mailto:${DEVELOPER.email}`,
    icon: <Mail className="size-4" />,
  },
  {
    key: "facebook",
    label: "Facebook",
    value: "facebook.com/qthupro",
    href: DEVELOPER.facebook,
    icon: <SiFacebook className="size-3.5 text-[#1877F2]" />,
  },
  {
    key: "zalo",
    label: "Zalo",
    value: DEVELOPER.zalo,
    href: DEVELOPER.zaloUrl,
    icon: <SiZalo className="size-4 text-[#0068FF]" />,
  },
];

/** Labelled rows (About dialog): click to open mail / Facebook / Zalo. */
export function DeveloperContactList() {
  return (
    <div className="divide-y rounded-xl border bg-muted/40 text-sm">
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <span className="text-muted-foreground">Nhà phát triển</span>
        <span className="font-medium">{DEVELOPER.name}</span>
      </div>
      {CONTACTS.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => openExternal(c.href)}
          className="flex w-full items-center justify-between gap-4 px-4 py-2.5 text-left transition-colors hover:bg-muted"
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            {c.icon} {c.label}
          </span>
          <span className="truncate font-medium text-primary">{c.value}</span>
        </button>
      ))}
    </div>
  );
}
