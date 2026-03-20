"use client";

import { useState } from "react";
import { Building2, Palette, Bell } from "lucide-react";
import { useTheme, THEMES } from "@/lib/theme";

export default function CompanySettingsPage() {
  const { theme: currentTheme, setTheme } = useTheme();
  const [companyName] = useState("Peak Performance Health");

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl text-white mb-2">Company Settings</h1>
        <p className="font-body text-kairos-silver-dark">Manage your company profile and branding</p>
      </div>

      <div className="space-y-8 max-w-3xl">
        <div className="kairos-card bg-kairos-card border border-kairos-border">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-bold text-lg text-white">Company Profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="kairos-label">Company Name</label>
              <input type="text" defaultValue={companyName} className="kairos-input w-full" readOnly />
            </div>
            <div>
              <label className="kairos-label">Website</label>
              <input type="text" defaultValue="https://peakperformance.health" className="kairos-input w-full" readOnly />
            </div>
            <div>
              <label className="kairos-label">Email Footer</label>
              <input type="text" defaultValue="Powered by Kairos Health | Peak Performance Health" className="kairos-input w-full" readOnly />
            </div>
          </div>
        </div>

        <div className="kairos-card bg-kairos-card border border-kairos-border">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-bold text-lg text-white">Appearance</h2>
          </div>
          <div className="space-y-4">
            <p className="font-body text-sm text-kairos-silver-dark">Choose the theme for your company portal</p>
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
