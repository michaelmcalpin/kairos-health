"use client";

import { useState } from "react";
import { ShoppingCart, Star, Plus } from "lucide-react";

export default function Page() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cartItems, setCartItems] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);

  const categories = ["All", "Longevity", "Sleep", "Energy", "Recovery"];

  const products = [
    {
      id: 1,
      name: "NMN 500mg",
      brand: "NAD+ Labs",
      description: "Cellular energy & longevity support",
      price: 65,
      rating: 4.8,
      category: "Longevity",
      recommended: true,
      initial: "N",
    },
    {
      id: 2,
      name: "Omega-3 Ultra",
      brand: "Pure Marine",
      description: "Premium wild-caught fish oil",
      price: 45,
      rating: 4.9,
      category: "Recovery",
      recommended: true,
      initial: "O",
    },
    {
      id: 3,
      name: "Magnesium Threonate",
      brand: "NeuroMag",
      description: "Cognitive & sleep optimization",
      price: 52,
      rating: 4.7,
      category: "Sleep",
      recommended: false,
      initial: "M",
    },
    {
      id: 4,
      name: "Vitamin D3+K2",
      brand: "Sunlight Labs",
      description: "Bone health & immune support",
      price: 38,
      rating: 4.6,
      category: "Longevity",
      recommended: true,
      initial: "V",
    },
    {
      id: 5,
      name: "CoQ10 Ubiquinol",
      brand: "Mitochondria Plus",
      description: "Heart & mitochondrial energy",
      price: 55,
      rating: 4.8,
      category: "Energy",
      recommended: false,
      initial: "C",
    },
    {
      id: 6,
      name: "Berberine HCl",
      brand: "Metabolic Health",
      description: "Metabolic & glucose support",
      price: 42,
      rating: 4.5,
      category: "Longevity",
      recommended: false,
      initial: "B",
    },
    {
      id: 7,
      name: "Ashwagandha KSM-66",
      brand: "Stress Adapt",
      description: "Stress resilience & recovery",
      price: 48,
      rating: 4.9,
      category: "Recovery",
      recommended: true,
      initial: "A",
    },
    {
      id: 8,
      name: "Resveratrol",
      brand: "Anti-Age Labs",
      description: "Antioxidant & longevity boost",
      price: 58,
      rating: 4.7,
      category: "Longevity",
      recommended: false,
      initial: "R",
    },
  ];

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const handleAddToProtocol = (product: (typeof products)[0]) => {
    setCartItems(cartItems + 1);
    setCartTotal(cartTotal + product.price);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Page Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl text-white mb-1">
          Supplement Marketplace
        </h1>
        <p className="font-body text-kairos-silver-dark">Curated by your coach</p>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`font-body text-sm px-4 py-2 rounded-kairos-sm whitespace-nowrap transition-colors ${
              selectedCategory === category
                ? "bg-kairos-gold text-gray-900 font-semibold"
                : "bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:bg-kairos-card-hover"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-5 hover:bg-kairos-card-hover transition-colors flex flex-col"
          >
            {/* Product Avatar & Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-12 h-12 rounded-kairos-sm bg-gradient-to-br from-kairos-gold to-blue-400 flex items-center justify-center">
                  <span className="font-heading font-bold text-gray-900 text-lg">
                    {product.initial}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-white truncate">
                    {product.name}
                  </h3>
                  <p className="font-body text-xs text-kairos-silver-dark truncate">
                    {product.brand}
                  </p>
                </div>
              </div>
              {product.recommended && (
                <div className="flex-shrink-0">
                  <span className="font-body text-xs font-semibold text-gray-900 bg-kairos-gold px-2 py-1 rounded-kairos-sm whitespace-nowrap ml-2">
                    Coach Recommended
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <p className="font-body text-sm text-kairos-silver-dark mb-4 flex-grow">
              {product.description}
            </p>

            {/* Price & Rating */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-kairos-border">
              <span className="font-heading font-bold text-lg text-kairos-gold">
                ${product.price}
              </span>
              <div className="flex items-center gap-1">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < Math.floor(product.rating)
                          ? "fill-kairos-gold text-kairos-gold"
                          : "text-gray-600"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-body text-xs text-kairos-silver-dark ml-1">
                  {product.rating}
                </span>
              </div>
            </div>

            {/* Add to Protocol Button */}
            <button
              onClick={() => handleAddToProtocol(product)}
              className="w-full bg-kairos-gold hover:opacity-90 text-gray-900 font-heading font-semibold py-2 rounded-kairos-sm flex items-center justify-center gap-2 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add to Protocol
            </button>
          </div>
        ))}
      </div>

      {/* Shopping Cart Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-kairos-card border-t border-kairos-border px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-kairos-gold" />
            <div>
              <p className="font-body text-sm text-kairos-silver-dark">
                {cartItems} {cartItems === 1 ? "item" : "items"} in protocol
              </p>
              <p className="font-heading font-bold text-lg text-kairos-gold">
                ${cartTotal.toFixed(2)}
              </p>
            </div>
          </div>
          <button className="bg-kairos-gold hover:opacity-90 text-gray-900 font-heading font-semibold px-6 py-2 rounded-kairos-sm transition-opacity">
            Review Protocol
          </button>
        </div>
      </div>
    </div>
  );
}
