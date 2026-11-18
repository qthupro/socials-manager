import { Bot } from "lucide-react";

import { ComingSoon } from "@/shared/components/coming-soon";

/**
 * SocialAPI endpoints for this screen:
 *   GET|POST /automations
 *   GET|PATCH|DELETE /automations/{id}
 *   GET /automations/{id}/firings
 */
export function AutomationsPage() {
  return (
    <ComingSoon
      icon={Bot}
      title="Tự động trả lời"
      description="Tự động trả lời bình luận và tin nhắn theo từ khoá (Instagram, Facebook)."
    />
  );
}
