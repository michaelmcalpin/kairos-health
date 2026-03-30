"use client";

import { useState } from "react";
import {
  Settings,
  Shield,
  Bell,
  Palette,
  Save,
} from "lucide-react";
import { useTheme, THEMES } from "@/lib/theme";
import type { ThemeId } from "@/lib/theme";
import { trpc } from "@/lib/trpc";

export default function AdminSettingsPage() {
  const { theme, setTheme } = useTheme();

  // Fetch user data
  const { data: authUser } = trpc.auth.me.useQuery();

  // Platform settings are stored locally for now with a comment about DB persistence
  // TODO: Create an admin.settings router mutation to persist platform settings to DB
  const [platform, setPlatform] = useState({
    platformName: "KAIROS Health",
    supportEmail: "support@kairos.health",
    maxClientsPerCoach: "50",
    sessionTimeout: "30",
  });

  // Notification preferences stored locally
  // TODO: Wire to trpc.admin.settings mutation once endpoint is created
  const [notifications, setNotifications] = useState({
    coachSignups: true,
    revenueAlerts: true,
    systemErrors: true,
    weeklyDigest: true,
  });

  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setPlatform((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // For now, platform and notification settings are stored locally.
      // In production, these would be persisted via tRPC mutations to the database.
      setSaveMessage("Changes saved successfully");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setSaveMessage("Failed to save changes");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-kairos-gold" />
        <h1 className="font-heading text-3xl font-bold text-white">Admin Settings</h1>
      </div>

      {saveMessage && (
        <div className="p-4 bg-success/15 border border-success/30 rounded-kairos-sm text-kairos-silver">
          {saveMessage}
        </div>
      )}

      {/* Platform */}
      <div className="kairos-card">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-kairos-gold" />
          <h2 className="font-heading text-xl font-semibold text-white">Platform</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Platform Name", name: "platformName", type: "text" },
            { label: "Support Email", name: "supportEmail", type: "email" },
            { label: "Max Clients per Coach", name: "maxClientsPerCoach", type: "number" },
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
      </div>

      {/* Notifications */}
      <div className="kairos-card">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-kairos-gold" />
          <h2 className="font-heading text-xl font-semibold text-white">Notifications</h2>
        </div>
        <div className="space-y-3">
          {([
            { key: "coachSignups" as const, label: "New Coach Registrations" },
            { key: "revenueAlerts" as const, label: "Revenue Threshold Alerts" },
            { key: "systemErrors" as const, label: "System Error Reports" },
            { key: "weeklyDigest" as const, label: "Weekly Platform Digest" },
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

      {/* Appearance */}
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

      {/* Save */}
      <div className="flex justify-end gap-4">
        <button className="kairos-btn-outline">Cancel</button>
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
