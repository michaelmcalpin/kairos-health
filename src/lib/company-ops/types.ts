// ─── Company Operations Types ────────────────────────────────────
// Multi-tenant company model for the 4-tier architecture.

export type UserRole = "super_admin" | "company_admin" | "trainer" | "client";

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandColor: string;
  emailFromName: string;
  emailFooter: string;
  website: string;
  status: "active" | "inactive" | "suspended" | "onboarding";
  maxTrainers: number;
  maxClients: number;
  trainerCount: number;
  clientCount: number;
  createdAt: string;
}

export interface CompanyStats {
  totalCompanies: number;
  activeCompanies: number;
  totalTrainers: number;
  totalClients: number;
  mrr: number;
}

export interface CompanyTrainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  clientCount: number;
  capacity: number;
  rating: number;
  status: "active" | "inactive";
}

export interface CompanyClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tier: "tier1" | "tier2" | "tier3";
  trainerId: string;
  trainerName: string;
  status: "active" | "inactive";
}

export interface RoleOption {
  role: UserRole;
  label: string;
  description: string;
  icon: string;
  path: string;
}

export const ROLE_OPTIONS: RoleOption[] = [
  {
    role: "super_admin",
    label: "Super Admin",
    description: "Kairos platform administration",
    icon: "Shield",
    path: "/super-admin/dashboard",
  },
  {
    role: "company_admin",
    label: "Company Admin",
    description: "Manage trainers and clients",
    icon: "Building2",
    path: "/company/dashboard",
  },
  {
    role: "trainer",
    label: "Trainer",
    description: "Manage your clients",
    icon: "Dumbbell",
    path: "/trainer/dashboard",
  },
  {
    role: "client",
    label: "Client",
    description: "Track your health journey",
    icon: "Heart",
    path: "/dashboard",
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  company_admin: "Company Admin",
  trainer: "Trainer",
  client: "Client",
};
