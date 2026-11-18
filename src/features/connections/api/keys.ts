export const brandKeys = {
  all: ["brands"] as const,
};

export const accountKeys = {
  all: ["accounts"] as const,
  list: (brandId?: string) => ["accounts", { brandId: brandId ?? null }] as const,
};

export const facebookKeys = {
  all: ["facebook"] as const,
  accountPages: (accountId: string) => ["facebook", "account-pages", accountId] as const,
  loginPages: (loginId: string) => ["facebook", "login-pages", loginId] as const,
};
