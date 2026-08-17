"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Mail,
  Phone,
  Award,
  Clock,
  Shield,
  Bell,
  Settings,
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { ROLE_LABELS } from "@/lib/company-ops/types";
import type { UserRole } from "@/lib/company-ops/types";

type PackageDraft = { name: string; price: number; description: string };

export default function CoachProfilePage() {
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

  // ── Edit state ────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [capacity, setCapacity] = useState<number>(25);
  const [acceptingClients, setAcceptingClients] = useState<boolean>(true);
  const [specialties, setSpecialties] = useState<string>("");
  const [packages, setPackages] = useState<PackageDraft[]>([]);

  // Mutations
  const updateProfileMutation = trpc.coach.schedule.updateProfile.useMutation({
    onSuccess: () => {
      utils.coach.schedule.getProfile.invalidate();
      setEditing(false);
    },
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

  const startEditing = () => {
    setCapacity(profile?.capacity ?? 25);
    setAcceptingClients(profile?.acceptingClients ?? true);
    setSpecialties((profile?.specialties ?? []).join(", "));
    setPackages((profile?.packages ?? []).map((p) => ({ ...p })));
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    updateProfileMutation.reset();
  };

  const handleSave = () => {
    updateProfileMutation.mutate({
      capacity,
      acceptingClients,
      specialties: specialties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      packages: packages
        .filter((p) => p.name.trim())
        .map((p) => ({
          name: p.name.trim(),
          price: Number.isFinite(p.price) ? p.price : 0,
          description: p.description.trim(),
        })),
    });
  };

  const addPackage = () => setPackages((prev) => [...prev, { name: "", price: 0, description: "" }]);
  const removePackage = (idx: number) => setPackages((prev) => prev.filter((_, i) => i !== idx));
  const updatePackage = (idx: number, patch: Partial<PackageDraft>) =>
    setPackages((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

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

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const avatarUrl = user.avatarUrl ?? null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile Header */}
      <div className="kairos-card">
        <div className="flex items-center gap-6 mb-6">
          <div className="w-24 h-24 rounded-kairos-sm overflow-hidden bg-gradient-to-br from-kairos-gold/30 to-kairos-gold/10 border border-kairos-gold/20 flex items-center justify-center">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={fullName || "Profile photo"}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-3xl font-heading font-bold text-kairos-gold">
                {getInitials(fullName)}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-heading font-bold text-white mb-2">
              {fullName || "Coach"}
            </h1>
            <p className="text-kairos-silver-dark font-body text-sm">
              {user.email}
            </p>
            <p className="text-xs text-kairos-silver-dark/70 font-body mt-2">
              Your name and photo are managed in your account settings.
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
              {(editing ? acceptingClients : profile?.acceptingClients) ? "Yes" : "No"}
            </p>
            <p className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">Accepting Clients</p>
          </div>
        </div>
      </div>

      {/* Professional Information */}
      <div className="kairos-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-heading font-bold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-kairos-gold" />
            Professional Information
          </h2>
          {!editing ? (
            <button
              onClick={startEditing}
              className="kairos-btn-outline text-xs inline-flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={cancelEditing}
                disabled={updateProfileMutation.isPending}
                className="kairos-btn-outline text-xs inline-flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="kairos-btn-gold text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> {updateProfileMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>

        {updateProfileMutation.isError && (
          <p className="text-xs text-red-400 font-body mb-4">
            Could not save changes. Please try again.
          </p>
        )}

        <div className="space-y-4">
          {/* User Role (read-only — not editable from the coach portal) */}
          <div>
            <label className="kairos-label mb-2 block">Role</label>
            <p className="text-kairos-silver-dark font-body text-sm">{ROLE_LABELS[user.role as UserRole] ?? user.role}</p>
          </div>

          {/* Accepting Clients */}
          <div>
            <label className="kairos-label mb-2 block">Accepting New Clients</label>
            {editing ? (
              <button
                onClick={() => setAcceptingClients((v) => !v)}
                className={`relative w-12 h-6 rounded-full transition ${acceptingClients ? "bg-kairos-gold" : "bg-gray-600"}`}
                aria-pressed={acceptingClients}
                aria-label="Toggle accepting new clients"
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${acceptingClients ? "left-[26px]" : "left-0.5"}`} />
              </button>
            ) : (
              <p className="text-kairos-silver-dark font-body text-sm">
                {profile?.acceptingClients ? "Yes" : "No"}
              </p>
            )}
          </div>

          {/* Capacity Information */}
          <div>
            <label className="kairos-label mb-2 block">Client Capacity</label>
            {editing ? (
              <input
                type="number"
                min={1}
                max={100}
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, Math.min(100, Number(e.target.value) || 0)))}
                className="kairos-input w-32"
              />
            ) : (
              <p className="text-kairos-silver-dark font-body text-sm">
                {profile?.capacity ?? 0} maximum clients
              </p>
            )}
          </div>

          {/* Specialties */}
          <div>
            <label className="kairos-label mb-2 block">Specialties</label>
            {editing ? (
              <>
                <input
                  type="text"
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  placeholder="e.g. Longevity, HRV optimization, Metabolic health"
                  className="kairos-input w-full"
                />
                <p className="text-[11px] font-body text-kairos-silver-dark/70 mt-1">Comma-separated</p>
              </>
            ) : profile?.specialties && profile.specialties.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.specialties.map((s: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 rounded-kairos-sm text-xs font-semibold bg-kairos-gold/15 text-kairos-gold">
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-kairos-silver-dark/60 font-body text-sm">No specialties listed</p>
            )}
          </div>

          {/* Package Options */}
          <div>
            <label className="kairos-label mb-2 block">Package Options</label>
            {editing ? (
              <div className="space-y-3">
                {packages.map((pkg, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start">
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={(e) => updatePackage(idx, { name: e.target.value })}
                      placeholder="Package name"
                      className="kairos-input flex-1 min-w-0"
                    />
                    <input
                      type="number"
                      min={0}
                      value={pkg.price}
                      onChange={(e) => updatePackage(idx, { price: Number(e.target.value) || 0 })}
                      placeholder="Price/mo"
                      className="kairos-input w-28"
                    />
                    <input
                      type="text"
                      value={pkg.description}
                      onChange={(e) => updatePackage(idx, { description: e.target.value })}
                      placeholder="Description"
                      className="kairos-input flex-1 min-w-0"
                    />
                    <button
                      onClick={() => removePackage(idx)}
                      className="kairos-btn-outline text-xs p-2"
                      aria-label="Remove package"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addPackage}
                  className="kairos-btn-outline text-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Package
                </button>
              </div>
            ) : profile?.packages && profile.packages.length > 0 ? (
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
              <p className="text-kairos-silver-dark font-body text-sm">
                {(editing ? capacity : profile.capacity)} clients
              </p>
            </div>
          )}

          {revenue && (
            <>
              <div>
                <label className="kairos-label mb-2 block flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Monthly Revenue
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
