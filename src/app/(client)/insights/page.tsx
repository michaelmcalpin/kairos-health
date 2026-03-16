"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";

interface Insight {
  id: string;
  category: "Metabolic" | "Sleep" | "Recovery" | "Nutrition" | "Supplementation" | "Exercise" | "Stress";
  title: string;
  description: string;
  confidence: "high" | "medium";
  recommendation: string;
  dataSource: string;
  timestamp: string;
}

// Seeded random for consistent mock data
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const insightTemplates: Omit<Insight, "id" | "timestamp">[] = [
  { category: "Metabolic", title: "Glucose Stability Improvement", description: "Your post-meal glucose spikes have decreased by {pct}% this period compared to the previous period.", confidence: "high", recommendation: "Continue your current meal timing and protein intake patterns—they are working well for metabolic stability.", dataSource: "Based on {n} glucose measurements" },
  { category: "Sleep", title: "Sleep Quality & Recovery Link", description: "Your sleep quality improves {pct}% on days you complete evening magnesium supplementation.", confidence: "high", recommendation: "Maintain consistent evening magnesium intake around 8 PM for optimal sleep architecture.", dataSource: "Based on {n} sleep records" },
  { category: "Exercise", title: "Post-Dinner Walk Effect", description: "Post-dinner walks reduce your glucose spikes by an average of {v} mg/dL compared to resting.", confidence: "high", recommendation: "Incorporate a 10-15 minute walk within 30 minutes after dinner on most days.", dataSource: "Based on {n} glucose-activity correlations" },
  { category: "Recovery", title: "HRV Trend Rising", description: "Your Heart Rate Variability shows an upward trend, indicating improved parasympathetic tone and recovery capacity.", confidence: "medium", recommendation: "Your recovery metrics are trending positively. Consider adding one additional rest day to further optimize.", dataSource: "Based on {n} days of HRV data" },
  { category: "Nutrition", title: "Fiber Intake Optimization", description: "You are meeting {pct}% of your daily fiber targets. This correlates with stable energy levels throughout the day.", confidence: "high", recommendation: "Aim for consistent daily fiber intake of 30-35g. Add one serving of vegetables or whole grains to one meal.", dataSource: "Based on {n} days of nutrition logs" },
  { category: "Stress", title: "Cortisol Patterns Emerging", description: "Morning cortisol levels are highest on days with high stress scores. Consider morning meditation or movement.", confidence: "medium", recommendation: "Try 10 minutes of breathwork or light stretching within 30 minutes of waking on high-stress days.", dataSource: "Based on stress logs and biomarker data" },
  { category: "Supplementation", title: "Supplement Compliance Strong", description: "Your supplement adherence is {pct}% this period. Consistent intake is supporting your health goals.", confidence: "high", recommendation: "Maintain your current supplement schedule. Consider setting a calendar reminder for your evening protocol.", dataSource: "Based on supplement logs" },
  { category: "Sleep", title: "Sleep Duration Consistency", description: "Consistent sleep schedule correlates with {pct}% better next-day cognitive performance.", confidence: "high", recommendation: "Maintain your current sleep and wake times within 30 minutes even on weekends for optimal circadian alignment.", dataSource: "Based on {n} nights of sleep data" },
  { category: "Metabolic", title: "Fasting Window Optimization", description: "Your metabolic markers improve by {pct}% when fasting windows exceed 14 hours.", confidence: "high", recommendation: "Extend your fasting window to 14-16 hours on most days for optimal metabolic benefits.", dataSource: "Based on {n} fasting sessions" },
  { category: "Exercise", title: "Zone 2 Training Progress", description: "Your aerobic base is improving. VO2 max estimate has increased by {pct}% over this period.", confidence: "medium", recommendation: "Continue Zone 2 cardio sessions 3-4 times per week for sustained aerobic development.", dataSource: "Based on {n} workout sessions" },
];

