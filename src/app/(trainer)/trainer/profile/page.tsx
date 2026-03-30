"use client";

import { useState } from "react";
import {
  Mail,
  Phone,
  Award,
  Clock,
  Shield,
  Bell,
  Settings,
  Edit,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function CoachProfilePage() {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  // Fetch user data
  const { data: user, isLoading: userLoading } = trpc.auth.me.useQuery();

  // Fetch coach profile data
  const { data: profile, isLoading: profileLoading } = trpc.coach.schedule.getProfile.useQuery();

  // Fetch client stats
  const { data: stats, isLoading: statsLoading } = trpc.coach.clients.getStats.useQuery();

  // Fetch revenue data
  const { data: revenue, isLoading: revenueLoading } = trpc.coach.revenue.getSummary.useQuery();

  // Fetch notification preferences
  const { data: notifPrefs } = trpc.coach.schedule.getNotificationPreferences.useQuery();

  const utils = trpc.useUtils();

  // Mutations
  const updateProfileMutation = trpc.coach.schedule.updateProfile.useMutation({
    onSuccess: () => utils.coach.schedule.getProfile.invalidate(),
  });

  const updateNotifMutation = trpc.coach.schedule.updateNotificationPreferences.useMutation({
    onSuccess: () => utils.coach.schedule.getNotificationPreferences.invalidate(),
  });

  const isLoading = userLoading || profileLoading || statsLoading || revenueLoading;

  // Create initials from user name
  const getInitials = (name?: string) => {
    if (!name) return "C";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditValues({ ...editValues, [field]: value });
  };

  const saveEdit = (field: string) => {
    const value = editValues[field];
    if (value) {
      updateProfileMutation.mutate({
        [field]: isNaN(Number(value)) ? value : Number(value),
      });
      setEditingField(null);
    }
  };

  const toggleNotification = (type: "email" | "sms" | "inApp") => {
    const cats = (notifPrefs?.categories as Record<string, { in_app: boolean; email: boolean; push: boolean; sms: boolean }> | null) ?? {};
    const current = cats.general ?? { in_app: true, email: true, push: true, sms: false };
    const mapping: Record<string, keyof typeof current> = { email: "email", sms: "sms", inApp: "in_app" };
    const key = mapping[type];
    updateNotifMutation.mutate({
      categories: { ...cats, general: { ...current, [key]: !current[key] } },
    });
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="kairos-card h-48 bg-kairos-card/50 animate-pulse" />
        <div className="kairos-card h-64 bg-kairos-card/50 animate-pulse" />
        <div className="kairos-card h-48 bg-kairos-card/50 animate-pulse" />
      </div>
    );
  }

  // Show error state if critical data is missing
  if (!user) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="kairos-card border border-red-500/20 bg-red-500/5">
          <p className="text-red-400">Error loading profile. Please try refreshing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Header */}
      <div className="kairos-card">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-24 h-24 rounded-kairos-sm bg-gradient-to-br from-kairos-gold/30 to-kairos-gold/10 border border-kairos-gold/20 flex items-center justify-center">
            <span className="text-3xl font-heading font-bold text-kairos-gold">
              {getInitials(`${user.firstName || ""} ${user.lastName || ""}`.trim())}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-heading font-bold text-white mb-2">
              {`${user.firstName || ""} ${user.lastName || ""}`.trim()}
            </h1>
            <p className="text-kairos-silver-dark font-body text-sm">
              {user.email}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 pt-6 border-t border-kairos-border">
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-kairos-gold mb-1">
              {stats?.totalClients ?? 0}
            </p>
            <p className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">Total Clients</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-kairos-gold mb-1">
              {stats?.avgAdherence ? `${Math.round(stats.avgAdherence)}%` : "—"}
            </p>
            <p className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">Avg Adherence</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-kairos-gold mb-1">
              {stats?.avgHealthScore ? `${Math.round(stats.avgHealthScore * 10) / 10}` : "—"}
            </p>
            <p className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">Avg Health Score</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-heading font-bold text-kairos-gold mb-1">
              {profile?.acceptingClients ? "Yes" : "No"}
            </p>
            <p className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">Accepting Clients</p>
          </div>
        </div>
      </div>

      {/* Professional Information */}
      <div className="kairos-card">
        <h2 className="text-xl font-heading font-bold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-kairos-gold" />
          Professional Information
        </h2>

        <div className="space-y-4">
          {/* User Role */}
          <div>
            <label className="kairos-label mb-2 block">Role</label>
            <p className="text-kairos-silver-dark font-body text-sm capitalize">{user.role}</p>
          </div>

          {/* Capacity Information */}
          {profile && (
            <>
              <div>
                <label className="kairos-label mb-2 block">Client Capacity</label>
                <p className="text-kairos-silver-dark font-body text-sm">
                  {profile.capacity} maximum clients
                </p>
              </div>

              <div>
                <label className="kairos-label mb-2 block">Package Options</label>
                {profile.packages && profile.packages.length > 0 ? (
                  <ul className="space-y-2">
                    {profile.packages.map((pkg: { name: string; price: number; description: string }, idx: number) => (
                      <li key={idx} className="text-kairos-silver-dark font-body text-sm flex items-start gap-2">
                        <span className="text-kairos-gold mt-1">•</span>
                        <span>{pkg.name} — ${pkg.price}/mo{pkg.description ? ` (${pkg.description})` : ""}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-kairos-silver-dark/60 font-body text-sm">No packages configured</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Practice Settings */}
      <div className="kairos-card">
        <h2 className="text-xl font-heading font-bold text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-kairos-gold" />
          Practice Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div>
            <label className="kairos-label mb-2 block flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            <p className="text-kairos-silver-dark font-body text-sm">{user.email}</p>
          </div>

          {profile && (
            <div>
              <label className="kairos-label mb-2 block flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Max Client Capacity
              </label>
              <p className="text-kairos-silver-dark font-body text-sm">{profile.capacity} clients</p>
            </div>
          )}

          {revenue && (
            <>
              <div>
                <label className="kairos-label mb-2 block flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Total Revenue
                </label>
                <p className="text-kairos-silver-dark font-body text-sm">
                  ${revenue.totalMonthlyRevenue?.toFixed(2) ?? "0.00"}
                </p>
              </div>

              <div>
                <label className="kairos-label mb-2 block flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  This Month
                </label>
                <p className="text-kairos-silver-dark font-body text-sm">
                  ${revenue.totalMonthlyRevenue?.toFixed(2) ?? "0.00"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="kairos-card">
        <h2 className="text-xl font-heading font-bold text-white mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-kairos-gold" />
          Notification Preferences
        </h2>

        <p className="text-kairos-silver-dark font-body text-sm mb-4">
          Manage how you receive notifications about your coaching practice.
        </p>

        <div className="space-y-4">
          {(["email", "sms", "inApp"] as const).map((type) => {
            const icons = { email: Mail, sms: Phone, inApp: Bell };
            const labels = { email: "Email", sms: "SMS", inApp: "In-App" };
            const descs = { email: "Receive email notifications", sms: "Receive SMS notifications", inApp: "Receive in-app notifications" };
            const Icon = icons[type];

            const cats = (notifPrefs?.categories as Record<string, { in_app: boolean; email: boolean; push: boolean; sms: boolean }> | null) ?? {};
            const general = cats.general ?? { in_app: true, email: true, push: true, sms: false };
            const mapping: Record<string, keyof typeof general> = { email: "email", sms: "sms", inApp: "in_app" };
            const isEnabled = general[mapping[type]];

            return (
              <div key={type} className="flex items-center justify-between p-4 rounded-kairos-sm bg-kairos-card border border-kairos-border/50">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-kairos-gold" />
                  <div>
                    <p className="font-body font-semibold text-white">{labels[type]}</p>
                    <p className="text-xs text-kairos-silver-dark">{descs[type]}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleNotification(type)}
                  className={`relative w-12 h-6 rounded-full transition ${isEnabled ? "bg-kairos-gold" : "bg-gray-600"}`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${isEnabled ? "left-[26px]" : "left-0.5"}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
