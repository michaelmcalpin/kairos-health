"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  Lightbulb,
  TrendingUp,
  Zap,
  Moon,
  Flame,
  Pill,
  Activity,
  Heart,
  Target,
  Download,
} from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import {
  generateClientInsights,
  getInsightSummary,
} from "@/lib/client-ops/engine";
import { INSIGHT_CATEGORIES } from "@/lib/client-ops/types";
import type { InsightCategory } from "@/lib/client-ops/types";

const categoryIcons: Record<InsightCategory, React.ReactNode> = {
  Metabolic: <Zap className="w-5 h-5" />,
  Sleep: <Moon className="w-5 h-5" />,
  Recovery: <Heart className="w-5 h-5" />,
  Nutrition: <Flame className="w-5 h-5" />,
  Supplementation: <Pill className="w-5 h-5" />,
  Exercise: <Activity className="w-5 h-5" />,
  Stress: <Brain className="w-5 h-5" />,
};

const categoryGradients: Record<InsightCategory, string> = {
  Metabolic: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30",
  Sleep: "from-indigo-500/20 to-purple-500/20 border-indigo-500/30",
  Recovery: "from-pink-500/20 to-rose-500/20 border-pink-500/30",
  Nutrition: "from-green-500/20 to-emerald-500/20 border-green-500/30",
  Supplementation: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
  Exercise: "from-red-500/20 to-orange-500/20 border-red-500/30",
  Stress: "from-purple-500/20 to-violet-500/20 border-purple-500/30",
};

