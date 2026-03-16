"use client";

import { useState } from "react";
import { ToggleLeft, TrendingUp } from "lucide-react";

export default function Page() {
  const [recommendations, setRecommendations] = useState(
    Array.from({ length: 8 }, (_, i) => [1, 2, 4, 7].includes(i + 1))
  );

  const products = [
    {
      id: 1,
      name: "NMN 500mg",
      brand: "NAD+ Labs",
      wholesale: 35,
      retail: 65,
    },
    {
      id: 2,
      name: "Omega-3 Ultra",
      brand: "Pure Marine",
      wholesale: 22,
      retail: 45,
    },
    {
      id: 3,
      name: "Magnesium Threonate",
      brand: "NeuroMag",
      wholesale: 28,
      retail: 52,
    },
    {
      id: 4,
      name: "Vitamin D3+K2",
      brand: "Sunlight Labs",
      wholesale: 18,
      retail: 38,
    },
    {
      id: 5,
      name: "CoQ10 Ubiquinol",
      brand: "Mitochondria Plus",
      wholesale: 29,
      retail: 55,
    },
    {
      id: 6,
      name: "Berberine HCl",
      brand: "Metabolic Health",
      wholesale: 20,
      retail: 42,
    },
    {
      id: 7,
      name: "Ashwagandha KSM-66",
      brand: "Stress Adapt",
      wholesale: 24,
      retail: 48,
    },
    {
      id: 8,
      name: "Resveratrol",
      brand: "Anti-Age Labs",
      wholesale: 30,
      retail: 58,
    },
  ];

  const toggleRecommendation = (index: number) => {
    const newRecs = [...recommendations];
    newRecs[index] = !newRecs[index];
    setRecommendations(newRecs);
  };

  const recommendedCount = recommendations.filter(Boolean).length;
  const avgMarkup =
    Math.round(
      (products.reduce((sum, p, i) => {
        if (recommendations[i]) {
          return sum + ((p.retail - p.wholesale) / p.wholesale) * 100;
        }
        return sum;
      }, 0) /
        recommendedCount) *
        100
    ) / 100;

  const monthlyRevenue = Math.round(
    products.reduce((sum, p, i) => {
      if (recommendations[i]) {
        return sum + (p.retail - p.wholesale) * 3; // Assume 3 orders per month
      }
      return sum;
    }, 0)
  );

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
            {recommendedCount}
          </p>
        </div>
        <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:bg-kairos-card-hover transition-colors">
          <p className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide mb-2">
            Avg Markup
          </p>
          <p className="font-heading font-bold text-2xl text-kairos-gold">
            {avgMarkup}%
          </p>
        </div>
        <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:bg-kairos-card-hover transition-colors">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide mb-2">
                Monthly Supplement Revenue
              </p>
              <p className="font-heading font-bold text-2xl text-kairos-gold">
                ${monthlyRevenue}
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
                <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">
                  Product
                </th>
                <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">
                  Brand
                </th>
                <th className="text-right font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">
                  Wholesale
                </th>
                <th className="text-right font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">
                  Retail
                </th>
                <th className="text-right font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">
                  Markup %
                </th>
                <th className="text-right font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">
                  Margin
                </th>
                <th className="text-center font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">
                  Status
                </th>
                <th className="text-center font-heading font-semibold text-sm text-kairos-silver-dark py-4 px-6">
                  Toggle
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, idx) => {
                const markup =
                  Math.round(
                    ((product.retail - product.wholesale) / product.wholesale) * 100 * 100
                  ) / 100;
                const margin = product.retail - product.wholesale;
                const isRecommended = recommendations[idx];

                return (
                  <tr
                    key={product.id}
                    className="border-b border-kairos-border hover:bg-kairos-card-hover transition-colors"
                  >
                    <td className="font-body text-sm text-white py-4 px-6 font-semibold">
                      {product.name}
                    </td>
                    <td className="font-body text-sm text-kairos-silver-dark py-4 px-6">
                      {product.brand}
                    </td>
                    <td className="font-body text-sm text-white py-4 px-6 text-right">
                      ${product.wholesale}
                    </td>
                    <td className="font-body text-sm text-kairos-gold font-semibold py-4 px-6 text-right">
                      ${product.retail}
                    </td>
                    <td className="font-body text-sm text-white py-4 px-6 text-right font-semibold">
                      {markup}%
                    </td>
                    <td className="font-body text-sm text-kairos-gold py-4 px-6 text-right">
                      ${margin}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`font-body text-xs font-semibold px-3 py-1 rounded-kairos-sm inline-block ${
                          isRecommended
                            ? "bg-green-900 text-green-200"
                            : "bg-gray-800 text-gray-300"
                        }`}
                      >
                        {isRecommended ? "Recommended" : "Not Recommended"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => toggleRecommendation(idx)}
                        className={`p-2 rounded-kairos-sm transition-colors ${
                          isRecommended
                            ? "bg-kairos-gold text-gray-900 hover:opacity-90"
                            : "bg-gray-800 text-kairos-silver-dark hover:bg-gray-700"
                        }`}
                        title={
                          isRecommended
                            ? "Remove recommendation"
                            : "Recommend to clients"
                        }
                      >
                        <ToggleLeft className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
