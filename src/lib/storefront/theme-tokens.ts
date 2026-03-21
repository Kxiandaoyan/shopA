import type { StorefrontTemplateCode } from "@/lib/storefront/template-resolver";

export type TemplateTheme = {
  shellClassName: string;
  eyebrow: string;
  title: string;
  subtitle: string;
};

export function getTemplateTheme(template: StorefrontTemplateCode): TemplateTheme {
  switch (template) {
    case "B":
      return {
        shellClassName: "bg-[#10251f] text-[#ecf1e7]",
        eyebrow: "Precision cleaning collection",
        title: "Professional-grade cleaning tools, presented with proof before payment.",
        subtitle:
          "Built for buyers who want clearer materials, stronger feature callouts, and a more editorial product story.",
      };
    case "C":
      return {
        shellClassName: "bg-[#fff5eb] text-[#34180b]",
        eyebrow: "Fast checkout promotion",
        title: "A sharper, campaign-led storefront for high-utility home cleaning gear.",
        subtitle:
          "Shorter copy, stronger hierarchy, and clear offer framing before the mandatory payment redirect.",
      };
    case "A":
    default:
      return {
        shellClassName: "bg-[#f6f1e8] text-[#163028]",
        eyebrow: "Modern home cleaning essentials",
        title: "Thoughtful cleaning tools for floors, glass, bathrooms, and quick daily resets.",
        subtitle:
          "The default storefront pairs calm presentation with a fast, server-validated checkout flow.",
      };
  }
}
