"use client";

import { useState } from "react";
import {
  ShieldCheck, Search, UserPlus, Trash2, X, Mail, Crown,
  UtensilsCrossed, Dumbbell, FlaskConical, Activity,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Types & constants ──────────────────────────────────────────

type AccessLevel = "none" | "read" | "write";

type CategoryKey = "dietAccess" | "exerciseAccess" | "labsAccess" | "healthDataAccess";

const CATEGORIES: { key: CategoryKey; label: string; desc: string; icon: typeof Activity }[] = [
  { key: "dietAccess", label: "Diet", desc: "Nutrition, meals, fasting", icon: UtensilsCrossed },
  { key: "exerciseAccess", label: "Exercise", desc: "Workouts, activity", icon: Dumbbell },
  { key: "labsAccess", label: "Labs", desc: "Lab results, clinical docs", icon: FlaskConical },
  { key: "healthDataAccess", label: "Health Data", desc: "Glucose, sleep, HRV, vitals", icon: Activity },
];

const LEVEL_OPTIONS: { value: AccessLevel; label: string }[] = [
  { value: "none", label: "No Access" },
  { value: "read", label: "View Only" },
  { value: "write", label: "View & Edit" },
];

type CategoryLevels = Record<CategoryKey, AccessLevel>;

const DEFAULT_SHARE_LEVELS: CategoryLevels = {
  dietAccess: "read",
  exerciseAccess: "read",
  labsAccess: "read",
  healthDataAccess: "read",
};

function coachName(c: { firstName: string | null; lastName: string | null; email: string | null }) {
  const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
  return name || c.email || "Coach";
}

function initials(c: { firstName: string | null; lastName: string | null; email: string | null }) {
  const a = c.firstName?.[0] ?? c.email?.[0] ?? "C";
  const b = c.lastName?.[0] ?? "";
  return (a + b).toUpperCase();
}

// ─── Segmented control ──────────────────────────────────────────

function AccessSegment({
  value,
  onChange,
  disabled,
}: {
  value: AccessLevel;
  onChange: (level: AccessLevel) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1 bg-gray-800/60 border border-gray-700 rounded-lg p-0.5">
      {LEVEL_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => { if (opt.value !== value) onChange(opt.value); }}
          disabled={disabled}
          className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors disabled:opacity-50 ${
            value === opt.value
              ? opt.value === "none"
                ? "bg-gray-700 text-gray-300"
                : "bg-kairos-gold/20 text-kairos-gold border border-kairos-gold/30"
              : "text-gray-500 hover:text-gray-300"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Category grid (shared by grant + edit) ─────────────────────

function CategoryGrid({
  levels,
  onChange,
  disabled,
}: {
  levels: CategoryLevels;
  onChange: (key: CategoryKey, level: AccessLevel) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        return (
          <div key={cat.key} className="flex items-center justify-between gap-3 flex-wrap py-1.5 border-b border-gray-800/50 last:border-0">
            <div className="flex items-center gap-2.5 min-w-[140px]">
              <Icon size={15} className="text-gray-500 shrink-0" />
              <div>
                <p className="text-sm text-white font-medium">{cat.label}</p>
                <p className="text-[10px] text-gray-500">{cat.desc}</p>
              </div>
            </div>
            <AccessSegment
              value={levels[cat.key]}
              onChange={(level) => onChange(cat.key, level)}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Granted coach card ─────────────────────────────────────────

type Grant = {
  grantId: string;
  coachId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  dietAccess: AccessLevel;
  exerciseAccess: AccessLevel;
  labsAccess: AccessLevel;
  healthDataAccess: AccessLevel;
  grantedAt: string | Date | null;
};

function GrantedCoachCard({ grant, onRevoke }: { grant: Grant; onRevoke: (grantId: string) => void }) {
  const utils = trpc.useUtils();
  const updateMutation = trpc.clientPortal.coachAccess.update.useMutation({
    onSuccess: () => { utils.clientPortal.coachAccess.list.invalidate(); },
  });

  const handleChange = (key: CategoryKey, level: AccessLevel) => {
    updateMutation.mutate({
      grantId: grant.grantId,
      dietAccess: grant.dietAccess,
      exerciseAccess: grant.exerciseAccess,
      labsAccess: grant.labsAccess,
      healthDataAccess: grant.healthDataAccess,
      [key]: level,
    });
  };

  return (
    <div className="kairos-card">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white overflow-hidden shrink-0">
            {grant.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={grant.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
            ) : (
              initials(grant)
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{coachName(grant)}</p>
            <p className="text-xs text-gray-500">{grant.email}</p>
            {grant.grantedAt && (
              <p className="text-[10px] text-gray-600 mt-0.5">
                Shared since {new Date(grant.grantedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => onRevoke(grant.grantId)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/5 text-red-400/80 border border-red-500/15 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 transition-colors"
        >
          <Trash2 size={12} /> Revoke Access
        </button>
      </div>

      {updateMutation.isError && (
        <p className="text-xs text-red-400 mb-2">{updateMutation.error.message}</p>
      )}

      <CategoryGrid
        levels={{
          dietAccess: grant.dietAccess,
          exerciseAccess: grant.exerciseAccess,
          labsAccess: grant.labsAccess,
          healthDataAccess: grant.healthDataAccess,
        }}
        onChange={handleChange}
        disabled={updateMutation.isPending}
      />
    </div>
  );
}

// ─── Share with a new coach ─────────────────────────────────────

function ShareWithCoachCard() {
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState<string | null>(null);
  const [levels, setLevels] = useState<CategoryLevels>(DEFAULT_SHARE_LEVELS);
  const [success, setSuccess] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const findQuery = trpc.clientPortal.coachAccess.findCoach.useQuery(
    { email: searchEmail ?? "" },
    { enabled: !!searchEmail, retry: false }
  );

  const grantMutation = trpc.clientPortal.coachAccess.grant.useMutation({
    onSuccess: () => {
      utils.clientPortal.coachAccess.list.invalidate();
      setSuccess(`Access granted to ${findQuery.data ? coachName(findQuery.data) : "coach"}.`);
      setEmail("");
      setSearchEmail(null);
      setLevels(DEFAULT_SHARE_LEVELS);
      setTimeout(() => setSuccess(null), 4000);
    },
  });

  const handleFind = () => {
    if (!isValidEmail) return;
    setSuccess(null);
    setSearchEmail(email.trim().toLowerCase());
  };

  const coach = findQuery.data;
  const allNone = CATEGORIES.every((c) => levels[c.key] === "none");

  return (
    <div className="kairos-card">
      <h2 className="text-base font-heading font-bold text-kairos-gold mb-1 flex items-center gap-2">
        <UserPlus size={16} /> Share with a new coach
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        Enter a coach&apos;s email to preview their profile and choose exactly what they can see.
      </p>

      {success && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
          {success}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="email"
            placeholder="coach@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setSearchEmail(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleFind(); }}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50"
          />
        </div>
        <button
          onClick={handleFind}
          disabled={!isValidEmail || findQuery.isFetching}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors disabled:opacity-50"
        >
          <Search size={14} /> {findQuery.isFetching ? "Searching..." : "Find"}
        </button>
      </div>

      {searchEmail && !findQuery.isFetching && !coach && (
        <div className="px-3 py-2.5 rounded-lg bg-gray-800/50 border border-gray-700 text-sm text-gray-400">
          No coach found with that email address.
        </div>
      )}

      {searchEmail && coach && (
        <div className="space-y-4">
          {/* Coach preview */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/50 border border-gray-700">
            <div className="w-11 h-11 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-white overflow-hidden shrink-0">
              {coach.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coach.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                initials(coach)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{coachName(coach)}</p>
              <p className="text-xs text-gray-500">{coach.email}</p>
              {coach.bio && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{coach.bio}</p>}
              {coach.specialties.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-1.5">
                  {coach.specialties.slice(0, 5).map((s) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/20">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Category levels */}
          <CategoryGrid
            levels={levels}
            onChange={(key, level) => setLevels((prev) => ({ ...prev, [key]: level }))}
            disabled={grantMutation.isPending}
          />

          {grantMutation.isError && (
            <p className="text-xs text-red-400">{grantMutation.error.message}</p>
          )}
          {allNone && (
            <p className="text-xs text-gray-500">Select at least one category to share.</p>
          )}

          <button
            onClick={() => grantMutation.mutate({ coachEmail: searchEmail, ...levels })}
            disabled={grantMutation.isPending || allNone}
            className="kairos-btn-gold w-full py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {grantMutation.isPending ? "Granting..." : "Grant Access"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────

export default function CareTeamPage() {
  const utils = trpc.useUtils();
  const listQuery = trpc.clientPortal.coachAccess.list.useQuery();
  const [revokeTarget, setRevokeTarget] = useState<Grant | null>(null);

  const revokeMutation = trpc.clientPortal.coachAccess.revoke.useMutation({
    onSuccess: () => {
      utils.clientPortal.coachAccess.list.invalidate();
      setRevokeTarget(null);
    },
  });

  const primary = listQuery.data?.primary;
  const granted = (listQuery.data?.granted ?? []) as Grant[];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-white">Care Team</h1>
        <p className="text-gray-400 mt-1">
          Control which coaches can see your data — and exactly what they can do with it.
        </p>
      </div>

      {listQuery.isLoading ? (
        <div className="space-y-4">
          <div className="kairos-card h-24 animate-pulse bg-gray-800/50" />
          <div className="kairos-card h-48 animate-pulse bg-gray-800/50" />
        </div>
      ) : (
        <>
          {/* Primary coach */}
          {primary && (
            <div className="kairos-card">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-kairos-gold/20 flex items-center justify-center text-kairos-gold font-heading font-bold overflow-hidden shrink-0">
                    {primary.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={primary.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      initials(primary)
                    )}
                  </div>
                  <div>
                    <p className="text-base font-heading font-semibold text-white">{coachName(primary)}</p>
                    <p className="text-xs text-gray-500">{primary.email}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-kairos-gold/15 text-kairos-gold border border-kairos-gold/30">
                  <Crown size={12} /> Primary Coach — Full Access
                </span>
              </div>
            </div>
          )}

          {/* Shared coaches */}
          <div className="space-y-3">
            <h2 className="text-sm font-heading font-bold text-gray-300 uppercase tracking-wider">
              Shared Coaches {granted.length > 0 && `(${granted.length})`}
            </h2>
            {granted.length === 0 ? (
              <div className="kairos-card p-8 text-center">
                <ShieldCheck size={32} className="mx-auto mb-3 text-gray-600" />
                <p className="text-sm text-gray-400">You haven&apos;t shared your data with any other coaches yet.</p>
                <p className="text-xs text-gray-500 mt-1">Use the form below to add a coach to your care team.</p>
              </div>
            ) : (
              granted.map((grant) => (
                <GrantedCoachCard key={grant.grantId} grant={grant} onRevoke={() => setRevokeTarget(grant)} />
              ))
            )}
          </div>

          {/* Share with a new coach */}
          <ShareWithCoachCard />

          {/* Privacy note */}
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-gray-800/40 border border-gray-800">
            <ShieldCheck size={16} className="text-kairos-gold shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400">
              Coaches you add can only see the categories you choose. You can change or revoke access at any time.
            </p>
          </div>
        </>
      )}

      {/* Revoke confirmation */}
      {revokeTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setRevokeTarget(null)}>
          <div className="kairos-card w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold text-lg text-white">Revoke Access</h2>
              <button onClick={() => setRevokeTarget(null)} className="text-gray-400 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              Are you sure you want to revoke <span className="text-white font-semibold">{coachName(revokeTarget)}</span>&apos;s access to your data?
            </p>
            <p className="text-xs text-gray-500 mb-5">
              They will immediately lose access to everything you shared. You can share with them again later.
            </p>
            {revokeMutation.isError && (
              <p className="text-xs text-red-400 mb-3">{revokeMutation.error.message}</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setRevokeTarget(null)} className="kairos-btn-outline flex-1">Cancel</button>
              <button
                onClick={() => revokeMutation.mutate({ grantId: revokeTarget.grantId })}
                disabled={revokeMutation.isPending}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                {revokeMutation.isPending ? "Revoking..." : "Revoke Access"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
