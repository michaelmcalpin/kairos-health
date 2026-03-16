"use client";

import { useState } from "react";
import {
  TestTube2,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertTriangle,
  Calendar,
  FileText,
} from "lucide-react";
import { getClientLabs, filterLabMarkers } from "@/lib/client-ops/engine";
import { LAB_CATEGORIES } from "@/lib/client-ops/types";

const CLIENT_ID = "demo-client";

export default function LabsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const { orders, stats: statusCounts } = getClientLabs(CLIENT_ID);
  const filteredMarkers = filterLabMarkers(CLIENT_ID, activeCategory);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "optimal":
        return "bg-green-900/20 text-green-400 border-green-700/50";
      case "normal":
        return "bg-blue-900/20 text-blue-400 border-blue-700/50";
      case "borderline":
        return "bg-yellow-900/20 text-yellow-400 border-yellow-700/50";
      case "out-of-range":
        return "bg-red-900/20 text-red-400 border-red-700/50";
      default:
        return "bg-kairos-card border-kairos-border text-kairos-silver-dark";
    }
  };

  const getStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4" />;
      case "down":
        return <TrendingDown className="w-4 h-4" />;
      case "flat":
        return <Minus className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getOrderStatusColor = (status: string): string => {
    switch (status) {
      case "results-ready":
        return "bg-green-900/20 text-green-400 border-green-700/50";
      case "pending":
        return "bg-yellow-900/20 text-yellow-400 border-yellow-700/50";
      case "scheduled":
        return "bg-blue-900/20 text-blue-400 border-blue-700/50";
      default:
        return "bg-kairos-card border-kairos-border text-kairos-silver-dark";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">Lab Results</h1>
          <p className="text-kairos-silver-dark font-body">Track your biomarkers and health metrics over time</p>
        </div>
        <div className="flex items-center gap-2 bg-kairos-gold/20 text-kairos-gold px-4 py-2 rounded-kairos-sm">
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-heading font-semibold">Next Draw: April 1, 2026</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="kairos-card p-6 rounded-kairos-sm">
          <p className="text-kairos-silver-dark text-sm font-body mb-2">Total Markers</p>
          <p className="text-2xl font-bold text-white font-heading">{statusCounts.total}</p>
          <p className="text-xs text-kairos-silver-dark mt-2">Tracked</p>
        </div>
        <div className="kairos-card p-6 rounded-kairos-sm">
          <p className="text-kairos-silver-dark text-sm font-body mb-2">In Range</p>
          <p className="text-2xl font-bold text-green-400 font-heading">{statusCounts.inRange}</p>
          <p className="text-xs text-kairos-silver-dark mt-2">{Math.round((statusCounts.inRange / statusCounts.total) * 100)}%</p>
        </div>
        <div className="kairos-card p-6 rounded-kairos-sm">
          <p className="text-kairos-silver-dark text-sm font-body mb-2">Out of Range</p>
          <p className="text-2xl font-bold text-red-400 font-heading">{statusCounts.outOfRange}</p>
          <p className="text-xs text-kairos-silver-dark mt-2">Needs attention</p>
        </div>
        <div className="kairos-card p-6 rounded-kairos-sm">
          <p className="text-kairos-silver-dark text-sm font-body mb-2">Improved</p>
          <p className="text-2xl font-bold text-blue-400 font-heading">{statusCounts.improved}</p>
          <p className="text-xs text-kairos-silver-dark mt-2">Since last draw</p>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {LAB_CATEGORIES.map((category) => (
          <button key={category.id} onClick={() => setActiveCategory(category.id)}
            className={`px-4 py-2 rounded-kairos-sm font-body text-sm font-medium transition-all ${activeCategory === category.id ? "kairos-btn-gold text-black" : "kairos-btn-outline text-kairos-silver-dark hover:text-white"}`}>
            {category.label}
          </button>
        ))}
      </div>

      {/* Lab Markers */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <TestTube2 className="w-5 h-5 text-kairos-gold" />
          <h2 className="font-heading font-bold text-xl text-white">
            {activeCategory === "all" ? "All Biomarkers" : LAB_CATEGORIES.find((c) => c.id === activeCategory)?.label} Markers
          </h2>
          <span className="text-kairos-silver-dark text-sm">({filteredMarkers.length})</span>
        </div>

        <div className="grid gap-3">
          {filteredMarkers.map((marker) => (
            <div key={marker.id} className="kairos-card p-5 rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/30 transition-all">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div>
                  <h3 className="font-heading font-bold text-white mb-1">{marker.name}</h3>
                  <p className="text-xs text-kairos-silver-dark">Ref: {marker.referenceRange}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{marker.currentValue}</span>
                    <span className="text-sm text-kairos-silver-dark">{marker.unit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-body ${getStatusColor(marker.status)}`}>
                      {marker.status === "optimal" && <CheckCircle className="w-3 h-3" />}
                      {marker.status === "out-of-range" && <AlertTriangle className="w-3 h-3" />}
                      {getStatusLabel(marker.status)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-body bg-slate-900/50 text-kairos-silver-dark">
                      {getTrendIcon(marker.trend)}
                      <span>
                        {marker.previousValue}
                        {marker.trend === "up" && " ↗"}
                        {marker.trend === "down" && " ↘"}
                        {marker.trend === "flat" && " →"}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-kairos-gold font-body mb-1">Optimal: {marker.optimalRange}</p>
                  <p className="text-xs text-kairos-silver-dark">Drawn: {new Date(marker.lastDrawDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Lab Orders */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-kairos-gold" />
          <h2 className="font-heading font-bold text-xl text-white">Recent Lab Orders</h2>
        </div>
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="kairos-card p-5 rounded-kairos-sm border border-kairos-border">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div>
                  <p className="text-sm font-body text-kairos-silver-dark">Order Date</p>
                  <p className="font-heading font-bold text-white">{new Date(order.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-body text-kairos-silver-dark">Lab Name</p>
                  <p className="font-heading font-bold text-white">{order.labName}</p>
                </div>
                <div>
                  <p className="text-sm font-body text-kairos-silver-dark">Panel Type</p>
                  <p className="font-heading font-bold text-white">{order.panelType}</p>
                </div>
                <div className="md:text-right">
                  <span className={`inline-flex items-center px-3 py-1 rounded-kairos-sm text-xs font-body font-medium border ${getOrderStatusColor(order.status)}`}>
                    {order.status === "results-ready" && <CheckCircle className="w-3 h-3 mr-1" />}
                    {order.status === "pending" && <Minus className="w-3 h-3 mr-1" />}
                    {order.status === "scheduled" && <Calendar className="w-3 h-3 mr-1" />}
                    {order.status === "results-ready" && "Results Ready"}
                    {order.status === "pending" && "Pending"}
                    {order.status === "scheduled" && "Scheduled"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
