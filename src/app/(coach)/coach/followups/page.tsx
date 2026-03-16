"use client";

import { useState } from "react";
import {
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import {
  listCoachFollowUps,
  getFollowUpStats,
  toggleFollowUpComplete,
} from "@/lib/coach-ops/engine";
import { PRIORITY_COLORS } from "@/lib/coach-ops/types";

const COACH_ID = "demo-coach";

type FilterTab = "All" | "Due Today" | "Overdue" | "Upcoming" | "Completed";

export default function Page() {
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [refreshKey, setRefreshKey] = useState(0);

  const followUps = refreshKey >= 0 ? listCoachFollowUps(COACH_ID) : [];
  const stats = refreshKey >= 0 ? getFollowUpStats(COACH_ID) : { total: 0, pending: 0, overdue: 0, dueToday: 0, completedThisWeek: 0 };

  const todayStr = new Date().toISOString().split("T")[0];

  const getFilteredFollowUps = () => {
    return followUps.filter((item) => {
      switch (activeTab) {
        case "Due Today":
          return !item.completed && item.dueDate === todayStr;
        case "Overdue":
          return !item.completed && item.dueDate < todayStr;
        case "Upcoming":
          return !item.completed && item.dueDate > todayStr;
        case "Completed":
          return item.completed;
        case "All":
        default:
          return true;
      }
    });
  };

  const handleToggle = (id: string) => {
    toggleFollowUpComplete(COACH_ID, id);
    setRefreshKey((k) => k + 1);
  };

  const isOverdue = (dueDate: string, completed: boolean) => {
    return !completed && dueDate < todayStr;
  };

  const filteredItems = getFilteredFollowUps();

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-kairos-card rounded-kairos-sm border border-kairos-border">
            <ClipboardList className="w-6 h-6 text-kairos-gold" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-3xl text-white">Follow-ups</h1>
            <p className="text-sm text-kairos-silver-dark mt-1">
              Manage client follow-ups and tasks
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="kairos-card p-4 border border-kairos-border">
            <p className="text-xs text-kairos-silver-dark font-body mb-2">Pending</p>
            <p className="font-heading font-bold text-2xl text-white">{stats.pending}</p>
          </div>
          <div className="kairos-card p-4 border border-kairos-border">
            <p className="text-xs text-kairos-silver-dark font-body mb-2">Overdue</p>
            <p className="font-heading font-bold text-2xl text-red-400">{stats.overdue}</p>
          </div>
          <div className="kairos-card p-4 border border-kairos-border">
            <p className="text-xs text-kairos-silver-dark font-body mb-2">Due Today</p>
            <p className="font-heading font-bold text-2xl text-kairos-gold">{stats.dueToday}</p>
          </div>
          <div className="kairos-card p-4 border border-kairos-border">
            <p className="text-xs text-kairos-silver-dark font-body mb-2">Completed (Week)</p>
            <p className="font-heading font-bold text-2xl text-green-400">{stats.completedThisWeek}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(["All", "Due Today", "Overdue", "Upcoming", "Completed"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-kairos-sm font-body text-sm font-semibold transition-all ${
              activeTab === tab
                ? "kairos-btn-gold text-black"
                : "kairos-btn-outline text-kairos-silver-dark hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Follow-ups List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="kairos-card p-8 text-center border border-kairos-border">
            <CheckCircle className="w-12 h-12 text-kairos-gold mx-auto mb-4 opacity-50" />
            <p className="text-kairos-silver-dark font-body">
              {activeTab === "Completed"
                ? "No completed follow-ups yet"
                : "No follow-ups in this category"}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const pColors = PRIORITY_COLORS[item.priority];
            return (
              <div
                key={item.id}
                className={`kairos-card border rounded-kairos-sm p-5 transition-all ${
                  isOverdue(item.dueDate, item.completed)
                    ? "border-red-500 border-opacity-50 bg-kairos-card-hover"
                    : "border-kairos-border"
                } ${item.completed ? "opacity-60" : ""}`}
              >
                <div className="flex gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggle(item.id)}
                    className="flex-shrink-0 mt-1"
                  >
                    <div
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                        item.completed
                          ? "bg-kairos-gold border-kairos-gold"
                          : "border-kairos-silver-dark hover:border-kairos-gold"
                      }`}
                    >
                      {item.completed && (
                        <CheckCircle className="w-4 h-4 text-black" strokeWidth={3} />
                      )}
                    </div>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      {/* Client Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-kairos-gold flex items-center justify-center flex-shrink-0">
                          <span className="text-black font-heading font-bold text-sm">
                            {item.clientInitials}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h3
                            className={`font-heading font-semibold ${
                              item.completed
                                ? "text-kairos-silver-dark line-through"
                                : "text-white"
                            }`}
                          >
                            {item.clientName}
                          </h3>
                          <p className="text-xs text-kairos-silver-dark font-body">
                            {item.category}
                          </p>
                        </div>
                      </div>

                      {/* Priority Badge */}
                      <div className={`flex-shrink-0 px-3 py-1 rounded-kairos-sm text-xs font-semibold kairos-label ${pColors.bg} ${pColors.text}`}>
                        {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                      </div>
                    </div>

                    {/* Description */}
                    <p className={`font-body text-sm mb-3 ${item.completed ? "text-kairos-silver-dark line-through" : "text-kairos-silver-dark"}`}>
                      {item.description}
                    </p>

                    {/* Due Date Info */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-kairos-gold" />
                        <span
                          className={`text-xs font-body font-semibold ${
                            isOverdue(item.dueDate, item.completed)
                              ? "text-red-400"
                              : item.dueDate === todayStr
                                ? "text-kairos-gold"
                                : "text-kairos-silver-dark"
                          }`}
                        >
                          {item.dueDate}
                        </span>
                      </div>
                      {isOverdue(item.dueDate, item.completed) && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-xs font-semibold text-red-400 font-body">
                            Overdue
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
