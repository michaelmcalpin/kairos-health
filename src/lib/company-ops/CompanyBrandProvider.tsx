"use client";

// ─── Company Brand Context ───────────────────────────────────────
// Provides white-label branding to the component tree.
// Loads company via tRPC query and exposes brand config + CSS variable overrides.

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import type { Company } from "./types";
import type { CompanyBrand } from "./brand";
import { resolveCompanyBrand, brandCssVars } from "./brand";
import { trpc } from "@/lib/trpc";

// ─── Context ─────────────────────────────────────────────────────

interface CompanyBrandContextValue {
  company: Company | null;
  brand: CompanyBrand;
  setCompanyId: (id: string | null) => void;
  cssVars: Record<string, string>;
}

const CompanyBrandContext = createContext<CompanyBrandContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────

const STORAGE_KEY = "kairos-company";

export function CompanyBrandProvider({ children }: { children: ReactNode }) {
  const [companyId, setCompanyIdState] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load saved company from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setCompanyIdState(saved);
    }
    setMounted(true);
  }, []);

  // Persist company selection
  function setCompanyId(id: string | null) {
    setCompanyIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // Fetch company from DB when companyId is set
  const { data: companyData } = trpc.admin.companies.list.useQuery(
    { pageSize: 100 },
    { enabled: mounted, staleTime: 60_000 }
  );

  // Resolve company from fetched list
  const company = useMemo(() => {
    if (!companyId || !companyData?.companies) return null;
    const found = companyData.companies.find((c) => c.id === companyId);
    if (!found) return null;
    return found as unknown as Company;
  }, [companyId, companyData]);

  const brand = useMemo(() => resolveCompanyBrand(company), [company]);
  const cssVars = useMemo(() => brandCssVars(brand), [brand]);

  // Don't render children until we've checked localStorage (avoids flash)
  if (!mounted) return null;

  return (
    <CompanyBrandContext.Provider value={{ company, brand, setCompanyId, cssVars }}>
      {children}
    </CompanyBrandContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────

export function useCompanyBrand(): CompanyBrandContextValue {
  const ctx = useContext(CompanyBrandContext);
  if (!ctx) {
    // Return safe defaults when outside provider (super-admin, client portals)
    return {
      company: null,
      brand: resolveCompanyBrand(null),
      setCompanyId: () => {},
      cssVars: brandCssVars(resolveCompanyBrand(null)),
    };
  }
  return ctx;
}

// ─── Utility: Get all companies for selectors ────────────────────

export function useCompanyList(): Company[] {
  const { data } = trpc.admin.companies.list.useQuery(
    { pageSize: 100 },
    { staleTime: 60_000 }
  );
  return useMemo(() => {
    if (!data?.companies) return [];
    return data.companies as unknown as Company[];
  }, [data]);
}
