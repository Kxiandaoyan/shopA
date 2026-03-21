export const storefrontTemplates = ["A", "B", "C"] as const;

export type StorefrontTemplateCode = (typeof storefrontTemplates)[number];

export function resolveStorefrontTemplate(
  templateCode?: string | null,
): StorefrontTemplateCode {
  if (templateCode && storefrontTemplates.includes(templateCode as StorefrontTemplateCode)) {
    return templateCode as StorefrontTemplateCode;
  }

  return "A";
}
