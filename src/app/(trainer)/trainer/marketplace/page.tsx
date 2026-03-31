"use client";

import { useState } from "react";
import { ToggleLeft, TrendingUp, ShoppingCart, Package, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";

const TYPE_LABELS: Record<string, string> = {
  protocol: "Protocol",
  program: "Program",
  supplement_stack: "Supplement Stack",
  assessment: "Assessment",
};

export default function Page() {
  const { data: items = [], isLoading } = trpc.coach.marketplace.list.useQuery({});
  const { data: stats } = trpc.coach.marketplace.getStats.useQuery();

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-1">
            Marketplace
          </h1>
          <p className="font-body text-kairos-silver-dark">
            Browse and manage protocols, programs, and supplement stacks
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:bg-kairos-card-hover transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide mb-2">
                Available Products
              </p>
              <p className="font-heading font-bold text-2xl text-white">
                {stats?.totalProducts ?? 0}
              </p>
            </div>
            <Package className="w-5 h-5 text-kairos-gold" />
          </div>
        </div>
        <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:bg-kairos-card-hover transition-colors">
          <p className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide mb-2">
            Recommended
          </p>
          <p className="font-heading font-bold text-2xl text-kairos-gold">
            {stats?.recommendedCount ?? 0}
          </p>
        </div>
        <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:bg-kairos-card-hover transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide mb-2">
                Total Revenue
              </p>
              <p className="font-heading font-bold text-2xl text-kairos-gold">
                {formatPrice(stats?.totalRevenueCents ?? 0)}
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-kairos-gold" />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-kairos-border bg-gray-900">
                <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">Product</th>
                <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">Type</th>
                <th className="text-right font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">Price</th>
                <th className="text-right font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">Purchases</th>
                <th className="text-center font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">Rating</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <p className="text-kairos-silver-dark font-body text-sm">Loading marketplace...</p>
                  </td>
                </tr>
              ) : items.length > 0 ? items.map((item) => (
                <tr key={item.id} className="border-b border-kairos-border hover:bg-kairos-card-hover transition-colors">
                  <td className="py-4 px-6">
                    <p className="font-body text-sm text-white font-semibold">{item.title}</p>
                    {item.description && (
                      <p className="font-body text-xs text-kairos-silver-dark mt-0.5 line-clamp-1">{item.description}</p>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-body text-xs font-semibold px-3 py-1 rounded-kairos-sm bg-purple-900/30 text-purple-300">
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                  </td>
                  <td className="font-body text-sm text-kairos-gold font-semibold py-4 px-6 text-right">
                    {formatPrice(item.priceInCents)}
                  </td>
                  <td className="font-body text-sm text-white py-4 px-6 text-right">
                    {item.purchaseCount}
                  </td>
                  <td className="font-body text-sm text-kairos-gold py-4 px-6 text-center">
                    {item.rating ? `${item.rating.toFixed(1)}` : "—"}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <ShoppingCart size={32} className="text-kairos-silver-dark mx-auto mb-3" />
                    <p className="text-kairos-silver-dark font-body text-sm">No marketplace items yet.</p>
                    <p className="text-kairos-silver-dark font-body text-xs mt-1">Products, protocols, and programs will appear here once added.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
