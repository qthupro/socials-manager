import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/shared/components/ui/button";

/** Copies `value` to the clipboard; shows a check mark briefly. Icon-only unless `label` is set. */
export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Không sao chép được, hãy chọn và copy thủ công.");
    }
  };

  const icon = copied ? <Check className="text-green-600" /> : <Copy />;

  return label ? (
    <Button type="button" variant="outline" size="sm" onClick={copy}>
      {icon} {copied ? "Đã chép" : label}
    </Button>
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={copy}
      aria-label="Sao chép"
      title="Sao chép"
    >
      {icon}
    </Button>
  );
}
