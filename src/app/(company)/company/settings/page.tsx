"use client";

import { useState } from "react";
import { Building2, Palette, Bell, Mail, Eye } from "lucide-react";
import { useTheme, THEMES } from "@/lib/theme";
import { useCompanyBrand, useCompanyList } from "@/lib/company-ops";

export default function CompanySettingsPage() {
  const { theme: currentTheme, setTheme } = useTheme();
  const { brand, setCompanyId, company } = useCompanyBrand();
  const companies = useCompanyList();

  // Local editable state seeded from brand
  const [companyName, setCompanyName] = useState(brand.name);
  const [website, setWebsite] = useState(brand.website);
  const [emailFooter, setEmailFooter] = useState(brand.emailFooter);
  const [brandColor, setBrandColor] = useState(brand.brandColor);
  const [emailFromName, setEmailFromName] = useState(brand.emailFromName);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl text-white mb-2">Company Settings</h1>
        <p className="font-body text-kairos-silver-dark">Manage your company profile and branding</p>
      </div>

      <div className="space-y-8 max-w-3xl">

        {/* Company Selector (for demo: pick which company to preview) */}
        <div className="kairos-card bg-kairos-card border border-kairos-border">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-bold text-lg text-white">Preview Company</h2>
          </div>
          <p className="font-body text-sm text-kairos-silver-dark mb-3">
            Select a company to preview its white-label branding
          </p>
          <div className="flex flex-wrap gap-2">
            {companies.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCompanyId(c.id);
                  setCompanyName(c.name);
                  setWebsite(c.website);
                  setEmailFooter(c.emailFooter || `Powered by Kairos Health | ${c.name}`);
                  setBrandColor(c.brandColor);
                  setEmailFromName(c.emailFromName || c.name);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-kairos-sm border transition-all ${
                  company?.id === c.id
                    ? "border-kairos-gold bg-kairos-gold/10"
                    : "border-kairos-border hover:border-kairos-gold/50"
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: c.brandColor }}
                />
                <span className="font-body text-sm text-white">{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Company Profile */}
        <div className="kairos-card bg-kairos-card border border-kairos-border">
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
        <div className="kairos-card bg-kairos-card border border-kairos-border">
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
        <div className="kairos-card bg-kairos-card border border-kairos-border">
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
        <div className="kairos-card bg-kairos-card border border-kairos-border">
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
        <div className="kairos-card bg-kairos-card border border-kairos-border">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-bold text-lg text-white">Notifications</h2>
          </div>
          <div className="space-y-4">
            {["New trainer sign-ups", "Client milestones", "Weekly reports"].map((label) => (
              <label key={label} className="flex items-center justify-between py-2">
                <span className="font-body text-sm text-white">{label}</span>
                <div className="w-10 h-6 bg-kairos-gold/30 rounded-full relative cursor-pointer">
                  <div className="absolute top-1 left-5 w-4 h-4 bg-kairos-gold rounded-full transition-all" />
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