export default function InsightsPage() {
  const router = useRouter();
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  const [selectedCategory, setSelectedCategory] = useState<InsightCategory | null>(null);
  const [exporting, setExporting] = useState(false);

  const insights = useMemo(
    () => generateClientInsights(dateRange.startDate, dateRange.endDate),
    [dateRange]
  );

  const filteredInsights = selectedCategory
    ? insights.filter((insight) => insight.category === selectedCategory)
    : insights;

  const summary = useMemo(
    () => getInsightSummary(dateRange.startDate),
    [dateRange]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-1">AI Health Insights</h1>
          <p className="text-kairos-silver-dark font-body text-sm">
            Personalized intelligence from your biometric data
          </p>
        </div>
        <div className="text-xs font-heading font-semibold px-3 py-1 rounded-full bg-kairos-gold/20 text-kairos-gold flex items-center gap-1">
          <Brain className="w-4 h-4" />
          Powered by KAIROS AI
        </div>
      </div>

      <DateRangeNavigator
        availablePeriods={["week", "month"]}
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        formattedRange={formattedRange}
        isCurrent={isCurrent}
        canForward={canForward}
        onBack={goBack}
        onForward={goForward}
        onToday={goToToday}
      />

      {/* Weekly/Monthly Summary Card */}
      <div className="kairos-card bg-gradient-to-br from-kairos-royal-surface to-kairos-card border-l-4 border-kairos-gold">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-heading font-bold text-white mb-2">
              {period === "week" ? "Weekly" : "Monthly"} Health Summary
            </h2>
            <p className="text-kairos-silver-dark text-sm">{formattedRange}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-heading font-bold text-kairos-gold">{summary.score}/10</div>
            <p className="text-xs text-kairos-silver-dark">Overall Score</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-kairos-card/50 rounded-kairos-sm p-4 border border-kairos-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-kairos-gold" />
              <span className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Score Trend</span>
            </div>
            <p className="text-lg font-bold text-kairos-gold">{Number(summary.trend) >= 0 ? "+" : ""}{summary.trend}</p>
            <p className="text-xs text-kairos-silver-dark">vs previous {period}</p>
          </div>

          <div className="bg-kairos-card/50 rounded-kairos-sm p-4 border border-kairos-border">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Sleep Avg</span>
            </div>
            <p className="text-lg font-bold text-indigo-400">7.3 hrs</p>
            <p className="text-xs text-kairos-silver-dark">Good consistency</p>
          </div>

          <div className="bg-kairos-card/50 rounded-kairos-sm p-4 border border-kairos-border">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-pink-400" />
              <span className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Recovery</span>
            </div>
            <p className="text-lg font-bold text-pink-400">87%</p>
            <p className="text-xs text-kairos-silver-dark">HRV improving</p>
          </div>

          <div className="bg-kairos-card/50 rounded-kairos-sm p-4 border border-kairos-border">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Glucose Control</span>
            </div>
            <p className="text-lg font-bold text-yellow-400">-18%</p>
            <p className="text-xs text-kairos-silver-dark">Spike reduction</p>
          </div>
        </div>

        <div className="border-t border-kairos-border pt-6">
          <h3 className="text-sm font-heading font-semibold text-white mb-3">Key Highlights</h3>
          <div className="space-y-2">
            {insights.slice(0, 4).map((insight, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-kairos-gold mt-2" />
                <span className="text-sm text-kairos-silver-dark">{insight.description}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <h3 className="text-sm font-heading font-semibold text-white mb-4 uppercase tracking-wide">
          Filter by Category
        </h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-kairos-sm text-sm font-heading font-semibold transition-all ${
              selectedCategory === null
                ? "bg-kairos-gold text-kairos-royal-dark"
                : "border border-kairos-gold text-kairos-gold hover:bg-kairos-gold/10"
            }`}
          >
            All Insights
          </button>
          {INSIGHT_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-kairos-sm text-sm font-heading font-semibold transition-all ${
                selectedCategory === category
                  ? "bg-kairos-gold text-kairos-royal-dark"
                  : "border border-kairos-gold text-kairos-gold hover:bg-kairos-gold/10"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredInsights.map((insight) => (
          <div
            key={insight.id}
            className={`kairos-card bg-gradient-to-br ${categoryGradients[insight.category]} animate-fade-in border-2 hover:border-kairos-gold/50 transition-all hover:shadow-lg hover:shadow-kairos-gold/10`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="mt-1 text-kairos-gold">{categoryIcons[insight.category]}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-heading font-bold text-white mb-1">{insight.title}</h3>
                  <p className="text-xs text-kairos-silver-dark uppercase tracking-wide">{insight.category}</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-kairos-sm text-xs font-semibold uppercase tracking-wide ${
                insight.confidence === "high"
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
              }`}>
                {insight.confidence} Confidence
              </div>
            </div>

            <p className="text-kairos-silver-dark text-sm mb-4 leading-relaxed">{insight.description}</p>

            <div className="bg-kairos-card/50 rounded-kairos-sm p-4 mb-4 border border-kairos-border/50">
              <div className="flex items-start gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-kairos-gold flex-shrink-0 mt-0.5" />
                <h4 className="text-xs font-semibold text-kairos-gold uppercase tracking-wide">Recommendation</h4>
              </div>
              <p className="text-sm text-kairos-silver-dark leading-relaxed">{insight.recommendation}</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-kairos-border/30">
              <p className="text-xs text-kairos-silver-dark">{insight.dataSource}</p>
              <p className="text-xs text-kairos-silver-dark">{insight.timestamp}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Personalized Recommendations Section */}
      <div className="kairos-card bg-gradient-to-br from-kairos-royal-surface to-kairos-card border-l-4 border-kairos-gold">
        <div className="flex items-center gap-3 mb-6">
          <Target className="w-6 h-6 text-kairos-gold" />
          <h2 className="text-2xl font-heading font-bold text-white">Personalized Recommendations</h2>
        </div>

        <div className="space-y-4">
          <div className="bg-kairos-card/50 rounded-kairos-sm p-4 border border-red-500/30">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white mb-1">Priority: High - Optimize Post-Dinner Routine</h4>
                <p className="text-sm text-kairos-silver-dark mb-2">
                  Your data shows post-dinner walks reduce glucose spikes significantly. This is your highest-impact intervention for metabolic health.
                </p>
                <div className="flex gap-2">
                  <span className="inline-block px-2 py-1 rounded text-xs bg-red-500/20 text-red-300 border border-red-500/30">Metabolic</span>
                  <span className="inline-block px-2 py-1 rounded text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30">Exercise</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-kairos-card/50 rounded-kairos-sm p-4 border border-yellow-500/30">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white mb-1">Priority: Medium-High - Maintain Sleep Consistency</h4>
                <p className="text-sm text-kairos-silver-dark mb-2">
                  Your sleep schedule consistency correlates with better cognitive performance. Evening magnesium further improves sleep quality.
                </p>
                <div className="flex gap-2">
                  <span className="inline-block px-2 py-1 rounded text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Sleep</span>
                  <span className="inline-block px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">Supplementation</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-kairos-card/50 rounded-kairos-sm p-4 border border-blue-500/30">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-white mb-1">Priority: Medium - Stress Management & Cortisol Optimization</h4>
                <p className="text-sm text-kairos-silver-dark mb-2">
                  Morning cortisol levels correlate with daily stress scores. Implement breathwork or light stretching on high-stress days.
                </p>
                <div className="flex gap-2">
                  <span className="inline-block px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">Stress</span>
                  <span className="inline-block px-2 py-1 rounded text-xs bg-pink-500/20 text-pink-300 border border-pink-500/30">Recovery</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <button onClick={() => router.push("/goals")} className="kairos-btn-gold px-6 py-3 rounded-kairos-sm font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all">
            <Target className="w-4 h-4" />
            Create Action Plan
          </button>
          <button
            onClick={() => { setExporting(true); setTimeout(() => setExporting(false), 2000); }}
            disabled={exporting}
            className="kairos-btn-outline px-6 py-3 rounded-kairos-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export Insights"}
          </button>
        </div>
      </div>
    </div>
  );
}
