// ─── Company Brand Utilities ─────────────────────────────────────
// Hex-to-RGB conversion, brand color CSS variable generation,
// and email brand config resolution for white-label companies.

import type { Company } from "./types";

// ─── Types ───────────────────────────────────────────────────────

export interface CompanyBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string;           // Hex, e.g. "#2563EB"
  brandColorRgb: string;        // Space-separated RGB, e.g. "37 99 235"
  emailFromName: string;
  emailFooter: string;
  website: string;
  poweredBy: string;            // "Powered by Kairos"
}

export interface EmailBrandConfig {
  companyName: string;
  primaryColor: string;         // Hex color for email
  primaryColorDark: string;     // Darker variant for backgrounds
  accentColor: string;          // Gold accent (always Kairos gold)
  logoUrl: string | null;
  fromName: string;
  footer: string;
  website: string;
}

// ─── Hex-to-RGB ──────────────────────────────────────────────────

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace(/^#/, "");
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  if (isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function hexToRgbString(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "59 130 246"; // Fallback to blue
  return `${rgb.r} ${rgb.g} ${rgb.b}`;
}

/**
 * Darken a hex color by the given amount (0-1).
 * Used to generate a darker variant for email backgrounds.
 */
export function darkenHex(hex: string, amount = 0.3): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#1a1a2e";
  const r = Math.max(0, Math.round(rgb.r * (1 - amount)));
  const g = Math.max(0, Math.round(rgb.g * (1 - amount)));
  const b = Math.max(0, Math.round(rgb.b * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Lighten a hex color by the given amount (0-1).
 */
export function lightenHex(hex: string, amount = 0.3): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#4a4a6a";
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// ─── Brand Resolution ────────────────────────────────────────────

const KAIROS_DEFAULTS = {
  name: "KAIROS",
  brandColor: "#C9A89A",  // Warm Slate accent (dusty rose)
  emailFromName: "KAIROS Health",
  emailFooter: "KAIROS Health Management",
  website: "https://kairos.health",
  poweredBy: "Powered by Kairos",
};

/**
 * Resolve a Company into a CompanyBrand with computed fields.
 * Falls back to KAIROS defaults for null/empty values.
 */
export function resolveCompanyBrand(company: Company | null | undefined): CompanyBrand {
  if (!company) {
    return {
      id: "kairos",
      name: KAIROS_DEFAULTS.name,
      slug: "kairos",
      logoUrl: null,
      brandColor: KAIROS_DEFAULTS.brandColor,
      brandColorRgb: hexToRgbString(KAIROS_DEFAULTS.brandColor),
      emailFromName: KAIROS_DEFAULTS.emailFromName,
      emailFooter: KAIROS_DEFAULTS.emailFooter,
      website: KAIROS_DEFAULTS.website,
      poweredBy: KAIROS_DEFAULTS.poweredBy,
    };
  }

  return {
    id: company.id,
    name: company.name,
    slug: company.slug,
    logoUrl: company.logoUrl,
    brandColor: company.brandColor || KAIROS_DEFAULTS.brandColor,
    brandColorRgb: hexToRgbString(company.brandColor || KAIROS_DEFAULTS.brandColor),
    emailFromName: company.emailFromName || company.name,
    emailFooter: company.emailFooter || `Powered by Kairos Health | ${company.name}`,
    website: company.website || KAIROS_DEFAULTS.website,
    poweredBy: KAIROS_DEFAULTS.poweredBy,
  };
}

/**
 * Generate CSS variable overrides for a company's brand color.
 * These can be applied as inline styles on a container to override
 * the default theme accent color.
 */
export function brandCssVars(brand: CompanyBrand): Record<string, string> {
  const rgb = hexToRgbString(brand.brandColor);
  const lightRgb = hexToRgbString(lightenHex(brand.brandColor, 0.6));
  const deepRgb = hexToRgbString(darkenHex(brand.brandColor, 0.2));

  return {
    "--k-company-brand": rgb,
    "--k-company-brand-light": lightRgb,
    "--k-company-brand-deep": deepRgb,
  };
}

/**
 * Build an email brand config from a company, for use with the email template engine.
 */
export function resolveEmailBrand(company: Company | null | undefined): EmailBrandConfig {
  const brand = resolveCompanyBrand(company);
  return {
    companyName: brand.name,
    primaryColor: brand.brandColor,
    primaryColorDark: darkenHex(brand.brandColor, 0.6),
    accentColor: "#D4AF37",  // Always Kairos gold for emails
    logoUrl: brand.logoUrl,
    fromName: brand.emailFromName,
    footer: brand.emailFooter,
    website: brand.website,
  };
}
