// ─── Company Operations Engine ───────────────────────────────────
// Deterministic company data for the multi-tenant admin pages.

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

// ─── Engine Functions ─────────────────────────────────────────────

export function getCompanies(seed = 1): Company[] {
  return COMPANY_SEEDS.map((s, i) => ({
    id: `company-${i + 1}`,
    name: s.name,
    slug: s.slug,
    logoUrl: null,
    brandColor: s.brandColor,
    emailFromName: s.name,
    emailFooter: `Powered by Kairos Health | ${s.name}`,
    website: s.website,
    status: "active" as const,
    maxTrainers: s.maxTrainers,
    maxClients: s.maxClients,
    trainerCount: s.trainerCount + Math.round(seededRandom(seed + i) * 2),
    clientCount: s.clientCount + Math.round(seededRandom(seed + i + 10) * 5),
    createdAt: `2024-${String(1 + (i * 2) % 12).padStart(2, "0")}-15`,
  }));
}

export function getCompany(companyId: string, seed = 1): Company | undefined {
  return getCompanies(seed).find((c) => c.id === companyId);
}

export function getCompanyStats(seed = 1): CompanyStats {
  const companies = getCompanies(seed);
  const active = companies.filter((c) => c.status === "active");
  const totalTrainers = active.reduce((sum, c) => sum + c.trainerCount, 0);
  const totalClients = active.reduce((sum, c) => sum + c.clientCount, 0);

  // Estimate MRR from client counts (blended rate ~$200/client)
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
  const company = getCompany(companyId, seed);
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
  const trainers = getCompanyTrainers(companyId, seed);
  if (trainers.length === 0) return [];

  const company = getCompany(companyId, seed);
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
