"use client";

import { useState, useEffect, useCallback } from "react";
import { Building2, Palette, Bell, Mail, Eye, Save, Check, Loader2 } from "lucide-react";
import { useTheme, THEMES } from "@/lib/theme";
import { useCompanyBrand } from "@/lib/company-ops";
import { trpc } from "@/lib/trpc";

export default function CompanySettingsPage() {
  const { theme: currentTheme, setTheme } = useTheme();
  const { brand } = useCompanyBrand();

  // Fetch real settings from DB via tRPC
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.company.settings.get.useQuery(undefined, {
    staleTime: 30_000,
  });

  const updateMutation = trpc.company.settings.update.useMutation({
    onSuccess: () => {
      utils.company.settings.get.invalidate();
      utils.company.dashboard.getDashboard.invalidate();
      setSaveMsg("Settings saved successfully");
      setTimeout(() => setSaveMsg(null), 3000);
    },
    onError: (err) => {
      setSaveMsg(err.message || "Save failed");
      setTimeout(() => setSaveMsg(null), 3000);
    },
  });

  // Local editable state seeded from DB settings
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [emailFooter, setEmailFooter] = useState("");
  const [brandColor, setBrandColor] = useState("#D4AF37");
  const [emailFromName, setEmailFromName] = useState("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [notifications, setNotifications] = useState({
    trainerSignups: true,
    clientMilestones: true,
    weeklyReports: true,
  });

  // Sync form when settings load from DB
  useEffect(() => {
    if (settings && !seeded) {
      setCompanyName(settings.name);
      setWebsite(settings.website);
      setEmailFooter(settings.emailFooter);
      setBrandColor(settings.brandColor);
      setEmailFromName(settings.emailFromName);
      setSeeded(true);
    }
  }, [settings, seeded]);

  const isDirty = settings && (
    companyName !== settings.name ||
    website !== settings.website ||
    emailFooter !== settings.emailFooter ||
    brandColor !== settings.brandColor ||
    emailFromName !== settings.emailFromName
  );

  const handleSave = useCallback(() => {
    if (!settings) return;
    updateMutation.mutate({
      name: companyName,
      website,
      emailFooter,
      brandColor,
      emailFromName,
    });
    // Reset seeded so next fetch re-syncs the form
    setSeeded(false);
  }, [settings, companyName, website, emailFooter, brandColor, emailFromName, updateMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-kairos-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-body text-kairos-silver-dark">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">Company Settings</h1>
          <p className="font-body text-kairos-silver-dark">Manage your company profile and branding</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className={`flex items-center gap-1 text-sm font-body ${saveMsg.includes("success") ? "text-green-400" : "text-red-400"}`}>
              {saveMsg.includes("success") && <Check size={14} />}
              {saveMsg}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-kairos-gold text-kairos-royal-dark rounded-kairos-sm font-heading font-semibold text-sm hover:bg-kairos-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="space-y-8 max-w-3xl">

        {/* Company Profile */}
        <div className="kairos-card">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-bold text-lg text-white">Company Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="kairos-label">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="kairos-input w-full"
              />
            </div>
            <div>
              <label className="kairos-label">Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="kairos-input w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="kairos-label">Brand Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-10 h-10 rounded-kairos-sm border border-kairos-border cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="kairos-input flex-1 font-mono text-sm"
                    maxLength={7}
                  />
                </div>
              </div>
              <div>
                <label className="kairos-label">Logo Preview</label>
                <div
                  className="h-10 w-10 rounded-kairos-sm flex items-center justify-center text-white font-heading font-bold"
                  style={{ backgroundColor: brandColor }}
                >
                  {companyName.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Brand Preview */}
        <div className="kairos-card">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-bold text-lg text-white">Brand Preview</h2>
          </div>
          <div className="bg-gray-900/50 rounded-kairos p-4">
            {/* Mini sidebar preview */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-kairos-royal rounded-kairos-sm border border-kairos-border">
              <div
                className="w-8 h-8 rounded-kairos-sm flex items-center justify-center text-white font-heading font-bold text-sm"
                style={{ backgroundColor: brandColor }}
              >
                {companyName.charAt(0)}
              </div>
              <div>
                <p className="font-heading font-bold text-sm" style={{ color: brandColor }}>{companyName}</p>
                <p className="text-[9px] text-kairos-silver-dark uppercase tracking-widest">Health Platform</p>
              </div>
            </div>
            {/* Mini topbar preview */}
            <div className="flex items-center justify-between p-3 bg-kairos-royal-dark/50 rounded-kairos-sm border border-kairos-border mb-4">
              <div>
                <p className="font-heading font-bold text-sm" style={{ color: brandColor }}>{companyName}</p>
                <p className="text-[9px] text-kairos-silver-dark">Company Portal</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-700 rounded-full" />
              </div>
            </div>
            {/* Footer preview */}
            <div className="text-center py-2 border-t border-kairos-border">
              <p className="text-[10px] text-kairos-silver-dark">
                Powered by <span className="text-kairos-gold font-semibold">KAIROS</span>
              </p>
            </div>
          </div>
        </div>

        {/* Email Branding */}
        <div className="kairos-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-kairos-gold" />
              <h2 className="font-heading font-bold text-lg text-white">Email Branding</h2>
            </div>
            <button
              onClick={() => setShowEmailPreview(!showEmailPreview)}
              className="text-xs text-kairos-gold hover:text-kairos-gold-light transition-colors"
            >
              {showEmailPreview ? "Hide Preview" : "Show Preview"}
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="kairos-label">Sender Name</label>
              <input
                type="text"
                value={emailFromName}
                onChange={(e) => setEmailFromName(e.target.value)}
                className="kairos-input w-full"
                placeholder="e.g. Peak Performance Health"
              />
            </div>
            <div>
              <label className="kairos-label">Email Footer</label>
              <input
                type="text"
                value={emailFooter}
                onChange={(e) => setEmailFooter(e.target.value)}
                className="kairos-input w-full"
                placeholder="e.g. Powered by Kairos Health | Your Company"
              />
            </div>
          </div>

          {/* Email Preview */}
          {showEmailPreview && (
            <div className="mt-6 bg-gray-900/50 rounded-kairos p-4">
              <p className="text-xs text-kairos-silver-dark mb-3 font-heading">Email Preview</p>
              <div className="rounded-kairos overflow-hidden" style={{ backgroundColor: brandColor + "15" }}>
                {/* Email header */}
                <div className="text-center py-4" style={{ backgroundColor: brandColor + "20" }}>
                  <span className="font-heading font-bold text-lg" style={{ color: brandColor }}>
                    {companyName}
                  </span>
                </div>
                {/* Email body */}
                <div className="p-4 space-y-3">
                  <p className="font-heading font-bold text-white text-sm">Welcome to {companyName}</p>
                  <p className="text-xs text-kairos-silver-dark leading-relaxed">
                    Your precision health optimization journey begins now...
                  </p>
                  <div
                    className="inline-block px-4 py-2 rounded-lg text-xs font-heading font-semibold"
                    style={{ backgroundColor: brandColor, color: "#fff" }}
                  >
                    Complete Your Profile
                  </div>
                </div>
                {/* Email footer */}
                <div className="text-center py-3 border-t border-gray-700/50">
                  <p className="text-[10px] text-gray-500">{emailFooter}</p>
                  <p className="text-[9px] text-gray-600 mt-1">Powered by KAIROS</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Appearance (Theme) */}
        <div className="kairos-card">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-bold text-lg text-white">Appearance</h2>
          </div>
          <div className="space-y-4">
            <p className="font-body text-sm text-kairos-silver-dark">Choose the base theme for your portal</p>
            <div className="flex gap-4">
              {Object.values(THEMES).map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-kairos-sm border transition-all ${
                    currentTheme === theme.id
                      ? "border-kairos-gold bg-kairos-gold/10"
                      : "border-kairos-border hover:border-kairos-gold/50"
                  }`}
                >
                  <span className="font-body text-sm text-white">{theme.name}</span>
                  {currentTheme === theme.id && (
                    <span className="text-kairos-gold text-xs font-semibold">Active</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="kairos-card">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-bold text-lg text-white">Notifications</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: "trainerSignups" as const, label: "New trainer sign-ups" },
              { key: "clientMilestones" as const, label: "Client milestones" },
              { key: "weeklyReports" as const, label: "Weekly reports" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setNotifications((n) => ({ ...n, [key]: !n[key] }))}
                className="flex items-center justify-between w-full py-2"
              >
                <span className="font-body text-sm text-white">{label}</span>
                <div className={`w-10 h-6 rounded-full relative transition-colors ${
                  notifications[key] ? "bg-kairos-gold/30" : "bg-gray-700"
                }`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                    notifications[key] ? "left-5 bg-kairos-gold" : "left-1 bg-gray-500"
                  }`} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
