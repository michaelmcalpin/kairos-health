"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Shield,
  Bell,
  Palette,
  Save,
  Building2,
} from "lucide-react";
import { useTheme, THEMES } from "@/lib/theme";
import type { ThemeId } from "@/lib/theme";
import { CompanySelector, useCompanyFilter } from "@/components/admin/CompanySelector";
import { trpc } from "@/lib/trpc";

export default function AdminSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { selectedCompany, setSelectedCompany, company } = useCompanyFilter();
  const utils = trpc.useUtils();

  // Determine companyId for scoped queries (undefined = global platform settings)
  const companyId = company ? company.id : undefined;

  // Fetch persisted platform settings (scoped by company when selected)
  const { data: savedPlatform } = trpc.admin.platform.getSettings.useQuery({
    key: "platform",
    companyId,
  });
  const { data: savedNotifs } = trpc.admin.platform.getNotificationPrefs.useQuery();

  const [platform, setPlatform] = useState({
    platformName: "KAIROS Health",
    supportEmail: "support@kairos.health",
    maxClientsPerTrainer: "50",
    sessionTimeout: "30",
  });

  const [notifications, setNotifications] = useState({
    trainerSignups: true,
    revenueAlerts: true,
    systemErrors: true,
    weeklyDigest: true,
  });

  // Hydrate platform settings from DB
  useEffect(() => {
    if (savedPlatform && typeof savedPlatform === "object") {
      const p = savedPlatform as Record<string, string>;
      setPlatform((prev) => ({
        platformName: p.platformName ?? prev.platformName,
        supportEmail: p.supportEmail ?? prev.supportEmail,
        maxClientsPerTrainer: p.maxClientsPerTrainer ?? prev.maxClientsPerTrainer,
        sessionTimeout: p.sessionTimeout ?? prev.sessionTimeout,
      }));
    } else if (company) {
      // Fallback to company info if no saved settings yet
      setPlatform({
        platformName: company.name,
        supportEmail: `admin@${company.slug}.com`,
        maxClientsPerTrainer: String(company.maxClients),
        sessionTimeout: "30",
      });
    } else {
      setPlatform({
        platformName: "KAIROS Health",
        supportEmail: "support@kairos.health",
        maxClientsPerTrainer: "50",
        sessionTimeout: "30",
      });
    }
  }, [savedPlatform, company]);

  // Hydrate notification prefs from DB
  useEffect(() => {
    if (savedNotifs && typeof savedNotifs === "object") {
      const n = savedNotifs as Record<string, { in_app: boolean }>;
      setNotifications({
        trainerSignups: n.trainerSignups?.in_app ?? true,
        revenueAlerts: n.revenueAlerts?.in_app ?? true,
        systemErrors: n.systemErrors?.in_app ?? true,
        weeklyDigest: n.weeklyDigest?.in_app ?? true,
      });
    }
  }, [savedNotifs]);

  const [saveMessage, setSaveMessage] = useState("");

  const savePlatformMutation = trpc.admin.platform.saveSettings.useMutation({
    onSuccess: () => {
      utils.admin.platform.getSettings.invalidate();
    },
  });

  const saveNotifsMutation = trpc.admin.platform.saveNotificationPrefs.useMutation({
    onSuccess: () => {
      utils.admin.platform.getNotificationPrefs.invalidate();
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPlatform((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isSaving = savePlatformMutation.isPending || saveNotifsMutation.isPending;

  const handleSaveChanges = async () => {
    try {
      await Promise.all([
        savePlatformMutation.mutateAsync({
          key: "platform",
          value: platform as unknown as Record<string, unknown>,
          companyId,
        }),
        saveNotifsMutation.mutateAsync({
          categories: Object.fromEntries(
            Object.entries(notifications).map(([k, v]) => [
              k,
              { in_app: v, email: v, push: false, sms: false },
            ]),
          ),
        }),
      ]);
      setSaveMessage("Changes saved successfully");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch {
      setSaveMessage("Failed to save changes");
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8 text-kairos-gold" />
          <h1 className="font-heading text-3xl font-bold text-white">
            {company ? `${company.name} Settings` : "Admin Settings"}
          </h1>
        </div>
        <CompanySelector value={selectedCompany} onChange={setSelectedCompany} />
      </div>

      {saveMessage && (
        <div className="p-4 bg-success/15 border border-success/30 rounded-kairos-sm text-kairos-silver">
          {saveMessage}
        </div>
      )}

      {/* Company Badge */}
      {company && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-kairos-sm border"
          style={{ borderColor: company.brandColor + "40", backgroundColor: company.brandColor + "10" }}
        >
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: company.brandColor }}
          >
            {company.name.charAt(0)}
          </div>
          <div>
            <span className="font-heading font-semibold text-white text-sm">{company.name}</span>
            <p className="text-[10px] text-kairos-silver-dark">{company.website || company.slug}</p>
          </div>
          <div className="ml-auto flex items-center gap-4 text-xs text-kairos-silver-dark">
            <span>Brand: <span className="inline-block w-3 h-3 rounded-full align-middle ml-1" style={{ backgroundColor: company.brandColor }} /></span>
            <span>{company.trainerCount} trainers</span>
            <span>{company.clientCount} clients</span>
          </div>
        </div>
      )}

      {/* Platform / Company Settings */}
      <div className="kairos-card">
        <div className="flex items-center gap-3 mb-6">
          {company ? <Building2 className="w-5 h-5 text-kairos-gold" /> : <Shield className="w-5 h-5 text-kairos-gold" />}
          <h2 className="font-heading text-xl font-semibold text-white">
            {company ? "Company Configuration" : "Platform"}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: company ? "Company Name" : "Platform Name", name: "platformName", type: "text" },
            { label: company ? "Admin Email" : "Support Email", name: "supportEmail", type: "email" },
            { label: "Max Clients per Trainer", name: "maxClientsPerTrainer", type: "number" },
            { label: "Session Timeout (min)", name: "sessionTimeout", type: "number" },
          ].map((field) => (
            <div key={field.name}>
              <label className="block font-body text-kairos-silver-dark text-sm mb-2">{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={platform[field.name as keyof typeof platform]}
                onChange={handleInputChange}
                className="w-full kairos-input"
              />
            </div>
          ))}
        </div>

        {/* Company-specific branding preview */}
        {company && (
          <div className="mt-6 pt-6 border-t border-kairos-border">
            <h3 className="font-heading text-sm font-semibold text-white mb-3">Branding Preview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/30 rounded-xl p-3">
                <span className="text-xs text-gray-500">Brand Color</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: company.brandColor }} />
                  <span className="text-sm text-white font-mono">{company.brandColor}</span>
                </div>
              </div>
              <div className="bg-gray-800/30 rounded-xl p-3">
                <span className="text-xs text-gray-500">Email From Name</span>
                <p className="text-sm text-white mt-1">{company.emailFromName}</p>
              </div>
              <div className="bg-gray-800/30 rounded-xl p-3">
                <span className="text-xs text-gray-500">Capacity</span>
                <p className="text-sm text-white mt-1">{company.maxTrainers} trainers / {company.maxClients} clients</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="kairos-card">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-kairos-gold" />
          <h2 className="font-heading text-xl font-semibold text-white">Notifications</h2>
        </div>
        <div className="space-y-3">
          {([
            { key: "trainerSignups" as const, label: company ? "New Trainer Joins Company" : "New Trainer Registrations" },
            { key: "revenueAlerts" as const, label: "Revenue Threshold Alerts" },
            { key: "systemErrors" as const, label: "System Error Reports" },
            { key: "weeklyDigest" as const, label: company ? `${company.name} Weekly Digest` : "Weekly Platform Digest" },
          ]).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-kairos-card-hover rounded-kairos-sm border border-kairos-border">
              <span className="font-body text-kairos-silver-dark">{label}</span>
              <button
                onClick={() => handleNotificationChange(key)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notifications[key] ? "bg-kairos-gold" : "bg-gray-600 border border-kairos-border"
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-kairos-card rounded-full transition-transform ${
                  notifications[key] ? "translate-x-6" : "translate-x-1"
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Appearance (platform-level only) */}
      {!company && (
        <div className="kairos-card">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading text-xl font-semibold text-white">Appearance</h2>
          </div>
          <p className="text-sm font-body text-kairos-silver-dark mb-4">
            Choose the default visual theme for the KAIROS platform.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(THEMES) as ThemeId[]).map((id) => {
              const t = THEMES[id];
              const isActive = theme === id;
              const swatches = id === "warm-slate"
                ? ["#3A3A3C", "#C9A89A", "#FAF5F0", "#8B6F65"]
                : ["#122055", "#D4AF37", "#E0E0E0", "#9E9E9E"];
              return (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`text-left p-5 rounded-kairos-sm border-2 transition-all ${
                    isActive ? "border-kairos-gold bg-kairos-gold/10" : "border-kairos-border hover:border-kairos-gold/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isActive ? "border-kairos-gold" : "border-kairos-border"
                    }`}>
                      {isActive && <div className="w-2 h-2 rounded-full bg-kairos-gold" />}
                    </div>
                    <span className="font-heading font-semibold text-kairos-silver">{t.name}</span>
                  </div>
                  <p className="text-xs font-body text-kairos-silver-dark mb-3">{t.description}</p>
                  <div className="flex gap-2">
                    {swatches.map((color, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border border-kairos-border" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end gap-4">
        <button onClick={() => window.location.reload()} className="kairos-btn-outline">Cancel</button>
        <button
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="kairos-btn-gold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
