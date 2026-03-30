"use client";

import { useState } from "react";
import { ToggleLeft, TrendingUp, ShoppingCart } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Page() {
  // Query the coach's protocol items / recommended products from DB
  const { data: protocolData } = trpc.coach.clients.list.useQuery(undefined, { staleTime: 30_000 });

  // Since there's no dedicated marketplace table yet, show a placeholder
  // that can be connected to real product data later
  const products: { id: string; name: string; brand: string; wholesale: number; retail: number; recommended: boolean }[] = [];
  const stats = { recommendedCount: 0, avgMarkup: 0, monthlyRevenue: 0, totalProducts: 0 };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl text-white mb-1">
          Supplement Catalog
        </h1>
        <p className="font-body text-kairos-silver-dark">
          Manage your recommended products
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:bg-kairos-card-hover transition-colors">
          <p className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide mb-2">
            Products Recommended
          </p>
          <p className="font-heading font-bold text-2xl text-white">
            {stats.recommendedCount}
          </p>
        </div>
        <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:bg-kairos-card-hover transition-colors">
          <p className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide mb-2">
            Avg Markup
          </p>
          <p className="font-heading font-bold text-2xl text-kairos-gold">
            {stats.avgMarkup}%
          </p>
        </div>
        <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:bg-kairos-card-hover transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide mb-2">
                Monthly Supplement Revenue
              </p>
              <p className="font-heading font-bold text-2xl text-kairos-gold">
                ${stats.monthlyRevenue}
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
                <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">Brand</th>
                <th className="text-right font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">Wholesale</th>
                <th className="text-right font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">Retail</th>
                <th className="text-center font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">Status</th>
                <th className="text-center font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">Toggle</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? products.map((product) => (
                <tr key={product.id} className="border-b border-kairos-border hover:bg-kairos-card-hover transition-colors">
                  <td className="font-body text-sm text-white py-4 px-6 font-semibold">{product.name}</td>
                  <td className="font-body text-sm text-kairos-silver-dark py-4 px-6">{product.brand}</td>
                  <td className="font-body text-sm text-white py-4 px-6 text-right">${product.wholesale}</td>
                  <td className="font-body text-sm text-kairos-gold font-semibold py-4 px-6 text-right">${product.retail}</td>
                  <td className="py-4 px-6 text-center">
                    <span className={`font-body text-xs font-semibold px-3 py-1 rounded-kairos-sm inline-block ${product.recommended ? "bg-green-900 text-green-200" : "bg-gray-800 text-gray-300"}`}>
                      {product.recommended ? "Recommended" : "Not Recommended"}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <button
                      className={`p-2 rounded-kairos-sm transition-colors ${product.recommended ? "bg-kairos-gold text-gray-900 hover:opacity-90" : "bg-gray-800 text-kairos-silver-dark hover:bg-gray-700"}`}
                    >
                      <ToggleLeft className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <ShoppingCart size={32} className="text-kairos-silver-dark mx-auto mb-3" />
                    <p className="text-kairos-silver-dark font-body text-sm">No products in catalog yet. Product marketplace integration coming soon.</p>
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
