"use client";

import { useState } from "react";
import { ShoppingCart, Star, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";

// Local constants that were in client-ops/types
const PRODUCT_CATEGORIES = ["All", "Supplements", "Peptides", "Diagnostics", "Equipment", "Books"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  All: "All",
  Supplements: "Supplements",
  Peptides: "Peptides & Injectables",
  Diagnostics: "Diagnostics",
  Equipment: "Equipment",
  Books: "Books & Education",
};

export default function Page() {
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Query active protocol items from DB
  const { data: protocolData } = trpc.clientPortal.protocol.getActive.useQuery(undefined, { staleTime: 30_000 });

  // Map protocol items to product-like display
  const products = (protocolData?.items ?? []).map((item) => ({
    id: String(item.id),
    name: String(item.name ?? "Unknown"),
    brand: "KAIROS",
    description: String(item.dosage ?? item.rationale ?? "Recommended by your coach"),
    price: 0,
    rating: 4.5,
    category: String(item.category ?? "Supplements"),
    inProtocol: true,
  }));

  const filteredProducts = selectedCategory === "All"
    ? products
    : products.filter((p) => p.category === selectedCategory);

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Page Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl text-white mb-1">Supplement Marketplace</h1>
        <p className="font-body text-kairos-silver-dark">Curated by your trainer</p>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {PRODUCT_CATEGORIES.map((category) => (
          <button key={category} onClick={() => setSelectedCategory(category)}
            className={`font-body text-sm px-4 py-2 rounded-kairos-sm whitespace-nowrap transition-colors ${selectedCategory === category ? "bg-kairos-gold text-gray-900 font-semibold" : "bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:bg-kairos-card-hover"}`}>
            {CATEGORY_LABELS[category] ?? category}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-5 hover:bg-kairos-card-hover transition-colors flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-kairos-sm bg-gradient-to-br from-kairos-gold to-blue-400 flex items-center justify-center">
                  <span className="font-heading font-bold text-gray-900 text-lg">{product.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-white truncate">{product.name}</h3>
                  <p className="font-body text-xs text-kairos-silver-dark truncate">{product.brand}</p>
                </div>
              </div>
              {product.inProtocol && (
                <div className="flex-shrink-0">
                  <span className="font-body text-xs font-semibold text-gray-900 bg-kairos-gold px-2 py-1 rounded-kairos-sm whitespace-nowrap ml-2">
                    In Protocol
                  </span>
                </div>
              )}
            </div>

            <p className="font-body text-sm text-kairos-silver-dark mb-4 flex-grow">{product.description}</p>

            <div className="flex items-center justify-between mb-4 pb-4 border-b border-kairos-border">
              {product.price > 0 && <span className="font-heading font-bold text-lg text-kairos-gold">${product.price}</span>}
              <div className="flex items-center gap-1">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating) ? "fill-kairos-gold text-kairos-gold" : "text-gray-600"}`} />
                  ))}
                </div>
                <span className="font-body text-xs text-kairos-silver-dark ml-1">{product.rating}</span>
              </div>
            </div>

            <button className="w-full bg-kairos-gold hover:opacity-90 text-gray-900 font-heading font-semibold py-2 rounded-kairos-sm flex items-center justify-center gap-2 transition-opacity">
              <Plus className="w-4 h-4" />
              View Details
            </button>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="kairos-card text-center py-10">
          <ShoppingCart size={32} className="text-kairos-silver-dark mx-auto mb-3" />
          <p className="text-sm font-body text-kairos-silver-dark">No products available in this category yet.</p>
        </div>
      )}
    </div>
  );
}
