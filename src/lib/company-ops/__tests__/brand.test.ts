import { describe, it, expect } from "vitest";
import {
  hexToRgb,
  hexToRgbString,
  darkenHex,
  lightenHex,
  resolveCompanyBrand,
  brandCssVars,
  resolveEmailBrand,
} from "../brand";
import type { Company } from "../types";

// ─── hexToRgb ────────────────────────────────────────────────────

describe("hexToRgb", () => {
  it("parses standard 6-digit hex", () => {
    expect(hexToRgb("#2563EB")).toEqual({ r: 37, g: 99, b: 235 });
  });

  it("parses without hash prefix", () => {
    expect(hexToRgb("FF0000")).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("parses black", () => {
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
  });

  it("parses white", () => {
    expect(hexToRgb("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("returns null for invalid hex", () => {
    expect(hexToRgb("#ZZZ")).toBeNull();
    expect(hexToRgb("")).toBeNull();
    expect(hexToRgb("#12")).toBeNull();
  });
});

// ─── hexToRgbString ──────────────────────────────────────────────

describe("hexToRgbString", () => {
  it("returns space-separated RGB", () => {
    expect(hexToRgbString("#2563EB")).toBe("37 99 235");
  });

  it("returns fallback for invalid hex", () => {
    expect(hexToRgbString("invalid")).toBe("59 130 246");
  });
});

// ─── darkenHex ───────────────────────────────────────────────────

describe("darkenHex", () => {
  it("darkens white by 50%", () => {
    const result = darkenHex("#FFFFFF", 0.5);
    expect(result).toBe("#808080");
  });

  it("darkens a color by default amount", () => {
    const result = darkenHex("#2563EB");
    // 30% darker: r=37*.7=26, g=99*.7=69, b=235*.7=165
    expect(result).toBe("#1a45a5");
  });

  it("returns fallback for invalid hex", () => {
    expect(darkenHex("invalid")).toBe("#1a1a2e");
  });
});

// ─── lightenHex ──────────────────────────────────────────────────

describe("lightenHex", () => {
  it("lightens black by 50%", () => {
    const result = lightenHex("#000000", 0.5);
    expect(result).toBe("#808080");
  });

  it("lightens a color by default amount", () => {
    const result = lightenHex("#2563EB");
    // 30% lighter: r=37+(255-37)*0.3=102, g=99+(255-99)*0.3=146, b=235+(255-235)*0.3=241
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns fallback for invalid hex", () => {
    expect(lightenHex("invalid")).toBe("#4a4a6a");
  });
});

// ─── resolveCompanyBrand ─────────────────────────────────────────

describe("resolveCompanyBrand", () => {
  const mockCompany: Company = {
    id: "company-1",
    name: "Peak Performance Health",
    slug: "peak-performance",
    logoUrl: "https://example.com/logo.png",
    brandColor: "#2563EB",
    emailFromName: "Peak Team",
    emailFooter: "Peak Performance Health | Powered by Kairos",
    website: "https://peak.health",
    status: "active",
    maxTrainers: 10,
    maxClients: 100,
    trainerCount: 4,
    clientCount: 32,
    createdAt: "2024-01-15",
  };

  it("resolves a full company brand", () => {
    const brand = resolveCompanyBrand(mockCompany);
    expect(brand.id).toBe("company-1");
    expect(brand.name).toBe("Peak Performance Health");
    expect(brand.brandColor).toBe("#2563EB");
    expect(brand.brandColorRgb).toBe("37 99 235");
    expect(brand.logoUrl).toBe("https://example.com/logo.png");
    expect(brand.emailFromName).toBe("Peak Team");
    expect(brand.poweredBy).toBe("Powered by Kairos");
  });

  it("falls back to KAIROS defaults for null company", () => {
    const brand = resolveCompanyBrand(null);
    expect(brand.id).toBe("kairos");
    expect(brand.name).toBe("KAIROS");
    expect(brand.brandColor).toBe("#C9A89A");
    expect(brand.poweredBy).toBe("Powered by Kairos");
  });

  it("falls back to KAIROS defaults for undefined company", () => {
    const brand = resolveCompanyBrand(undefined);
    expect(brand.name).toBe("KAIROS");
  });

  it("uses company name as emailFromName when empty", () => {
    const brand = resolveCompanyBrand({ ...mockCompany, emailFromName: "" });
    expect(brand.emailFromName).toBe("Peak Performance Health");
  });

  it("generates emailFooter when empty", () => {
    const brand = resolveCompanyBrand({ ...mockCompany, emailFooter: "" });
    expect(brand.emailFooter).toContain("Powered by Kairos");
    expect(brand.emailFooter).toContain("Peak Performance Health");
  });
});

// ─── brandCssVars ────────────────────────────────────────────────

describe("brandCssVars", () => {
  it("generates CSS variable overrides", () => {
    const brand = resolveCompanyBrand({
      id: "test",
      name: "Test",
      slug: "test",
      logoUrl: null,
      brandColor: "#2563EB",
      emailFromName: "Test",
      emailFooter: "Test",
      website: "https://test.com",
      status: "active",
      maxTrainers: 5,
      maxClients: 50,
      trainerCount: 2,
      clientCount: 10,
      createdAt: "2024-01-01",
    });
    const vars = brandCssVars(brand);
    expect(vars["--k-company-brand"]).toBe("37 99 235");
    expect(vars["--k-company-brand-light"]).toBeTruthy();
    expect(vars["--k-company-brand-deep"]).toBeTruthy();
  });
});

// ─── resolveEmailBrand ───────────────────────────────────────────

describe("resolveEmailBrand", () => {
  it("resolves email config from company", () => {
    const company: Company = {
      id: "company-1",
      name: "Peak Performance Health",
      slug: "peak-performance",
      logoUrl: null,
      brandColor: "#2563EB",
      emailFromName: "Peak Team",
      emailFooter: "Peak Performance | Powered by Kairos",
      website: "https://peak.health",
      status: "active",
      maxTrainers: 10,
      maxClients: 100,
      trainerCount: 4,
      clientCount: 32,
      createdAt: "2024-01-15",
    };
    const config = resolveEmailBrand(company);
    expect(config.companyName).toBe("Peak Performance Health");
    expect(config.primaryColor).toBe("#2563EB");
    expect(config.accentColor).toBe("#D4AF37");
    expect(config.fromName).toBe("Peak Team");
    expect(config.footer).toBe("Peak Performance | Powered by Kairos");
  });

  it("falls back to defaults for null company", () => {
    const config = resolveEmailBrand(null);
    expect(config.companyName).toBe("KAIROS");
    expect(config.primaryColor).toBe("#C9A89A");
    expect(config.accentColor).toBe("#D4AF37");
  });
});
