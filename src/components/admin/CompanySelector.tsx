"use client";

import { useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface CompanySelectorProps {
  value: string; // "all" or companyId
  onChange: (companyId: string) => void;
}

export type CompanyItem = {
  id: string;
  name: string;
  slug: string;
  brandColor: string;
  website: string;
  status: string;
  trainerCount: number;
  clientCount: number;
  maxTrainers: number;
  maxClients: number;
  emailFromName: string;
  emailFooter: string;
  createdAt: string;
  updatedAt: string;
};

export function CompanySelector({ value, onChange }: CompanySelectorProps) {
  const [open, setOpen] = useState(false);

  const { data } = trpc.admin.companies.list.useQuery(
    { pageSize: 100 },
    { staleTime: 60_000 }
  );
  const companies = data?.companies ?? [];
  const selected = companies.find((c) => c.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-kairos-sm bg-kairos-card border border-kairos-border hover:border-kairos-gold/40 transition-colors text-sm"
      >
        {selected ? (
          <>
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: selected.brandColor }}
            >
              {selected.name.charAt(0)}
            </div>
            <span className="font-heading font-semibold text-white max-w-[180px] truncate">
              {selected.name}
            </span>
          </>
        ) : (
          <>
            <Building2 size={14} className="text-kairos-gold" />
            <span className="font-heading font-semibold text-white">All Companies</span>
          </>
        )}
        <ChevronDown size={14} className="text-kairos-silver-dark ml-1" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-kairos-card border border-kairos-border rounded-kairos-sm shadow-xl overflow-hidden">
            <button
              onClick={() => { onChange("all"); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-kairos-card-hover transition-colors ${
                value === "all" ? "bg-kairos-gold/10 text-kairos-gold" : "text-kairos-silver"
              }`}
            >
              <Building2 size={14} />
              <span className="font-heading font-semibold">All Companies</span>
            </button>
            <div className="border-t border-kairos-border" />
            {companies
              .filter((c) => c.status === "active")
              .map((company) => (
                <button
                  key={company.id}
                  onClick={() => { onChange(company.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-kairos-card-hover transition-colors ${
                    value === company.id ? "bg-kairos-gold/10 text-kairos-gold" : "text-kairos-silver"
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: company.brandColor }}
                  >
                    {company.name.charAt(0)}
                  </div>
                  <span className="font-heading font-semibold truncate">{company.name}</span>
                  <span className="ml-auto text-[10px] text-kairos-silver-dark shrink-0">
                    {company.trainerCount}T / {company.clientCount}C
                  </span>
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

export function useCompanyFilter() {
  const [selectedCompany, setSelectedCompany] = useState<string>("all");

  const { data } = trpc.admin.companies.list.useQuery(
    { pageSize: 100 },
    { staleTime: 60_000 }
  );
  const companies = data?.companies ?? [];
  const company = selectedCompany === "all" ? null : companies.find((c) => c.id === selectedCompany) ?? null;

  return { selectedCompany, setSelectedCompany, company, companies };
}
