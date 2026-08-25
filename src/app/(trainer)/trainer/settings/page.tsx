"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  User,
  Bell,
  Palette,
  Save,
  Check,
  Building2,
  Plug,
  CalendarCheck,
  CalendarDays,
  RefreshCw,
  X,
  AlertCircle,
} from "lucide-react";
import { useTheme, THEMES } from "@/lib/theme";
import type { ThemeId } from "@/lib/theme";
import { useCompanyBrand, isPlatformBrand } from "@/lib/company-ops";
import { trpc } from "@/lib/trpc";

// Calendar providers rendered in the Integrations card. The `id` matches the
// backend `provider` discriminant used by getCalendarConnection / disconnectCalendar.
const CALENDAR_PROVIDERS = [
  {
    id: "google",
    label: "Google Calendar",
    connectLabel: "Google",
    connectHref: "/api/integrations/google/connect",
    icon: CalendarCheck,
  },
  {
    id: "microsoft",
    label: "Microsoft / Outlook",
    connectLabel: "Microsoft",
    connectHref: "/api/integrations/microsoft/connect",
    icon: CalendarDays,
  },
] as const;

export default function TrainerSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { brand } = useCompanyBrand();
  const isWhiteLabel = !isPlatformBrand(brand);
  const accentColor = isWhiteLabel ? brand.brandColor : undefined;

  // Fetch user data
  const { data: authUser } = trpc.auth.me.useQuery();

  // Fetch trainer profile
  const { data: profile } = trpc.coach.schedule.getProfile.useQuery();

  // Fetch notification preferences
  const { data: notificationPrefs } = trpc.coach.schedule.getNotificationPreferences.useQuery();

  // Calendar integration (busy-time blocking + send-as-you email).
  // The backend supports multiple providers (Google, Microsoft/Outlook); the
  // UI below renders one independent row per provider from this payload.
  const { data: calendarConnData } = trpc.coach.schedule.getCalendarConnection.useQuery();

  const utils = trpc.useUtils();

  // Mutations
  const updateProfileMutation = trpc.coach.schedule.updateProfile.useMutation();
  const updateNotificationsMutation = trpc.coach.schedule.updateNotificationPreferences.useMutation();
  const sendTestSmsMutation = trpc.coach.schedule.sendTestSms.useMutation();
  const disconnectCalendar = trpc.coach.schedule.disconnectCalendar.useMutation({
    onSuccess: () => {
      void utils.coach.schedule.getCalendarConnection.invalidate();
    },
  });

  // OAuth return notice — the Google callback redirects back here with
  // ?calendar=connected|error|unconfigured. Read it client-side so we don't
  // need a Suspense boundary around useSearchParams.
  const [calendarNotice, setCalendarNotice] = useState<
    "connected" | "error" | "unconfigured" | null
  >(null);

  // "Send test text" self-test — confirms Twilio + the phone on file work.
  const [testSmsResult, setTestSmsResult] = useState("");
  const handleSendTestSms = async () => {
    setTestSmsResult("");
    try {
      const r = await sendTestSmsMutation.mutateAsync();
      const d = r.diag
        ? ` [SID ${r.diag.sidLen}/34 ${r.diag.sidStartsWithAC ? "AC✓" : "AC✗"}, token ${r.diag.tokenLen}/32, sender ${r.diag.senderPresent ? "set" : "missing"}]`
        : "";
      if (r.ok) setTestSmsResult(`✅ Sent to ${r.to} — check your phone.`);
      else if (r.reason === "no_phone") setTestSmsResult("Add a mobile number to your profile first." + d);
      else if (r.reason === "not_configured") setTestSmsResult("SMS isn't configured on the server yet." + d);
      else setTestSmsResult(`Couldn't send: ${r.reason}${d}`);
    } catch {
      setTestSmsResult("Couldn't send: try again.");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("calendar");
    if (status === "connected" || status === "error" || status === "unconfigured") {
      setCalendarNotice(status);
      // Strip the query param so a refresh doesn't re-show the notice.
      params.delete("calendar");
      const qs = params.toString();
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (qs ? `?${qs}` : ""),
      );
    }
  }, []);

  const [formData, setFormData] = useState({
    displayName: authUser?.firstName || "",
    email: authUser?.email || "",
    specialization: "",
    timezone: "America/Los_Angeles",
  });

  const [notifications, setNotifications] = useState({
    clientAlerts: notificationPrefs?.categories?.clientAlerts?.email ?? true,
    labResults: notificationPrefs?.categories?.labResults?.email ?? true,
    appointmentReminders: notificationPrefs?.categories?.appointmentReminders?.email ?? true,
    weeklyReports: notificationPrefs?.categories?.weeklyReports?.email ?? true,
  });

  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync form state when server data arrives
  useEffect(() => {
    if (authUser) {
      setFormData((prev) => ({
        ...prev,
        displayName: authUser.firstName || "",
        email: authUser.email || "",
      }));
    }
  }, [authUser]);

  // Hydrate the specialization field from the trainer profile's specialties array.
  // Stored as a string[]; shown/edited as a comma-separated list.
  useEffect(() => {
    if (profile?.specialties) {
      setFormData((prev) => ({
        ...prev,
        specialization: profile.specialties.join(", "),
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (notificationPrefs?.categories) {
      setNotifications({
        clientAlerts: notificationPrefs.categories.clientAlerts?.email ?? true,
        labResults: notificationPrefs.categories.labResults?.email ?? true,
        appointmentReminders: notificationPrefs.categories.appointmentReminders?.email ?? true,
        weeklyReports: notificationPrefs.categories.weeklyReports?.email ?? true,
      });
    }
  }, [notificationPrefs]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Update profile — save the full comma-separated list as an array
      // rather than clobbering existing specialties with a single value.
      const specialties = formData.specialization
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      await updateProfileMutation.mutateAsync({ specialties });

      // Update notifications
      await updateNotificationsMutation.mutateAsync({
        categories: {
          clientAlerts: {
            in_app: true,
            email: notifications.clientAlerts,
            push: true,
            sms: false,
          },
          labResults: {
            in_app: true,
            email: notifications.labResults,
            push: true,
            sms: false,
          },
          appointmentReminders: {
            in_app: true,
            email: notifications.appointmentReminders,
            push: true,
            sms: false,
          },
          weeklyReports: {
            in_app: false,
            email: notifications.weeklyReports,
            push: false,
            sms: false,
          },
        },
      });

      // Invalidate cached queries so UI reflects saved changes
      void utils.coach.schedule.getProfile.invalidate();
      void utils.coach.schedule.getNotificationPreferences.invalidate();
      void utils.auth.me.invalidate();

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8" style={{ color: accentColor || "rgb(var(--k-accent))" }} />
          <h1 className="font-heading text-3xl font-bold text-white">Coach Settings</h1>
        </div>
        <button
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-kairos-sm font-heading font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: accentColor || "rgb(var(--k-accent))",
            color: accentColor ? "#fff" : "rgb(var(--k-bg))",
          }}
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {saveMessage && (
        <div className={`flex items-center gap-2 p-4 rounded-kairos-sm text-sm ${saveMessage.includes("Failed") ? "bg-red-500/15 border border-red-500/30 text-red-400" : "bg-green-500/15 border border-green-500/30 text-green-400"}`}>
          <Check size={16} />
          {saveMessage}
        </div>
      )}

      {/* Calendar OAuth return notice */}
      {calendarNotice && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-kairos-sm text-sm ${
            calendarNotice === "connected"
              ? "bg-green-500/15 border border-green-500/30 text-green-400"
              : "bg-red-500/15 border border-red-500/30 text-red-400"
          }`}
        >
          <span className="flex items-center gap-2">
            {calendarNotice === "connected" ? <Check size={16} /> : <AlertCircle size={16} />}
            {calendarNotice === "connected"
              ? "Calendar account connected successfully."
              : calendarNotice === "unconfigured"
                ? "That calendar integration isn't configured on this server yet."
                : "Something went wrong connecting your calendar account. Please try again."}
          </span>
          <button
            onClick={() => setCalendarNotice(null)}
            className="hover:opacity-70 transition-opacity"
            aria-label="Dismiss notice"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Company Info (when white-labeled) */}
      {isWhiteLabel && (
        <div className="kairos-card" style={{ borderColor: accentColor + "30" }}>
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="w-5 h-5" style={{ color: accentColor }} />
            <h2 className="font-heading text-lg font-semibold text-white">Company</h2>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-kairos-sm flex items-center justify-center text-white font-heading font-bold"
              style={{ backgroundColor: accentColor }}
            >
              {brand.name.charAt(0)}
            </div>
            <div>
              <p className="font-heading font-semibold text-white">{brand.name}</p>
              <p className="text-xs font-body text-kairos-silver-dark">{brand.website || brand.id}</p>
            </div>
          </div>
        </div>
      )}

      {/* Profile */}
      <div className="kairos-card">
        <div className="flex items-center gap-3 mb-6">
          <User className="w-5 h-5" style={{ color: accentColor || "rgb(var(--k-accent))" }} />
          <h2 className="font-heading text-xl font-semibold text-white">Profile</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: "Display Name", name: "displayName", type: "text", disabled: true, hint: "Managed by your login provider." },
            { label: "Email", name: "email", type: "email", disabled: true, hint: "Contact support to update your email address." },
            { label: "Specialization", name: "specialization", type: "text", disabled: false, hint: "Separate multiple specialties with commas." },
          ].map((field) => (
            <div key={field.name}>
              <label className="block font-body text-kairos-silver-dark text-sm mb-2">{field.label}</label>
              <input
                type={field.type}
                name={field.name}
                value={formData[field.name as keyof typeof formData]}
                onChange={handleInputChange}
                disabled={field.disabled}
                className={`w-full kairos-input ${field.disabled ? "opacity-60 cursor-not-allowed" : ""}`}
              />
              {field.hint && (
                <p className="text-xs text-kairos-silver-dark mt-1">{field.hint}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className="kairos-card">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5" style={{ color: accentColor || "rgb(var(--k-accent))" }} />
          <h2 className="font-heading text-xl font-semibold text-white">Notifications</h2>
        </div>
        <div className="space-y-3">
          {([
            { key: "clientAlerts" as const, label: "Client Health Alerts" },
            { key: "labResults" as const, label: "New Lab Results" },
            { key: "appointmentReminders" as const, label: "Appointment Reminders" },
            { key: "weeklyReports" as const, label: "Weekly Client Reports" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleNotificationChange(key)}
              className="w-full flex items-center justify-between p-4 bg-kairos-card-hover rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/30 transition-colors"
            >
              <span className="font-body text-kairos-silver-dark">{label}</span>
              <div className={`relative w-12 h-6 rounded-full transition-colors ${
                notifications[key] ? "" : "bg-gray-600 border border-kairos-border"
              }`} style={notifications[key] ? { backgroundColor: (accentColor || "rgb(var(--k-accent))") } : undefined}>
                <div className={`absolute top-1 w-4 h-4 bg-kairos-card rounded-full transition-transform ${
                  notifications[key] ? "translate-x-6" : "translate-x-1"
                }`} />
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSendTestSms}
            disabled={sendTestSmsMutation.isPending}
            className="px-3 py-1.5 text-xs font-body bg-kairos-card-hover border border-kairos-border rounded-kairos-sm text-kairos-silver-dark hover:border-kairos-gold/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendTestSmsMutation.isPending ? "Sending…" : "Send test text"}
          </button>
          {testSmsResult ? <span className="text-xs text-kairos-silver-dark">{testSmsResult}</span> : null}
        </div>
      </div>

      {/* Integrations */}
      <div className="kairos-card">
        <div className="flex items-center gap-3 mb-2">
          <Plug className="w-5 h-5" style={{ color: accentColor || "rgb(var(--k-accent))" }} />
          <h2 className="font-heading text-xl font-semibold text-white">Integrations</h2>
        </div>
        <p className="text-sm font-body text-kairos-silver-dark mb-6">
          Connect your calendar so its busy times automatically block booking
          conflicts and new bookings are added to your calendar. You can connect
          Google, Microsoft/Outlook, or both.
        </p>

        <div className="space-y-3">
          {CALENDAR_PROVIDERS.map((p) => {
            const conn = calendarConnData?.connections.find(
              (c) => c.provider === p.id,
            );
            const connected = conn?.status === "connected";
            const email = conn?.email ?? undefined;
            // `configured` may be undefined while loading — only treat an explicit
            // `false` as "not configured on this server".
            const configured = calendarConnData?.configured[p.id];
            const notConfigured = configured === false;
            const Icon = p.icon;

            return (
              <div
                key={p.id}
                className="p-4 bg-kairos-card-hover rounded-kairos-sm border border-kairos-border"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Status + capabilities */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-kairos-sm flex items-center justify-center flex-shrink-0 ${
                        connected ? "bg-kairos-gold/15" : "bg-gray-600/20"
                      }`}
                    >
                      <Icon
                        size={18}
                        className={connected ? "text-kairos-gold" : "text-kairos-silver-dark"}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-semibold text-white">
                          {p.label}
                        </span>
                        {connected ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400">
                            <Check size={13} /> Connected
                          </span>
                        ) : (
                          <span className="text-xs text-kairos-silver-dark">Not connected</span>
                        )}
                      </div>

                      {connected && email && (
                        <p className="text-xs text-kairos-silver-dark mt-0.5 truncate">
                          {email}
                        </p>
                      )}

                      {/* Capability chip (only meaningful when connected) */}
                      {connected && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30">
                            <CalendarCheck size={12} /> Calendar sync
                          </span>
                        </div>
                      )}

                      {notConfigured && (
                        <p className="text-xs text-kairos-silver-dark italic mt-2">
                          {p.label} integration isn&apos;t configured on this server yet.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {connected ? (
                      <>
                        <a
                          href={p.connectHref}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-kairos-sm text-sm font-heading font-semibold text-kairos-silver border border-kairos-border hover:border-kairos-gold/40 transition-colors"
                        >
                          <RefreshCw size={14} /> Reconnect
                        </a>
                        <button
                          onClick={() => disconnectCalendar.mutate({ provider: p.id })}
                          disabled={disconnectCalendar.isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-kairos-sm text-sm font-heading font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        >
                          <X size={14} />
                          {disconnectCalendar.isPending ? "Disconnecting..." : "Disconnect"}
                        </button>
                      </>
                    ) : notConfigured ? (
                      <button
                        disabled
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-kairos-sm text-sm font-heading font-semibold opacity-50 cursor-not-allowed"
                        style={{
                          backgroundColor: accentColor || "rgb(var(--k-accent))",
                          color: accentColor ? "#fff" : "rgb(var(--k-bg))",
                        }}
                      >
                        <Icon size={14} /> Connect {p.connectLabel}
                      </button>
                    ) : (
                      <a
                        href={p.connectHref}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-kairos-sm text-sm font-heading font-semibold transition-colors"
                        style={{
                          backgroundColor: accentColor || "rgb(var(--k-accent))",
                          color: accentColor ? "#fff" : "rgb(var(--k-bg))",
                        }}
                      >
                        <Icon size={14} /> Connect {p.connectLabel}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Appearance */}
      <div className="kairos-card">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5" style={{ color: accentColor || "rgb(var(--k-accent))" }} />
          <h2 className="font-heading text-xl font-semibold text-white">Appearance</h2>
        </div>
        <p className="text-sm font-body text-kairos-silver-dark mb-4">
          Choose your preferred visual theme for the {isWhiteLabel ? brand.name : "Everist.ai"} dashboard.
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
    </div>
  );
}
