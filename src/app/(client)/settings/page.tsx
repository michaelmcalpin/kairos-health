"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  User,
  Bell,
  Smartphone,
  Shield,
  Trash2,
  Save,
  Palette,
  AlertTriangle,
  FileText,
  Heart,
  ExternalLink,
  Calendar,
  Award,
  Star,
  Mail,
} from "lucide-react";
import { useTheme, THEMES } from "@/lib/theme";
import type { ThemeId } from "@/lib/theme";
import { trpc } from "@/lib/trpc";

export default function SettingsPage() {
  // tRPC queries
  const settingsQuery = trpc.clientPortal.settings.getSettings.useQuery();
  const { data: settingsData, isLoading: isLoadingSettings } = settingsQuery;
  const meQuery = trpc.auth.me.useQuery();

  // tRPC mutations
  const updateProfileMutation = trpc.clientPortal.settings.updateProfile.useMutation();
  const updateNotificationsMutation = trpc.clientPortal.settings.updateNotificationPreferences.useMutation();

  const { theme, setTheme } = useTheme();
  const [saveMessage, setSaveMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Local form state
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
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
    profileVisibility: "Trainer Only",
  });

  // Feature toggles (persisted to DB)
  const togglesQuery = trpc.clientPortal.settings.getFeatureToggles.useQuery();
  const updateToggleMutation = trpc.clientPortal.settings.updateFeatureToggle.useMutation({
    onSuccess: () => {
      togglesQuery.refetch();
    },
  });
  const [cycleTracker, setCycleTracker] = useState(false);

  // Hydrate cycle tracker toggle from DB
  useEffect(() => {
    if (togglesQuery.data) {
      setCycleTracker(togglesQuery.data.cycleTracker ?? false);
    }
  }, [togglesQuery.data]);

  const handleCycleTrackerToggle = () => {
    const newValue = !cycleTracker;
    setCycleTracker(newValue);
    updateToggleMutation.mutate({ key: "cycleTracker", value: newValue });
  };

  const [devices, setDevices] = useState([
    { id: "oura", name: "Oura Ring", status: "connected" },
    { id: "apple", name: "Apple Watch", status: "connected" },
    { id: "dexcom", name: "Dexcom CGM", status: "not connected" },
  ]);

  // Coach assignment query
  const coachQuery = trpc.clientPortal.settings.getMyCoach.useQuery();

  // Document repository query
  const docsQuery = trpc.clientPortal.clinicalDocs.listAll.useQuery();

  // Hydrate form with user data from database on load
  useEffect(() => {
    if (settingsData?.user) {
      const user = settingsData.user;
      setFormData((prev) => ({
        ...prev,
        displayName: user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.firstName || "",
        email: user.email || "",
      }));
    }
  }, [settingsData?.user]);

  // Hydrate notifications from database on load
  useEffect(() => {
    if (settingsData?.notificationPreferences?.categories) {
      const categories = settingsData.notificationPreferences.categories;
      setNotifications({
        emailAlerts: categories.email?.email ?? true,
        pushNotifications: categories.push?.push ?? true,
        smsAlerts: categories.sms?.sms ?? false,
        weeklyDigest: categories.email?.email ?? true,
      });
    }
  }, [settingsData?.notificationPreferences]);

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

  const handleSaveChanges = async () => {
    try {
      // Parse display name into firstName and lastName
      const [firstName, ...lastNameParts] = formData.displayName.split(" ");
      const lastName = lastNameParts.join(" ");

      // Update profile
      await updateProfileMutation.mutateAsync({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      // Update notification preferences
      await updateNotificationsMutation.mutateAsync({
        categories: {
          email: {
            in_app: notifications.emailAlerts,
            email: notifications.emailAlerts,
            push: false,
            sms: false,
          },
          push: {
            in_app: notifications.pushNotifications,
            email: false,
            push: notifications.pushNotifications,
            sms: false,
          },
          sms: {
            in_app: notifications.smsAlerts,
            email: false,
            push: false,
            sms: notifications.smsAlerts,
          },
        },
      });

      setSaveMessage("Changes saved successfully");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      // Error is already shown to user via setSaveMessage
      setSaveMessage("Failed to save changes. Please try again.");
      setTimeout(() => setSaveMessage(""), 3000);
    }
  };

  // Show loading state while data is being fetched
  if (isLoadingSettings) {
    return (
      <div className="min-h-screen bg-kairos-card p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-kairos-gold"></div>
          <p className="mt-4 text-kairos-silver-dark">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (settingsQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <h3 className="font-heading font-semibold text-white">Unable to load settings</h3>
          <p className="text-sm font-body text-kairos-silver-dark">
            We couldn&apos;t fetch your settings. Please try again.
          </p>
          <button onClick={() => settingsQuery.refetch()} className="kairos-btn-gold text-sm px-6 py-2">
            Retry
          </button>
        </div>
      </div>
    );
  }

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

        {/* Your Coach Section */}
        <div className="kairos-card rounded-kairos-sm p-8 mb-6 bg-kairos-card border border-kairos-border">
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-kairos-gold" />
            <h2 className="font-heading text-2xl text-kairos-gold">Your Coach</h2>
          </div>

          {coachQuery.isLoading ? (
            <div className="text-kairos-silver-dark text-sm">Loading coach info...</div>
          ) : coachQuery.data ? (
            <div className="flex items-start gap-6">
              {/* Coach Avatar */}
              <div className="flex-shrink-0">
                {coachQuery.data.avatarUrl ? (
                  <img
                    src={coachQuery.data.avatarUrl}
                    alt={`${coachQuery.data.firstName} ${coachQuery.data.lastName}`}
                    className="w-20 h-20 rounded-full border-2 border-kairos-gold object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border-2 border-kairos-gold bg-kairos-card-hover flex items-center justify-center">
                    <User className="w-10 h-10 text-kairos-gold" />
                  </div>
                )}
              </div>

              {/* Coach Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-heading text-xl text-kairos-silver-dark">
                    {coachQuery.data.firstName} {coachQuery.data.lastName}
                  </h3>
                  {coachQuery.data.rating !== null && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-4 h-4 text-kairos-gold fill-kairos-gold" />
                      <span className="text-sm text-kairos-silver-dark">
                        {coachQuery.data.rating.toFixed(1)}
                        {coachQuery.data.reviewCount > 0 && (
                          <span className="text-kairos-silver-dark/60 ml-1">
                            ({coachQuery.data.reviewCount} reviews)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {coachQuery.data.bio && (
                  <p className="text-sm text-kairos-silver-dark/80 leading-relaxed">
                    {coachQuery.data.bio}
                  </p>
                )}

                {coachQuery.data.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {coachQuery.data.specialties.map((specialty: string) => (
                      <span
                        key={specialty}
                        className="px-3 py-1 text-xs rounded-full bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/20"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                )}

                {coachQuery.data.credentials.length > 0 && (
                  <div className="text-xs text-kairos-silver-dark/60">
                    {coachQuery.data.credentials.join(" · ")}
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2 text-sm">
                  {coachQuery.data.email && (
                    <a
                      href={`mailto:${coachQuery.data.email}`}
                      className="flex items-center gap-1.5 text-kairos-gold hover:text-kairos-gold/80 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                      Contact
                    </a>
                  )}
                  {coachQuery.data.since && (
                    <span className="text-kairos-silver-dark/50">
                      Coach since {new Date(coachQuery.data.since).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <User className="w-12 h-12 text-kairos-silver-dark/30 mx-auto mb-3" />
              <p className="text-kairos-silver-dark/60 text-sm">
                No coach assigned yet. Contact your administrator to get matched with a coach.
              </p>
            </div>
          )}
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
                Allow Everist.ai to use anonymized data for research purposes
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
                <option value="Trainer Only">Trainer Only</option>
                <option value="Team">Team</option>
                <option value="Private">Private</option>
              </select>
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="kairos-card rounded-kairos-sm p-8 mb-6 bg-kairos-card border border-kairos-border">
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-6 h-6 text-kairos-gold" />
            <h2 className="font-heading text-2xl text-kairos-gold">Appearance</h2>
          </div>

          <p className="text-sm font-body text-kairos-silver-dark mb-4">
            Choose your preferred visual theme for the Everist.ai dashboard.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(THEMES) as ThemeId[]).map((id) => {
              const t = THEMES[id];
              const isActive = theme === id;
              const swatchMap: Record<ThemeId, string[]> = {
                summit: ["#0A1628", "#4A90D9", "#C0C5CE", "#050D18"],
                "warm-slate": ["#3A3A3C", "#C9A89A", "#FAF5F0", "#8B6F65"],
                "classic-royal": ["#122055", "#D4AF37", "#E0E0E0", "#9E9E9E"],
              };
              const swatches = swatchMap[id];
              return (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`text-left p-5 rounded-kairos-sm border-2 transition-all ${
                    isActive
                      ? "border-kairos-gold bg-kairos-gold/10"
                      : "border-kairos-border hover:border-kairos-gold/40"
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

        {/* Health Tracking Options */}
        <div className="kairos-card rounded-kairos-sm p-8 mb-6 bg-kairos-card border border-kairos-border">
          <div className="flex items-center gap-3 mb-6">
            <Heart className="w-6 h-6 text-kairos-gold" />
            <h2 className="font-heading text-2xl text-kairos-gold">Health Tracking</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-kairos-card-hover rounded-kairos-sm border border-kairos-border">
              <div>
                <span className="font-body text-kairos-silver-dark font-medium">Cycle Tracker</span>
                <p className="text-xs text-gray-400 mt-1">
                  Enable menstrual cycle tracking for hormone-aware health insights
                </p>
              </div>
              <button
                onClick={handleCycleTrackerToggle}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  cycleTracker
                    ? "bg-kairos-gold"
                    : "bg-gray-600 border border-kairos-border"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-kairos-card rounded-full transition-transform ${
                    cycleTracker ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {cycleTracker && (
              <div className="ml-4 p-4 bg-kairos-card-hover/50 rounded-kairos-sm border border-kairos-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-kairos-gold" />
                  <span className="font-body text-sm text-kairos-silver-dark font-medium">Cycle Settings</span>
                </div>
                <p className="text-xs text-gray-400">
                  When enabled, your dashboard and AI analysis will factor in cycle phase for supplement timing, exercise recommendations, and metabolic insights.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Document Repository */}
        <div className="kairos-card rounded-kairos-sm p-8 mb-6 bg-kairos-card border border-kairos-border">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-6 h-6 text-kairos-gold" />
            <h2 className="font-heading text-2xl text-kairos-gold">Document Repository</h2>
          </div>

          <p className="text-sm font-body text-kairos-silver-dark mb-4">
            All uploaded clinical documents — lab reports, DEXA scans, genetics, gut biome analyses, and medical records.
          </p>

          {docsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-kairos-gold" />
            </div>
          ) : docsQuery.data && docsQuery.data.length > 0 ? (
            <div className="space-y-3">
              {docsQuery.data.map((doc: { id: string; title: string | null; docType: string; sourceFileName: string | null; reportDate: string | Date | null; createdAt: string | Date | null }) => {
                const typeLabels: Record<string, string> = {
                  dexa_scan: "DEXA Scan",
                  gut_biome: "Gut Biome",
                  medical_record: "Medical Record",
                  lab_result: "Lab Report",
                  genetics: "Genetics",
                };
                const typeColors: Record<string, string> = {
                  dexa_scan: "text-blue-400 bg-blue-400/10",
                  gut_biome: "text-green-400 bg-green-400/10",
                  medical_record: "text-purple-400 bg-purple-400/10",
                  lab_result: "text-yellow-400 bg-yellow-400/10",
                  genetics: "text-pink-400 bg-pink-400/10",
                };
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 bg-kairos-card-hover rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-kairos-gold shrink-0" />
                      <div className="min-w-0">
                        <p className="font-body text-kairos-silver-dark font-medium text-sm truncate">
                          {doc.title || doc.sourceFileName || "Untitled Document"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[doc.docType] || "text-gray-400 bg-gray-400/10"}`}>
                            {typeLabels[doc.docType] || doc.docType}
                          </span>
                          <span className="text-xs text-gray-500">
                            {doc.reportDate
                              ? new Date(doc.reportDate).toLocaleDateString()
                              : doc.createdAt
                              ? new Date(doc.createdAt).toLocaleDateString()
                              : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500 shrink-0" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No documents uploaded yet</p>
              <p className="text-xs mt-1">Upload documents from the Genetics, DEXA Scan, Gut Biome, or Medical Records sections</p>
            </div>
          )}
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
          <button onClick={() => setShowDeleteConfirm(!showDeleteConfirm)} className="px-6 py-3 bg-transparent border-2 border-red-500 text-red-400 rounded-kairos-sm font-body font-medium hover:bg-red-900 transition-colors">
            Delete Account
          </button>
          {showDeleteConfirm && (
            <div className="mt-4 p-4 rounded-kairos-sm border border-red-500/30 bg-red-950/50">
              <p className="text-sm text-red-300 mb-3">Are you sure? This will permanently delete your account and all data. This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 bg-gray-700 text-white rounded-kairos-sm text-sm font-medium hover:bg-gray-600 transition-colors">Cancel</button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-kairos-sm text-sm font-medium hover:bg-red-700 transition-colors">Confirm Delete</button>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => window.location.reload()}
            disabled={updateProfileMutation.isPending || updateNotificationsMutation.isPending}
            className="px-8 py-3 bg-gray-700 border border-kairos-border text-kairos-silver-dark rounded-kairos-sm font-body font-medium hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveChanges}
            disabled={updateProfileMutation.isPending || updateNotificationsMutation.isPending}
            className="flex items-center gap-2 px-8 py-3 bg-kairos-gold text-kairos-card rounded-kairos-sm font-body font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateProfileMutation.isPending || updateNotificationsMutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-kairos-card border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