function generateInsights(startDate: Date, endDate: Date): Insight[] {
  const baseSeed = startDate.getTime() / 86400000;
  const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
  const count = Math.min(insightTemplates.length, Math.max(4, Math.round(days / 2)));
  const insights: Insight[] = [];
  const used = new Set<number>();

  for (let i = 0; i < count; i++) {
    let idx = Math.floor(seededRandom(baseSeed + i * 11) * insightTemplates.length);
    while (used.has(idx)) idx = (idx + 1) % insightTemplates.length;
    used.add(idx);

    const tpl = insightTemplates[idx];
    const pct = Math.round(10 + seededRandom(baseSeed + i * 13) * 30);
    const n = Math.round(7 + seededRandom(baseSeed + i * 17) * days * 3);
    const v = Math.round(20 + seededRandom(baseSeed + i * 19) * 25);
    const hoursAgo = Math.round(seededRandom(baseSeed + i * 23) * days * 24);
    const timestamp = hoursAgo < 24 ? `${hoursAgo}h ago` : `${Math.round(hoursAgo / 24)}d ago`;

    insights.push({
      ...tpl,
      id: `insight-${i}`,
      description: tpl.description.replace("{pct}", String(pct)).replace("{v}", String(v)),
      dataSource: tpl.dataSource.replace("{n}", String(n)),
      timestamp,
    });
  }
  return insights;
}

const categoryIcons: Record<Insight["category"], React.ReactNode> = {
  Metabolic: <Zap className="w-5 h-5" />,
  Sleep: <Moon className="w-5 h-5" />,
  Recovery: <Heart className="w-5 h-5" />,
  Nutrition: <Flame className="w-5 h-5" />,
  Supplementation: <Pill className="w-5 h-5" />,
  Exercise: <Activity className="w-5 h-5" />,
  Stress: <Brain className="w-5 h-5" />,
};

const categoryGradients: Record<Insight["category"], string> = {
  Metabolic: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30",
  Sleep: "from-indigo-500/20 to-purple-500/20 border-indigo-500/30",
  Recovery: "from-pink-500/20 to-rose-500/20 border-pink-500/30",
  Nutrition: "from-green-500/20 to-emerald-500/20 border-green-500/30",
  Supplementation: "from-blue-500/20 to-cyan-500/20 border-blue-500/30",
  Exercise: "from-red-500/20 to-orange-500/20 border-red-500/30",
  Stress: "from-purple-500/20 to-violet-500/20 border-purple-500/30",
};

export default function InsightsPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  const [selectedCategory, setSelectedCategory] = useState<Insight["category"] | null>(null);

  const insights = useMemo(() => generateInsights(dateRange.startDate, dateRange.endDate), [dateRange]);

  const filteredInsights = selectedCategory
    ? insights.filter((insight) => insight.category === selectedCategory)
    : insights;

  const categories: Insight["category"][] = [
    "Metabolic", "Sleep", "Recovery", "Nutrition", "Supplementation", "Exercise", "Stress",
  ];

  // Summary stats from insights
  const summaryScore = useMemo(() => {
    const baseSeed = dateRange.startDate.getTime() / 86400000;
    return (7 + seededRandom(baseSeed + 99) * 2.5).toFixed(1);
  }, [dateRange]);

  const summaryTrend = useMemo(() => {
    const baseSeed = dateRange.startDate.getTime() / 86400000;
    return (seededRandom(baseSeed + 100) * 1.5 - 0.3).toFixed(1);
  }, [dateRange]);

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
            <div className="text-4xl font-heading font-bold text-kairos-gold">{summaryScore}/10</div>
            <p className="text-xs text-kairos-silver-dark">Overall Score</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-kairos-card/50 rounded-kairos-sm p-4 border border-kairos-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-kairos-gold" />
              <span className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Score Trend</span>
            </div>
            <p className="text-lg font-bold text-kairos-gold">{Number(summaryTrend) >= 0 ? "+" : ""}{summaryTrend}</p>
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
          {categories.map((category) => (
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
          <button className="kairos-btn-gold px-6 py-3 rounded-kairos-sm font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all">
            <Target className="w-4 h-4" />
            Create Action Plan
          </button>
          <button className="kairos-btn-outline px-6 py-3 rounded-kairos-sm font-semibold transition-all">
            Export Insights
          </button>
        </div>
      </div>
    </div>
  );
}
