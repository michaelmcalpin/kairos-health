"use client";

import { useState } from "react";
import {
  CreditCard,
  Receipt,
  Calendar,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Shield,
  FileText,
  X,
} from "lucide-react";
import { getClientPayments } from "@/lib/client-ops/engine";

const CLIENT_ID = "demo-client";

export default function PaymentsPage() {
  const data = getClientPayments(CLIENT_ID);
  const { currentPlan, subscriptions, billingHistory, upcomingCharges } = data;
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    if (status === "Paid") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-green-900/30 text-green-300 text-xs font-medium">
          <CheckCircle size={14} />
          Paid
        </span>
      );
    } else if (status === "Pending") {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-yellow-900/30 text-yellow-300 text-xs font-medium">
          <AlertTriangle size={14} />
          Pending
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-red-900/30 text-red-300 text-xs font-medium">
          <AlertTriangle size={14} />
          Failed
        </span>
      );
    }
  };

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading text-white mb-2">Billing & Payments</h1>
          <p className="text-kairos-silver-dark font-body">Manage your subscription and billing information</p>
        </div>
        <div className="bg-kairos-gold/20 text-kairos-gold px-4 py-2 rounded-kairos-sm">
          <span className="font-heading font-semibold text-sm">{currentPlan.name}</span>
        </div>
      </div>

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
                <p className="text-white font-semibold text-lg">{currentPlan.name}</p>
              </div>
              <div>
                <p className="text-kairos-silver-dark text-sm font-body mb-2">Monthly Total</p>
                <p className="text-kairos-gold font-bold text-lg">${currentPlan.monthlyTotal}/mo</p>
              </div>
              <div>
                <p className="text-kairos-silver-dark text-sm font-body mb-2">Next Billing Date</p>
                <p className="text-white font-semibold flex items-center gap-2">
                  <Calendar size={16} className="text-kairos-gold" />
                  {new Date(currentPlan.nextBillingDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div>
                <p className="text-kairos-silver-dark text-sm font-body mb-2">Status</p>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-green-900/30 text-green-300 text-sm font-medium">
                  <CheckCircle size={14} />
                  {currentPlan.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method Card */}
        <div>
          <div className="kairos-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <CreditCard className="text-kairos-gold" size={24} />
              <h3 className="text-lg font-bold font-heading text-white">Payment Method</h3>
            </div>
            <div className="bg-kairos-card rounded-lg p-4 border border-kairos-border mb-4">
              <p className="text-kairos-silver-dark text-xs font-body mb-3">Primary Card</p>
              <p className="text-white font-mono font-semibold text-lg mb-3">{currentPlan.paymentMethod}</p>
              <p className="text-kairos-silver-dark text-sm font-body">Expires 12/27</p>
            </div>
            <button onClick={() => setShowPaymentModal(true)} className="kairos-btn-outline w-full py-2 px-4 rounded-kairos-sm font-semibold text-sm">
              Update Payment Method
            </button>
          </div>
        </div>
      </div>

      {/* Active Subscriptions */}
      <div className="kairos-card p-6 mb-8">
        <h2 className="text-xl font-bold font-heading text-white mb-6">Active Subscriptions</h2>
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between p-4 bg-kairos-card rounded-kairos-sm border border-kairos-border">
              <div className="flex-1">
                <p className="text-white font-semibold mb-1">{sub.name}</p>
                <p className="text-kairos-silver-dark text-sm font-body">${sub.amount}{sub.frequency}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-900/20 text-green-300 font-medium">{sub.status}</span>
                <button onClick={() => setShowManageModal(sub.id)} className="kairos-btn-outline px-4 py-2 rounded-kairos-sm font-semibold text-sm whitespace-nowrap">Manage</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Charges */}
      <div className="kairos-card p-6 mb-8">
        <h2 className="text-xl font-bold font-heading text-white mb-6 flex items-center gap-3">
          <DollarSign className="text-kairos-gold" size={24} />
          Upcoming Charges
        </h2>
        <div className="bg-kairos-card rounded-lg p-6 border border-kairos-border mb-6">
          <p className="text-kairos-silver-dark text-sm font-body mb-2">
            Estimated charge on {new Date(currentPlan.nextBillingDate).toLocaleDateString("en-US")}
          </p>
          <p className="text-kairos-gold text-3xl font-bold font-heading">${upcomingCharges.estimatedTotal.toFixed(2)}</p>
        </div>
        <div className="space-y-3">
          <p className="text-kairos-silver-dark text-sm font-body font-semibold mb-4">Breakdown:</p>
          {upcomingCharges.breakdown.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 bg-kairos-card rounded border border-kairos-border/50">
              <span className="text-white font-body">{item.name}</span>
              <span className="text-kairos-gold font-semibold">${item.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Billing History */}
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
                <th className="text-right py-3 px-4 text-kairos-silver-dark text-sm font-semibold font-body">Amount</th>
                <th className="text-center py-3 px-4 text-kairos-silver-dark text-sm font-semibold font-body">Status</th>
                <th className="text-center py-3 px-4 text-kairos-silver-dark text-sm font-semibold font-body">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {billingHistory.map((transaction) => (
                <tr key={transaction.id} className="border-b border-kairos-border/50 hover:bg-kairos-card/50 transition-colors">
                  <td className="py-4 px-4 text-white text-sm font-body">
                    {new Date(transaction.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="py-4 px-4 text-kairos-silver-dark text-sm font-body">{transaction.description}</td>
                  <td className="py-4 px-4 text-white text-sm font-semibold text-right">${transaction.amount.toFixed(2)}</td>
                  <td className="py-4 px-4 text-center">{getStatusBadge(transaction.status)}</td>
                  <td className="py-4 px-4 text-center">
                    <button className="inline-flex items-center justify-center p-2 hover:bg-kairos-card rounded-lg transition-colors text-kairos-gold hover:text-kairos-gold/80">
                      <FileText size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-kairos-card border border-kairos-border rounded-kairos w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-kairos-border">
              <h2 className="font-heading font-bold text-lg text-white">Update Payment Method</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-kairos-silver-dark hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-kairos-silver-dark">For security, payment updates are handled through our secure payment portal.</p>
              <div className="kairos-card bg-blue-500/5 border-blue-500/20 p-4">
                <p className="text-sm text-blue-300">You will be redirected to Stripe&apos;s secure portal to update your card details. No card information is stored on our servers.</p>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-kairos-border">
              <button onClick={() => setShowPaymentModal(false)} className="kairos-btn-outline flex-1">Cancel</button>
              <button onClick={() => setShowPaymentModal(false)} className="kairos-btn-gold flex-1">Open Payment Portal</button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Subscription Modal */}
      {showManageModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-kairos-card border border-kairos-border rounded-kairos w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-kairos-border">
              <h2 className="font-heading font-bold text-lg text-white">Manage Subscription</h2>
              <button onClick={() => setShowManageModal(null)} className="text-kairos-silver-dark hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-kairos-silver-dark">Manage your subscription plan and billing preferences.</p>
              <div className="space-y-2">
                <button className="w-full text-left p-3 rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/30 transition-colors">
                  <p className="text-sm text-white font-medium">Change Plan</p>
                  <p className="text-xs text-kairos-silver-dark">Upgrade or downgrade your subscription tier</p>
                </button>
                <button className="w-full text-left p-3 rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/30 transition-colors">
                  <p className="text-sm text-white font-medium">Update Billing Cycle</p>
                  <p className="text-xs text-kairos-silver-dark">Switch between monthly and annual billing</p>
                </button>
                <button className="w-full text-left p-3 rounded-kairos-sm border border-red-500/20 hover:border-red-500/40 transition-colors">
                  <p className="text-sm text-red-400 font-medium">Cancel Subscription</p>
                  <p className="text-xs text-kairos-silver-dark">Your access will continue until the end of the current billing period</p>
                </button>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-kairos-border">
              <button onClick={() => setShowManageModal(null)} className="kairos-btn-outline flex-1">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
