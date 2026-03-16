'use client';

import {
  CreditCard,
  Receipt,
  Calendar,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Shield,
  FileText,
} from 'lucide-react';

export default function PaymentsPage() {

  // Mock data for current plan
  const currentPlan = {
    name: 'Tier 1 — Private',
    monthlyTotal: 686,
    nextBillingDate: '2026-04-08',
    paymentMethod: 'Visa •••• 4242',
    status: 'Active',
  };

  // Mock data for subscriptions
  const subscriptions = [
    {
      id: 1,
      name: 'Coaching Package',
      amount: 499,
      frequency: '/month',
      status: 'Active',
    },
    {
      id: 2,
      name: 'Supplement Protocol',
      amount: 187,
      frequency: '/month',
      status: 'Active',
    },
    {
      id: 3,
      name: 'Lab Panel Package',
      amount: 89,
      frequency: '/quarter',
      status: 'Active',
    },
  ];

  // Mock data for billing history
  const billingHistory = [
    {
      id: 1,
      date: '2026-03-08',
      description: 'Coaching Package + Supplement Protocol + Lab Panel',
      amount: 775,
      status: 'Paid',
      receiptUrl: '#',
    },
    {
      id: 2,
      date: '2026-02-08',
      description: 'Monthly Subscriptions',
      amount: 686,
      status: 'Paid',
      receiptUrl: '#',
    },
    {
      id: 3,
      date: '2026-01-08',
      description: 'Monthly Subscriptions',
      amount: 686,
      status: 'Paid',
      receiptUrl: '#',
    },
    {
      id: 4,
      date: '2025-12-08',
      description: 'Monthly Subscriptions + Lab Panel',
      amount: 775,
      status: 'Paid',
      receiptUrl: '#',
    },
    {
      id: 5,
      date: '2025-11-08',
      description: 'Monthly Subscriptions',
      amount: 686,
      status: 'Paid',
      receiptUrl: '#',
    },
    {
      id: 6,
      date: '2025-10-08',
      description: 'Monthly Subscriptions',
      amount: 686,
      status: 'Paid',
      receiptUrl: '#',
    },
    {
      id: 7,
      date: '2025-09-08',
      description: 'Monthly Subscriptions + Lab Panel',
      amount: 775,
      status: 'Pending',
      receiptUrl: '#',
    },
    {
      id: 8,
      date: '2025-08-08',
      description: 'Monthly Subscriptions',
      amount: 686,
      status: 'Failed',
      receiptUrl: '#',
    },
  ];

  // Mock data for upcoming charges
  const upcomingCharges = {
    estimatedTotal: 686,
    breakdown: [
      { name: 'Coaching Package', amount: 499 },
      { name: 'Supplement Protocol', amount: 187 },
    ],
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Paid') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-green-900/30 text-green-300 text-xs font-medium">
          <CheckCircle size={14} />
          Paid
        </span>
      );
    } else if (status === 'Pending') {
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
          <h1 className="text-3xl font-bold font-heading text-white mb-2">
            Billing & Payments
          </h1>
          <p className="text-kairos-silver-dark font-body">
            Manage your subscription and billing information
          </p>
        </div>
        <div className="bg-kairos-gold/20 text-kairos-gold px-4 py-2 rounded-kairos-sm">
          <span className="font-heading font-semibold text-sm">
            {currentPlan.name}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Current Plan Card */}
        <div className="lg:col-span-2">
          <div className="kairos-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="text-kairos-gold" size={24} />
              <h2 className="text-xl font-bold font-heading text-white">
                Current Plan
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-kairos-silver-dark text-sm font-body mb-2">
                  Plan Name
                </p>
                <p className="text-white font-semibold text-lg">
                  {currentPlan.name}
                </p>
              </div>
              <div>
                <p className="text-kairos-silver-dark text-sm font-body mb-2">
                  Monthly Total
                </p>
                <p className="text-kairos-gold font-bold text-lg">
                  ${currentPlan.monthlyTotal}/mo
                </p>
              </div>
              <div>
                <p className="text-kairos-silver-dark text-sm font-body mb-2">
                  Next Billing Date
                </p>
                <p className="text-white font-semibold flex items-center gap-2">
                  <Calendar size={16} className="text-kairos-gold" />
                  {new Date(currentPlan.nextBillingDate).toLocaleDateString(
                    'en-US',
                    { month: 'short', day: 'numeric', year: 'numeric' }
                  )}
                </p>
              </div>
              <div>
                <p className="text-kairos-silver-dark text-sm font-body mb-2">
                  Status
                </p>
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
              <h3 className="text-lg font-bold font-heading text-white">
                Payment Method
              </h3>
            </div>

            <div className="bg-kairos-card rounded-lg p-4 border border-kairos-border mb-4">
              <p className="text-kairos-silver-dark text-xs font-body mb-3">
                Primary Card
              </p>
              <p className="text-white font-mono font-semibold text-lg mb-3">
                {currentPlan.paymentMethod}
              </p>
              <p className="text-kairos-silver-dark text-sm font-body">
                Expires 12/27
              </p>
            </div>

            <button className="kairos-btn-outline w-full py-2 px-4 rounded-kairos-sm font-semibold text-sm">
              Update Payment Method
            </button>
          </div>
        </div>
      </div>

      {/* Active Subscriptions */}
      <div className="kairos-card p-6 mb-8">
        <h2 className="text-xl font-bold font-heading text-white mb-6">
          Active Subscriptions
        </h2>

        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between p-4 bg-kairos-card rounded-kairos-sm border border-kairos-border"
            >
              <div className="flex-1">
                <p className="text-white font-semibold mb-1">{sub.name}</p>
                <p className="text-kairos-silver-dark text-sm font-body">
                  ${sub.amount}
                  {sub.frequency}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-900/20 text-green-300 font-medium">
                  {sub.status}
                </span>
                <button className="kairos-btn-outline px-4 py-2 rounded-kairos-sm font-semibold text-sm whitespace-nowrap">
                  Manage
                </button>
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
            Estimated charge on {new Date('2026-04-08').toLocaleDateString('en-US')}
          </p>
          <p className="text-kairos-gold text-3xl font-bold font-heading">
            ${upcomingCharges.estimatedTotal.toFixed(2)}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-kairos-silver-dark text-sm font-body font-semibold mb-4">
            Breakdown:
          </p>
          {upcomingCharges.breakdown.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center p-3 bg-kairos-card rounded border border-kairos-border/50"
            >
              <span className="text-white font-body">{item.name}</span>
              <span className="text-kairos-gold font-semibold">
                ${item.amount.toFixed(2)}
              </span>
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
                <th className="text-left py-3 px-4 text-kairos-silver-dark text-sm font-semibold font-body">
                  Date
                </th>
                <th className="text-left py-3 px-4 text-kairos-silver-dark text-sm font-semibold font-body">
                  Description
                </th>
                <th className="text-right py-3 px-4 text-kairos-silver-dark text-sm font-semibold font-body">
                  Amount
                </th>
                <th className="text-center py-3 px-4 text-kairos-silver-dark text-sm font-semibold font-body">
                  Status
                </th>
                <th className="text-center py-3 px-4 text-kairos-silver-dark text-sm font-semibold font-body">
                  Receipt
                </th>
              </tr>
            </thead>
            <tbody>
              {billingHistory.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-kairos-border/50 hover:bg-kairos-card/50 transition-colors"
                >
                  <td className="py-4 px-4 text-white text-sm font-body">
                    {new Date(transaction.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-4 px-4 text-kairos-silver-dark text-sm font-body">
                    {transaction.description}
                  </td>
                  <td className="py-4 px-4 text-white text-sm font-semibold text-right">
                    ${transaction.amount.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    {getStatusBadge(transaction.status)}
                  </td>
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
    </div>
  );
}
