"use client";

import { useState } from "react";
import {
  Settings,
  User,
  Bell,
  Smartphone,
  Shield,
  Trash2,
  Save,
} from "lucide-react";

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    displayName: "Sarah Chen",
    email: "sarah.chen@example.com",
    phone: "+1 (555) 123-4567",
    timezone: "America/Los_Angeles",
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    smsAlerts: false,
    weeklyDigest: true,
  });

  const [privacy, setPrivacy] = useState({
    dataSharing: true,
    profileVisibility: "Coach Only",
  });

  const [devices, setDevices] = useState([
    { id: "oura", name: "Oura Ring", status: "connected" },
    { id: "apple", name: "Apple Watch", status: "connected" },
    { id: "dexcom", name: "Dexcom CGM", status: "not connected" },
  ]);

  const [saveMessage, setSaveMessage] = useState("");

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handlePrivacyChange = (key: keyof typeof privacy, value: string | boolean) => {
    setPrivacy((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDeviceAction = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              status: device.status === "connected" ? "not connected" : "connected",
            }
          : device
      )
    );
  };

  const handleSaveChanges = () => {
    setSaveMessage("Changes saved successfully");
    setTimeout(() => setSaveMessage(""), 3000);
  };

  return (
    <div className="min-h-screen bg-kairos-card p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 animate-fade-in">
          <Settings className="w-8 h-8 text-kairos-gold" />
          <h1 className="font-heading text-4xl text-kairos-gold">Settings</h1>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className="mb-6 p-4 bg-green-900 border border-green-500 rounded-kairos-sm text-kairos-silver-dark">
            {saveMessage}
          </div>
        )}

        {/* Profile Section */}
        <div className="kairos-card rounded-kairos-sm p-8 mb-6 bg-kairos-card border border-kairos-border">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-kairos-gold" />
            <h2 className="font-heading text-2xl text-kairos-gold">Profile</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block font-body text-kairos-silver-dark text-sm font-medium mb-2">
                Display Name
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-kairos-card border border-kairos-border text-kairos-silver-dark rounded-kairos-sm focus:outline-none focus:ring-2 focus:ring-kairos-gold focus:border-kairos-gold"
              />
            </div>

            <div>
              <label className="block font-body text-kairos-silver-dark text-sm font-medium mb-2">
                Email (Read-only)
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-3 bg-kairos-card border border-kairos-border text-kairos-silver-dark rounded-kairos-sm opacity-60 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-body text-kairos-silver-dark text-sm font-medium mb-2">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-kairos-card border border-kairos-border text-kairos-silver-dark rounded-kairos-sm focus:outline-none focus:ring-2 focus:ring-kairos-gold focus:border-kairos-gold"
              />
            </div>

            <div>
              <label className="block font-body text-kairos-silver-dark text-sm font-medium mb-2">
                Timezone
              </label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-kairos-card border border-kairos-border text-kairos-silver-dark rounded-kairos-sm focus:outline-none focus:ring-2 focus:ring-kairos-gold focus:border-kairos-gold"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Central European Time (CET)</option>
                <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="kairos-card rounded-kairos-sm p-8 mb-6 bg-kairos-card border border-kairos-border">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-kairos-gold" />
            <h2 className="font-heading text-2xl text-kairos-gold">
              Notification Preferences
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                key: "emailAlerts" as const,
                label: "Email Alerts",
              },
              {
                key: "pushNotifications" as const,
                label: "Push Notifications",
              },
              {
                key: "smsAlerts" as const,
                label: "SMS Alerts",
              },
              {
                key: "weeklyDigest" as const,
                label: "Weekly Digest",
              },
            ].map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between p-4 bg-kairos-card-hover rounded-kairos-sm border border-kairos-border"
              >
                <span className="font-body text-kairos-silver-dark">{label}</span>
                <button
                  onClick={() => handleNotificationChange(key)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notifications[key]
                      ? "bg-kairos-gold"
                      : "bg-gray-600 border border-kairos-border"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-kairos-card rounded-full transition-transform ${
                      notifications[key] ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Connected Devices Section */}
        <div className="kairos-card rounded-kairos-sm p-8 mb-6 bg-kairos-card border border-kairos-border">
          <div className="flex items-center gap-3 mb-6">
            <Smartphone className="w-6 h-6 text-kairos-gold" />
            <h2 className="font-heading text-2xl text-kairos-gold">
              Connected Devices
            </h2>
          </div>

          <div className="space-y-4">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-4 bg-kairos-card-hover rounded-kairos-sm border border-kairos-border"
              >
                <div>
                  <p className="font-body text-kairos-silver-dark font-medium">
                    {device.name}
                  </p>
                  <p
                    className={`text-sm ${
                      device.status === "connected"
                        ? "text-green-400"
                        : "text-gray-400"
                    }`}
                  >
                    {device.status === "connected"
                      ? "Connected"
                      : "Not Connected"}
                  </p>
                </div>
                <button
                  onClick={() => handleDeviceAction(device.id)}
                  className={`px-6 py-2 rounded-kairos-sm font-body text-sm font-medium transition-colors ${
                    device.status === "connected"
                      ? "bg-red-900 border border-red-500 text-red-300 hover:bg-red-800"
                      : "bg-kairos-gold text-kairos-card hover:bg-yellow-500"
                  }`}
                >
                  {device.status === "connected" ? "Disconnect" : "Connect"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Settings Section */}
        <div className="kairos-card rounded-kairos-sm p-8 mb-6 bg-kairos-card border border-kairos-border">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-kairos-gold" />
            <h2 className="font-heading text-2xl text-kairos-gold">
              Privacy Settings
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between p-4 bg-kairos-card-hover rounded-kairos-sm border border-kairos-border">
                <span className="font-body text-kairos-silver-dark">
                  Data Sharing
                </span>
                <button
                  onClick={() =>
                    handlePrivacyChange("dataSharing", !privacy.dataSharing)
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    privacy.dataSharing
                      ? "bg-kairos-gold"
                      : "bg-gray-600 border border-kairos-border"
                  }`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-kairos-card rounded-full transition-transform ${
                      privacy.dataSharing ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Allow KAIROS to use anonymized data for research purposes
              </p>
            </div>

            <div>
              <label className="block font-body text-kairos-silver-dark text-sm font-medium mb-2">
                Profile Visibility
              </label>
              <select
                value={privacy.profileVisibility}
                onChange={(e) =>
                  handlePrivacyChange("profileVisibility", e.target.value)
                }
                className="w-full px-4 py-3 bg-kairos-card border border-kairos-border text-kairos-silver-dark rounded-kairos-sm focus:outline-none focus:ring-2 focus:ring-kairos-gold focus:border-kairos-gold"
              >
                <option value="Coach Only">Coach Only</option>
                <option value="Team">Team</option>
                <option value="Private">Private</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone Section */}
        <div className="kairos-card rounded-kairos-sm p-8 mb-8 bg-red-950 border border-red-700">
          <div className="flex items-center gap-3 mb-6">
            <Trash2 className="w-6 h-6 text-red-400" />
            <h2 className="font-heading text-2xl text-red-400">Danger Zone</h2>
          </div>

          <p className="font-body text-gray-300 mb-4">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>
          <button className="px-6 py-3 bg-transparent border-2 border-red-500 text-red-400 rounded-kairos-sm font-body font-medium hover:bg-red-900 transition-colors">
            Delete Account
          </button>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button className="px-8 py-3 bg-gray-700 border border-kairos-border text-kairos-silver-dark rounded-kairos-sm font-body font-medium hover:bg-gray-600 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSaveChanges}
            className="flex items-center gap-2 px-8 py-3 bg-kairos-gold text-kairos-card rounded-kairos-sm font-body font-medium hover:bg-yellow-500 transition-colors"
          >
            <Save className="w-5 h-5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
