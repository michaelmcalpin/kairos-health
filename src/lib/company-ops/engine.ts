// ─── Company Operations Engine ───────────────────────────────────
// CRUD operations for multi-tenant companies.
// In-memory store seeded with demo data for development.

import type {
  Company,
  CompanyStats,
  CompanyTrainer,
  CompanyClient,
  UserRole,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

let nextId = 6; // seed companies use 1–5
function uid(): string {
  return `company-${nextId++}`;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── In-Memory Store ─────────────────────────────────────────────

const companyStore = new Map<string, Company>();
const auditStore: CompanyAuditEntry[] = [];

export interface CompanyAuditEntry {
  id: string;
  action: "company.created" | "company.updated" | "company.suspended" | "company.reactivated" | "company.deleted";
  companyId: string;
  companyName: string;
  performedBy: string | null;
  details: string;
  timestamp: string;
}

// ─── Seed Data ────────────────────────────────────────────────────

interface CompanySeed {
  name: string;
  slug: string;
  brandColor: string;
  website: string;
  maxTrainers: number;
  maxClients: number;
  trainerCount: number;
  clientCount: number;
}

const COMPANY_SEEDS: CompanySeed[] = [
  {
    name: "Peak Performance Health",
    slug: "peak-performance",
    brandColor: "#2563EB",
    website: "https://peakperformance.health",
    maxTrainers: 10,
    maxClients: 100,
    trainerCount: 4,
    clientCount: 32,
  },
  {
    name: "Vitality Wellness Group",
    slug: "vitality-wellness",
    brandColor: "#059669",
    website: "https://vitalitywellness.com",
    maxTrainers: 5,
    maxClients: 50,
    trainerCount: 3,
    clientCount: 18,
  },
  {
    name: "Longevity Labs",
    slug: "longevity-labs",
    brandColor: "#7C3AED",
    website: "https://longevitylabs.io",
    maxTrainers: 15,
    maxClients: 200,
    trainerCount: 8,
    clientCount: 64,
  },
  {
    name: "Sarah Williams Coaching",
    slug: "sarah-williams",
    brandColor: "#DC2626",
    website: "https://sarahwilliamscoaching.com",
    maxTrainers: 1,
    maxClients: 15,
    trainerCount: 1,
    clientCount: 12,
  },
  {
    name: "BioSync Health",
    slug: "biosync-health",
    brandColor: "#0891B2",
    website: "https://biosync.health",
    maxTrainers: 8,
    maxClients: 75,
    trainerCount: 5,
    clientCount: 41,
  },
];

const TRAINER_NAMES = [
  { firstName: "Sarah", lastName: "Williams", email: "sarah@" },
  { firstName: "Mike", lastName: "Torres", email: "mike@" },
  { firstName: "Jennifer", lastName: "Chang", email: "jennifer@" },
  { firstName: "David", lastName: "Park", email: "david@" },
  { firstName: "Rachel", lastName: "Kim", email: "rachel@" },
  { firstName: "James", lastName: "Morrison", email: "james@" },
  { firstName: "Anna", lastName: "Wright", email: "anna@" },
  { firstName: "Carlos", lastName: "Rivera", email: "carlos@" },
];

// Initialize store with seed data
function initStore() {
  if (companyStore.size > 0) return;
  const seed = 1;
  COMPANY_SEEDS.forEach((s, i) => {
    const id = `company-${i + 1}`;
    companyStore.set(id, {
      id,
      name: s.name,
      slug: s.slug,
      logoUrl: null,
      brandColor: s.brandColor,
      emailFromName: s.name,
      emailFooter: `Powered by Kairos Health | ${s.name}`,
      website: s.website,
      status: "active",
      maxTrainers: s.maxTrainers,
      maxClients: s.maxClients,
      trainerCount: s.trainerCount + Math.round(seededRandom(seed + i) * 2),
      clientCount: s.clientCount + Math.round(seededRandom(seed + i + 10) * 5),
      createdAt: `2024-${String(1 + (i * 2) % 12).padStart(2, "0")}-15`,
    });
  });
}

// ─── Audit Logging ───────────────────────────────────────────────

let auditId = 1;

function logAudit(
  action: CompanyAuditEntry["action"],
  companyId: string,
  companyName: string,
  performedBy: string | null,
  details: string,
) {
  auditStore.unshift({
    id: `ca-${auditId++}`,
    action,
    companyId,
    companyName,
    performedBy,
    details,
    timestamp: new Date().toISOString(),
  });
}

// ─── CRUD Operations ─────────────────────────────────────────────

export interface CreateCompanyInput {
  name: string;
  slug?: string;
  brandColor?: string;
  website?: string;
  emailFromName?: string;
  emailFooter?: string;
  maxTrainers?: number;
  maxClients?: number;
}

export function createCompany(input: CreateCompanyInput, performedBy?: string | null): Company {
  initStore();

  const slug = input.slug || slugify(input.name);

  // Check for duplicate slug
  const existing = Array.from(companyStore.values()).find((c) => c.slug === slug);
  if (existing) throw new Error(`A company with slug "${slug}" already exists`);

  const now = new Date().toISOString();
  const company: Company = {
    id: uid(),
    name: input.name,
    slug,
    logoUrl: null,
    brandColor: input.brandColor || "#D4A574",
    emailFromName: input.emailFromName || input.name,
    emailFooter: input.emailFooter || `Powered by Kairos Health | ${input.name}`,
    website: input.website || "",
    status: "active",
    maxTrainers: input.maxTrainers ?? 10,
    maxClients: input.maxClients ?? 100,
    trainerCount: 0,
    clientCount: 0,
    createdAt: now,
  };

  companyStore.set(company.id, company);
  logAudit("company.created", company.id, company.name, performedBy ?? null, `Created company "${company.name}"`);
  return company;
}

export interface UpdateCompanyInput {
  name?: string;
  slug?: string;
  brandColor?: string;
  website?: string;
  emailFromName?: string;
  emailFooter?: string;
  logoUrl?: string | null;
  maxTrainers?: number;
  maxClients?: number;
}

export function updateCompany(companyId: string, updates: UpdateCompanyInput, performedBy?: string | null): Company {
  initStore();

  const company = companyStore.get(companyId);
  if (!company) throw new Error("Company not found");

  // If slug is changing, check uniqueness
  if (updates.slug && updates.slug !== company.slug) {
    const existing = Array.from(companyStore.values()).find((c) => c.slug === updates.slug && c.id !== companyId);
    if (existing) throw new Error(`A company with slug "${updates.slug}" already exists`);
  }

  const changes: string[] = [];
  if (updates.name && updates.name !== company.name) changes.push(`name: "${company.name}" → "${updates.name}"`);
  if (updates.brandColor && updates.brandColor !== company.brandColor) changes.push(`brandColor: ${company.brandColor} → ${updates.brandColor}`);
  if (updates.maxTrainers !== undefined && updates.maxTrainers !== company.maxTrainers) changes.push(`maxTrainers: ${company.maxTrainers} → ${updates.maxTrainers}`);
  if (updates.maxClients !== undefined && updates.maxClients !== company.maxClients) changes.push(`maxClients: ${company.maxClients} → ${updates.maxClients}`);

  const updated: Company = { ...company, ...updates } as Company;
  companyStore.set(companyId, updated);

  logAudit(
    "company.updated",
    companyId,
    updated.name,
    performedBy ?? null,
    changes.length > 0 ? `Updated: ${changes.join(", ")}` : "Updated company details",
  );

  return updated;
}

export type CompanyAction = "suspend" | "reactivate" | "delete";

export function performCompanyAction(
  companyId: string,
  action: CompanyAction,
  reason?: string,
  performedBy?: string | null,
): Company | null {
  initStore();

  const company = companyStore.get(companyId);
  if (!company) throw new Error("Company not found");

  switch (action) {
    case "suspend": {
      const updated = { ...company, status: "suspended" as const };
      companyStore.set(companyId, updated);
      logAudit("company.suspended", companyId, company.name, performedBy ?? null, reason || "Company suspended");
      return updated;
    }
    case "reactivate": {
      const updated = { ...company, status: "active" as const };
      companyStore.set(companyId, updated);
      logAudit("company.reactivated", companyId, company.name, performedBy ?? null, reason || "Company reactivated");
      return updated;
    }
    case "delete": {
      companyStore.delete(companyId);
      logAudit("company.deleted", companyId, company.name, performedBy ?? null, reason || "Company deleted");
      return null;
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// ─── Read Operations ─────────────────────────────────────────────

export interface CompanyListFilters {
  search?: string;
  status?: "all" | "active" | "inactive" | "suspended" | "onboarding";
  sortBy?: "name" | "createdAt" | "trainerCount" | "clientCount";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface CompanyListResult {
  companies: Company[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function listCompanies(filters: CompanyListFilters = {}): CompanyListResult {
  initStore();

  const {
    search = "",
    status = "all",
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    pageSize = 20,
  } = filters;

  let companies = Array.from(companyStore.values());

  // Filter by search
  if (search) {
    const q = search.toLowerCase();
    companies = companies.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || c.website.toLowerCase().includes(q),
    );
  }

  // Filter by status
  if (status !== "all") {
    companies = companies.filter((c) => c.status === status);
  }

  // Sort
  companies.sort((a, b) => {
    const dir = sortOrder === "asc" ? 1 : -1;
    switch (sortBy) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "trainerCount":
        return dir * (a.trainerCount - b.trainerCount);
      case "clientCount":
        return dir * (a.clientCount - b.clientCount);
      case "createdAt":
      default:
        return dir * a.createdAt.localeCompare(b.createdAt);
    }
  });

  const total = companies.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const paged = companies.slice(start, start + pageSize);

  return { companies: paged, total, page, pageSize, totalPages };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getCompanies(seed = 1): Company[] {
  initStore();
  // Ignore seed param now — kept for backward compat
  return Array.from(companyStore.values());
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getCompany(companyId: string, _seed = 1): Company | undefined {
  initStore();
  return companyStore.get(companyId);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getCompanyStats(_seed = 1): CompanyStats {
  initStore();
  const companies = Array.from(companyStore.values());
  const active = companies.filter((c) => c.status === "active");
  const totalTrainers = active.reduce((sum, c) => sum + c.trainerCount, 0);
  const totalClients = active.reduce((sum, c) => sum + c.clientCount, 0);
  const mrr = totalClients * 200;

  return {
    totalCompanies: companies.length,
    activeCompanies: active.length,
    totalTrainers,
    totalClients,
    mrr,
  };
}

export function getCompanyTrainers(companyId: string, seed = 1): CompanyTrainer[] {
  initStore();
  const company = companyStore.get(companyId);
  if (!company) return [];

  const count = company.trainerCount;
  return Array.from({ length: count }, (_, i) => {
    const nameIdx = i % TRAINER_NAMES.length;
    const name = TRAINER_NAMES[nameIdx];
    return {
      id: `trainer-${companyId}-${i + 1}`,
      firstName: name.firstName,
      lastName: name.lastName,
      email: `${name.email.replace("@", "")}@${company.slug}.com`,
      avatarUrl: null,
      clientCount: Math.round(3 + seededRandom(seed + i * 13) * 10),
      capacity: 15 + Math.round(seededRandom(seed + i * 17) * 10),
      rating: parseFloat((4.2 + seededRandom(seed + i * 19) * 0.8).toFixed(1)),
      status: "active" as const,
    };
  });
}

export function getCompanyClients(companyId: string, seed = 1): CompanyClient[] {
  initStore();
  const trainers = getCompanyTrainers(companyId, seed);
  if (trainers.length === 0) return [];

  const company = companyStore.get(companyId);
  if (!company) return [];

  const totalClients = company.clientCount;
  const tiers: Array<"tier1" | "tier2" | "tier3"> = ["tier1", "tier2", "tier3"];
  const firstNames = ["Alex", "Jordan", "Casey", "Morgan", "Taylor", "Riley", "Quinn", "Avery", "Blake", "Drew"];
  const lastNames = ["Smith", "Johnson", "Brown", "Davis", "Wilson", "Lee", "Clark", "Lewis", "Hall", "Young"];

  return Array.from({ length: totalClients }, (_, i) => {
    const trainer = trainers[i % trainers.length];
    const tierIdx = Math.floor(seededRandom(seed + i * 7) * 3);
    return {
      id: `client-${companyId}-${i + 1}`,
      firstName: firstNames[i % firstNames.length],
      lastName: lastNames[Math.floor(seededRandom(seed + i * 11) * lastNames.length)],
      email: `client${i + 1}@${company.slug}.com`,
      tier: tiers[tierIdx],
      trainerId: trainer.id,
      trainerName: `${trainer.firstName} ${trainer.lastName}`,
      status: "active" as const,
    };
  });
}

// ─── Audit Log ───────────────────────────────────────────────────

export function getCompanyAuditLog(limit = 50, companyId?: string): CompanyAuditEntry[] {
  const filtered = companyId
    ? auditStore.filter((e) => e.companyId === companyId)
    : auditStore;
  return filtered.slice(0, limit);
}

// ─── Legacy Helpers ──────────────────────────────────────────────

export function filterCompanies(
  companies: Company[],
  query: string,
  status: "All" | "active" | "inactive" | "suspended" = "All",
): Company[] {
  return companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.slug.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "All" || c.status === status;
    return matchesSearch && matchesStatus;
  });
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    super_admin: "Super Admin",
    company_admin: "Company Admin",
    trainer: "Trainer",
    client: "Client",
  };
  return labels[role] ?? role;
}

export function getRolePath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    super_admin: "/super-admin/dashboard",
    company_admin: "/company/dashboard",
    trainer: "/trainer/dashboard",
    client: "/dashboard",
  };
  return paths[role] ?? "/dashboard";
}

export const COMPANY_STATUSES = ["All", "active", "inactive", "suspended"] as const;
