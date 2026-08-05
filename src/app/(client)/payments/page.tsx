"use client";

import {
  CreditCard,
  Receipt,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Shield,
  FileText,
  Mail,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const TIER_NAMES: Record<string, string> = {
  tier1: "Private (Tier 1)",
  tier2: "Associate (Tier 2)",
  tier3: "AI-Guided (Tier 3)",
};

const TIER_PRICES: Record<string, number> = {
  tier1: 499,
  tier2: 249,
  tier3: 99,
};

const BILLING_EMAIL = "support@everist.ai";
const billingMailto = (subject: string) =>
  `mailto:${BILLING_EMAIL}?subject=${encodeURIComponent(subject)}`;

export default function PaymentsPage() {
  const { data: subData, isLoading } = trpc.clientPortal.payments.getSubscription.useQuery(undefined, { staleTime: 30_000 });
  const { data: billingData = [] } = trpc.clientPortal.payments.billingHistory.useQuery(undefined, { staleTime: 30_000 });

  const sub = subData?.subscription ?? null;
  const tier = sub?.tier ?? subData?.tier ?? null;
  const planName = tier ? (TIER_NAMES[tier] ?? "Subscription") : null;
  const monthlyTotal = tier ? TIER_PRICES[tier] ?? null : null;
  const nextBillingDate = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";
  const status = sub?.status ?? null;

  const getStatusBadge = (s: string) => {
    if (s === "active" || s === "Paid") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-green-900/30 text-green-300 text-xs font-medium">
          <CheckCircle size={14} />
          {s === "active" ? "Active" : "Paid"}
        </span>
      );
    } else if (s === "past_due" || s === "Pending") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-yellow-900/30 text-yellow-300 text-xs font-medium">
          <AlertTriangle size={14} />
          {s === "past_due" ? "Past Due" : "Pending"}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-red-900/30 text-red-300 text-xs font-medium">
        <AlertTriangle size={14} />
        {s}
      </span>
    );
  };

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading text-white mb-2">Billing & Payments</h1>
          <p className="text-kairos-silver-dark font-body">Manage your subscription and billing information</p>
        </div>
        {planName && (
          <div className="bg-kairos-gold/20 text-kairos-gold px-4 py-2 rounded-kairos-sm">
            <span className="font-heading font-semibold text-sm">{planName}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="kairos-card p-8 text-center text-kairos-silver-dark font-body">Loading billing details…</div>
      ) : !sub ? (
        /* Honest empty state — no subscription record on file */
        <div className="kairos-card p-8 mb-8 text-center">
          <div className="w-14 h-14 rounded-full bg-kairos-gold/10 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="text-kairos-gold" size={26} />
          </div>
          <h2 className="text-xl font-bold font-heading text-white mb-2">No subscription on file</h2>
          <p className="text-kairos-silver-dark font-body max-w-md mx-auto mb-6">
            We don&apos;t have an active subscription linked to your account. Billing for
            Everist.ai is handled directly by our team — reach out and we&apos;ll get you set up.
          </p>
          <a
            href={billingMailto("Everist.ai subscription enquiry")}
            className="kairos-btn-gold inline-flex items-center gap-2 px-6 py-2 rounded-kairos-sm font-semibold text-sm"
          >
            <Mail size={16} />
            Contact Billing
          </a>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Current Plan Card */}
            <div className="lg:col-span-2">
              <div className="kairos-card p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="text-kairos-gold" size={24} />
                  <h2 className="text-xl font-bold font-heading text-white">Current Plan</h2>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-kairos-silver-dark text-sm font-body mb-2">Plan Name</p>
                    <p className="text-white font-semibold text-lg">{planName ?? "Subscription"}</p>
                  </div>
                  <div>
                    <p className="text-kairos-silver-dark text-sm font-body mb-2">Plan Price</p>
                    <p className="text-kairos-gold font-bold text-lg">
                      {monthlyTotal != null ? `$${monthlyTotal}/mo` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-kairos-silver-dark text-sm font-body mb-2">Renews / Ends</p>
                    <p className="text-white font-semibold flex items-center gap-2">
                      <Calendar size={16} className="text-kairos-gold" />
                      {nextBillingDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-kairos-silver-dark text-sm font-body mb-2">Status</p>
                    {status ? getStatusBadge(status) : <span className="text-kairos-silver-dark">—</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Billing Support Card — no card data is stored on our servers */}
            <div>
              <div className="kairos-card p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="text-kairos-gold" size={24} />
                  <h3 className="text-lg font-bold font-heading text-white">Payment Method</h3>
                </div>
                <p className="text-kairos-silver-dark text-sm font-body mb-4 flex-1">
                  Payment details are handled securely by our billing team and aren&apos;t stored
                  in the portal. To update your card or change how you&apos;re billed, contact us and
                  we&apos;ll send a secure link.
                </p>
                <a
                  href={billingMailto("Update payment method")}
                  className="kairos-btn-outline w-full py-2 px-4 rounded-kairos-sm font-semibold text-sm inline-flex items-center justify-center gap-2"
                >
                  <Mail size={16} />
                  Contact Billing
                </a>
              </div>
            </div>
          </div>

          {/* Manage subscription — honest links to support, no dead buttons */}
          <div className="kairos-card p-6 mb-8">
            <h2 className="text-xl font-bold font-heading text-white mb-6">Manage Subscription</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <a
                href={billingMailto("Change plan")}
                className="text-left p-4 rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/30 transition-colors"
              >
                <p className="text-sm text-white font-medium mb-1">Change Plan</p>
                <p className="text-xs text-kairos-silver-dark">Upgrade or downgrade your subscription tier</p>
              </a>
              <a
                href={billingMailto("Update billing cycle")}
                className="text-left p-4 rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/30 transition-colors"
              >
                <p className="text-sm text-white font-medium mb-1">Update Billing</p>
                <p className="text-xs text-kairos-silver-dark">Switch between monthly and annual billing</p>
              </a>
              <a
                href={billingMailto("Cancel subscription")}
                className="text-left p-4 rounded-kairos-sm border border-red-500/20 hover:border-red-500/40 transition-colors"
              >
                <p className="text-sm text-red-400 font-medium mb-1">Cancel Subscription</p>
                <p className="text-xs text-kairos-silver-dark">Request cancellation via our billing team</p>
              </a>
            </div>
          </div>
        </>
      )}

      {/* Billing History — real subscription records */}
      <div className="kairos-card p-6">
        <h2 className="text-xl font-bold font-heading text-white mb-6 flex items-center gap-3">
          <Receipt className="text-kairos-gold" size={24} />
          Billing History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-kairos-border">
                <th className="text-left py-3 px-4 text-kairos-silver-dark text-sm font-semibold font-body">Date</th>
                <th className="text-left py-3 px-4 text-kairos-silver-dark text-sm font-semibold font-body">Description</th>
                <th className="text-center py-3 px-4 text-kairos-silver-dark text-sm font-semibold font-body">Status</th>
                <th className="text-center py-3 px-4 text-kairos-silver-dark text-sm font-semibold font-body">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {billingData.length > 0 ? billingData.map((record) => (
                <tr key={record.id} className="border-b border-kairos-border/50 hover:bg-kairos-card/50 transition-colors">
                  <td className="py-4 px-4 text-white text-sm font-body">
                    {record.createdAt ? new Date(record.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </td>
                  <td className="py-4 px-4 text-kairos-silver-dark text-sm font-body">
                    {TIER_NAMES[record.tier ?? ""] ?? "Subscription"} — {record.status}
                  </td>
                  <td className="py-4 px-4 text-center">{getStatusBadge(record.status)}</td>
                  <td className="py-4 px-4 text-center">
                    <a
                      href={billingMailto(`Receipt request — ${record.id}`)}
                      title="Request a receipt from billing"
                      className="inline-flex items-center justify-center p-2 hover:bg-kairos-card rounded-lg transition-colors text-kairos-gold hover:text-kairos-gold/80"
                    >
                      <FileText size={18} />
                    </a>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-kairos-silver-dark font-body">No billing history yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
