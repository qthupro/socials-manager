/**
 * Plan-dependent limits from https://docs.social-api.ai/guides/plans and platforms/facebook.
 * Brand limits are read live from GET /usage; only limits the API doesn't expose live here.
 */

/** Max active Facebook Pages per brand, by plan tier. null = unlimited. */
const FACEBOOK_PAGES_PER_BRAND: Record<string, number | null> = {
  free: 2,
  starter: 5,
  pro: 10,
  business: 20,
  enterprise: null,
};

export function facebookPageCap(plan?: string): number | null | undefined {
  return plan ? FACEBOOK_PAGES_PER_BRAND[plan] : undefined;
}

export function facebookPageCapLabel(plan?: string): string | undefined {
  const cap = facebookPageCap(plan);
  if (cap === undefined) return undefined;
  return cap === null ? "Không giới hạn Page" : `Tối đa ${cap} Page / thương hiệu`;
}
