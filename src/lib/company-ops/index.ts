export {
  getCompanies,
  getCompany,
  getCompanyStats,
  getCompanyTrainers,
  getCompanyClients,
  filterCompanies,
  getRoleLabel,
  getRolePath,
  COMPANY_STATUSES,
  createCompany,
  updateCompany,
  performCompanyAction,
  listCompanies,
  getCompanyAuditLog,
} from "./engine";

export type {
  CreateCompanyInput,
  UpdateCompanyInput,
  CompanyAction,
  CompanyListFilters,
  CompanyListResult,
  CompanyAuditEntry,
} from "./engine";

export type {
  Company,
  CompanyStats,
  CompanyTrainer,
  CompanyClient,
  UserRole,
  RoleOption,
} from "./types";

export { ROLE_OPTIONS, ROLE_LABELS } from "./types";

export {
  hexToRgb,
  hexToRgbString,
  darkenHex,
  lightenHex,
  resolveCompanyBrand,
  brandCssVars,
  resolveEmailBrand,
} from "./brand";

export type { CompanyBrand, EmailBrandConfig } from "./brand";

export { CompanyBrandProvider, useCompanyBrand, useCompanyList } from "./CompanyBrandProvider";
