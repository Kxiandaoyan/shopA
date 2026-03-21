export const appRoles = {
  superAdmin: "SUPER_ADMIN",
  affiliateAdmin: "AFFILIATE_ADMIN",
} as const;

export type AppRole = (typeof appRoles)[keyof typeof appRoles];
