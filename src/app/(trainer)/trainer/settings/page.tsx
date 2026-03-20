"use client";

import { useState } from "react";
import {
  Settings,
  User,
  Bell,
  Palette,
  Save,
} from "lucide-react";
import { useTheme, THEMES } from "@/lib/theme";
import type { ThemeId } from "@/lib/theme";

export default function CoachSettingsPage() {
  const { theme, setTheme } = useTheme();

  const [formData, setFormData] = useState({
    displayName: "Dr. Marcus Chen",
    email: "marcus.chen@kairos.health",
    specialization: "Longevity Medicine",
    timezone: "America/Los_Angeles",
  });

  const [notifications, setNotifications] = useState({
    clientAlerts: true,
    labResults: true,
    appointmentReminders: true,
    weeklyReports: true,
  });

  const [saveMessage, setSaveMessage] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveChanges = () => {
    setSaveMessage("Changes saved successfully");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-kairos-gold" />
        <h1 className="font-heading text-3xl font-bold text-white">Coach Settings</h1>
      </div>

      {saveMessage && (
        <div className="p-4 bg-success/15 border border-success/30 rounded-kairos-sm text-kairos-silver">
          {saveMessage}
        </div>
      )}

      {/* Profile */}
      <div className="kairos-card">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5 text-kairos-gold" />
          <h2 className="font-heading text-xl font-semibold text-white">Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Display Name", name: "displayName", type: "text" },
            { label: "Email", name: "email", type: "email" },
            { label: "Specialization", name: "specialization", type: "text" },
          ].map((field) => (
            <div key={field.name}>
              <label className="block font-body text-kairos-silver-dark text-sm mb-2">{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={formData[field.name as keyof typeof formData]}
                onChange={handleInputChange}
                className="w-full kairos-input"
              />
            </div>
          ))}
          <div>
            <label className="block font-body text-kairos-silver-dark text-sm mb-2">Timezone</label>
            <select name="timezone" value={formData.timezone} onChange={handleInputChange} className="w-full kairos-input">
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
            </select>
          </div>
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
            { key: "clientAlerts" as const, label: "Client Health Alerts" },
            { key: "labResults" as const, label: "New Lab Results" },
            { key: "appointmentReminders" as const, label: "Appointment Reminders" },
            { key: "weeklyReports" as const, label: "Weekly Client Reports" },
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
          Choose your preferred visual theme for the KAIROS dashboard.
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
        <button onClick={handleSaveChanges} className="kairos-btn-gold flex items-center gap-2">
          <Save className="w-5 h-5" />
          Save Changes
        </button>
      </div>
    </div>
  );
}
