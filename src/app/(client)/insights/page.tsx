"use client";

import { useState, useMemo, useCallback } from "react";
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
  FileText,
  Loader2,
  ChevronRight,
  ChevronDown,
  Clock,
  Dna,
  Droplets,
  Scale,
  Shield,
  Sparkles,
  X,
  AlertTriangle,
} from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type InsightCategory = "Metabolic" | "Sleep" | "Recovery" | "Nutrition" | "Supplementation" | "Exercise" | "Stress";

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  metrics: string[];
}

interface HealthAgeData {
  chronologicalAge: number;
  biologicalAge: number;
  delta: number;
  interpretation: string;
}

interface DomainScore {
  domain: string;
  score: number;
  ageImpact: number;
  status: string;
  keyFindings: string[];
  recommendations: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReportData = Record<string, any>;

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const INSIGHT_CATEGORIES: InsightCategory[] = [
  "Metabolic", "Sleep", "Recovery", "Nutrition", "Supplementation", "Exercise", "Stress",
];

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

function mapCategory(dbCategory: string): InsightCategory {
  const map: Record<string, InsightCategory> = {
    glucose: "Metabolic",
    sleep: "Sleep",
    activity: "Exercise",
    supplements: "Supplementation",
    nutrition: "Nutrition",
    fasting: "Nutrition",
    composite: "Recovery",
  };
  return map[dbCategory] ?? "Recovery";
}

const REPORT_TYPES: ReportType[] = [
  {
    id: "health_age",
    title: "Health Age Assessment",
    description: "Compare your biological age to your chronological age across cardiovascular, metabolic, neurological, and musculoskeletal domains.",
    icon: <Clock size={24} />,
    color: "text-kairos-gold",
    bgGradient: "from-kairos-gold/20 to-amber-600/10",
    metrics: ["Biological Age", "Domain Scores", "Risk Factors", "Action Plan"],
  },
  {
    id: "comprehensive",
    title: "Comprehensive Health Summary",
    description: "Full analysis of every health domain — labs, genetics, sleep, glucose, BP, body composition, protocols, and cross-domain patterns.",
    icon: <FileText size={24} />,
    color: "text-blue-400",
    bgGradient: "from-blue-500/20 to-cyan-500/10",
    metrics: ["Overall Score", "All Domains", "Cross-Domain Insights", "Priority Actions"],
  },
  {
    id: "metabolic",
    title: "Metabolic & Glucose Report",
    description: "Deep dive into glucose control, insulin sensitivity, body composition, lipids, and nutritional impact on metabolic health.",
    icon: <Droplets size={24} />,
    color: "text-amber-400",
    bgGradient: "from-amber-500/20 to-orange-500/10",
    metrics: ["Glucose Trends", "Body Comp", "Relevant Biomarkers", "Diet Plan"],
  },
  {
    id: "recovery",
    title: "Recovery & Performance",
    description: "Sleep architecture, HRV trends, autonomic health, stress levels, and exercise readiness assessment.",
    icon: <Moon size={24} />,
    color: "text-purple-400",
    bgGradient: "from-purple-500/20 to-indigo-500/10",
    metrics: ["Sleep Quality", "Autonomic Health", "Stress Assessment", "Training Readiness"],
  },
  {
    id: "genetic_protocol",
    title: "Genetic Risk & Protocol Alignment",
    description: "Cross-reference your genetic mutations against your current supplement and peptide protocol to find gaps and redundancies.",
    icon: <Dna size={24} />,
    color: "text-green-400",
    bgGradient: "from-green-500/20 to-emerald-500/10",
    metrics: ["Pathway Risks", "Protocol Coverage", "Gaps", "Lab Correlations"],
  },
];

// ─────────────────────────────────────────────────────────
// Health Age Ring Component
// ─────────────────────────────────────────────────────────

function HealthAgeRing({ healthAge }: { healthAge: HealthAgeData }) {
  const { chronologicalAge, biologicalAge, delta } = healthAge;
  const isYounger = delta < 0;
  const color = isYounger ? "#22c55e" : delta === 0 ? "#D4AF37" : delta <= 3 ? "#f59e0b" : "#ef4444";
  const size = 160;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const maxAge = Math.max(chronologicalAge, biologicalAge) + 10;
  const progress = (biologicalAge / maxAge) * circumference;

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-kairos-border" />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={circumference - progress} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
          {/* Chronological age marker */}
          {(() => {
            const chronoProgress = (chronologicalAge / maxAge) * circumference;
            const angle = (chronoProgress / circumference) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const markerX = size / 2 + radius * Math.cos(rad);
            const markerY = size / 2 + radius * Math.sin(rad);
            return <circle cx={markerX} cy={markerY} r={5} fill="#D4AF37" stroke="#0A0F1F" strokeWidth={2} />;
          })()}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-heading font-bold" style={{ color }}>{biologicalAge}</span>
          <span className="text-[10px] font-body uppercase tracking-wider text-kairos-silver-dark">Bio Age</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-kairos-gold" />
          <span className="text-sm font-body text-kairos-silver-dark">Chronological: <span className="text-white font-semibold">{chronologicalAge}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: color }} />
          <span className="text-sm font-body text-kairos-silver-dark">Biological: <span className="text-white font-semibold">{biologicalAge}</span></span>
        </div>
        <div className={cn("text-lg font-heading font-bold mt-1", isYounger ? "text-green-400" : delta === 0 ? "text-kairos-gold" : "text-red-400")}>
          {isYounger ? `${Math.abs(delta)} years younger` : delta === 0 ? "Right on track" : `${delta} years older`}
        </div>
        <p className="text-xs font-body text-kairos-silver-dark max-w-[200px]">{healthAge.interpretation}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Domain Score Bar
// ─────────────────────────────────────────────────────────

function DomainScoreBar({ domain }: { domain: DomainScore }) {
  const statusColors: Record<string, string> = {
    optimal: "bg-green-400",
    good: "bg-blue-400",
    fair: "bg-yellow-400",
    needs_attention: "bg-amber-500",
    critical: "bg-red-500",
  };
  const barColor = statusColors[domain.status] ?? "bg-kairos-gold";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-heading font-semibold text-white">{domain.domain}</span>
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-heading font-semibold", domain.ageImpact <= 0 ? "text-green-400" : "text-red-400")}>
            {domain.ageImpact <= 0 ? "" : "+"}{domain.ageImpact}y
          </span>
          <span className="text-sm font-heading font-bold text-white">{domain.score}/100</span>
        </div>
      </div>
      <div className="h-2 bg-kairos-royal-surface rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${domain.score}%` }} />
      </div>
      {domain.keyFindings.length > 0 && (
        <p className="text-[10px] font-body text-kairos-silver-dark">{domain.keyFindings[0]}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Report Viewer Modal
// ─────────────────────────────────────────────────────────

function ReportViewer({
  report,
  reportType,
  onClose,
  onUpdate,
  onDownloadPdf,
  isUpdating,
}: {
  report: ReportData;
  reportType: string;
  onClose: () => void;
  onUpdate?: () => void;
  onDownloadPdf?: () => void;
  isUpdating?: boolean;
}) {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-12 overflow-y-auto">
      <div className="kairos-card w-full max-w-3xl max-h-[85vh] overflow-y-auto relative animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-kairos-card border-b border-kairos-border p-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={18} className="text-kairos-gold" />
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-kairos-gold">AI-Generated Report</span>
            </div>
            <h2 className="text-2xl font-heading font-bold text-white">{report.title}</h2>
            <p className="text-xs font-body text-kairos-silver-dark mt-1">
              Generated {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onDownloadPdf && (
              <button onClick={onDownloadPdf} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-kairos-royal-surface hover:bg-kairos-card-hover text-kairos-silver-dark hover:text-white transition-colors text-xs font-heading font-semibold" title="Download PDF">
                <Download size={14} />
                PDF
              </button>
            )}
            {onUpdate && (
              <button
                onClick={onUpdate}
                disabled={isUpdating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-kairos-gold/20 hover:bg-kairos-gold/30 text-kairos-gold transition-colors text-xs font-heading font-semibold disabled:opacity-50"
              >
                {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                Update
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-kairos-royal-surface transition-colors">
              <X size={20} className="text-kairos-silver-dark" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-kairos-gold/10 to-transparent border border-kairos-gold/20">
            <p className="text-sm font-body text-kairos-silver leading-relaxed">{report.summary}</p>
          </div>

          {/* Health Age Section — only for health_age report */}
          {reportType === "health_age" && report.healthAge && (
            <div className="kairos-card p-6 bg-gradient-to-br from-kairos-royal-surface to-kairos-card">
              <h3 className="text-lg font-heading font-bold text-white mb-4">Health Age Comparison</h3>
              <HealthAgeRing healthAge={report.healthAge} />
            </div>
          )}

          {/* Domain Scores — health_age */}
          {reportType === "health_age" && report.domainScores && (
            <div className="space-y-3">
              <h3 className="text-lg font-heading font-bold text-white">Domain Breakdown</h3>
              {report.domainScores.map((d: DomainScore, i: number) => (
                <DomainScoreBar key={i} domain={d} />
              ))}
            </div>
          )}

          {/* Overall Score — comprehensive */}
          {reportType === "comprehensive" && report.overallScore != null && (
            <div className="flex items-center gap-4">
              <div className="text-5xl font-heading font-bold text-kairos-gold">{report.overallScore}</div>
              <div>
                <p className="text-sm font-heading font-semibold text-white">Overall Health Score</p>
                <p className="text-xs font-body text-kairos-silver-dark">Out of 100</p>
              </div>
            </div>
          )}

          {/* Metabolic Score */}
          {reportType === "metabolic" && report.metabolicScore != null && (
            <div className="flex items-center gap-4">
              <div className="text-5xl font-heading font-bold text-amber-400">{report.metabolicScore}</div>
              <div>
                <p className="text-sm font-heading font-semibold text-white">Metabolic Score</p>
                <p className="text-xs font-body text-kairos-silver-dark">Out of 100</p>
              </div>
            </div>
          )}

          {/* Recovery Score */}
          {reportType === "recovery" && report.recoveryScore != null && (
            <div className="flex items-center gap-4">
              <div className="text-5xl font-heading font-bold text-purple-400">{report.recoveryScore}</div>
              <div>
                <p className="text-sm font-heading font-semibold text-white">Recovery Score</p>
                <p className="text-xs font-body text-kairos-silver-dark">Out of 100</p>
              </div>
            </div>
          )}

          {/* Alignment Score — genetic */}
          {reportType === "genetic_protocol" && report.alignmentScore != null && (
            <div className="flex items-center gap-4">
              <div className="text-5xl font-heading font-bold text-green-400">{report.alignmentScore}</div>
              <div>
                <p className="text-sm font-heading font-semibold text-white">Protocol Alignment</p>
                <p className="text-xs font-body text-kairos-silver-dark">How well your protocol covers genetic needs</p>
              </div>
            </div>
          )}

          {/* Sections — comprehensive report */}
          {report.sections && Array.isArray(report.sections) && (
            <div className="space-y-2">
              <h3 className="text-lg font-heading font-bold text-white">Detailed Analysis</h3>
              {report.sections.map((section: ReportData, i: number) => (
                <div key={i} className="kairos-card overflow-hidden">
                  <button
                    onClick={() => toggleSection(i)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-kairos-royal-surface/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-xs font-heading font-bold px-2 py-0.5 rounded-full",
                        section.status === "optimal" ? "bg-green-500/20 text-green-400" :
                        section.status === "good" ? "bg-blue-500/20 text-blue-400" :
                        section.status === "fair" ? "bg-yellow-500/20 text-yellow-400" :
                        section.status === "needs_attention" ? "bg-red-500/20 text-red-400" :
                        "bg-kairos-gold/20 text-kairos-gold"
                      )}>
                        {section.score != null ? `${section.score}/100` : section.status}
                      </span>
                      <span className="text-sm font-heading font-semibold text-white">{section.title}</span>
                    </div>
                    {expandedSections.has(i) ? <ChevronDown size={16} className="text-kairos-silver-dark" /> : <ChevronRight size={16} className="text-kairos-silver-dark" />}
                  </button>
                  {expandedSections.has(i) && (
                    <div className="px-4 pb-4 space-y-3 border-t border-kairos-border">
                      <p className="text-sm font-body text-kairos-silver-dark pt-3">{section.summary}</p>
                      {section.metrics && section.metrics.length > 0 && (
                        <div className="space-y-1">
                          {section.metrics.map((m: ReportData, mi: number) => (
                            <div key={mi} className="flex items-center justify-between py-1 border-b border-kairos-border/30 last:border-0">
                              <span className="text-xs font-body text-kairos-silver-dark">{m.label}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-heading font-semibold text-white">{m.value}</span>
                                <span className={cn(
                                  "text-[10px] font-heading font-bold px-1.5 py-0.5 rounded",
                                  m.status === "optimal" ? "bg-green-500/20 text-green-400" :
                                  m.status === "normal" ? "bg-blue-500/20 text-blue-400" :
                                  m.status === "borderline" ? "bg-yellow-500/20 text-yellow-400" :
                                  m.status === "concerning" ? "bg-orange-500/20 text-orange-400" :
                                  m.status === "critical" ? "bg-red-500/20 text-red-400" :
                                  "bg-kairos-gold/20 text-kairos-gold"
                                )}>
                                  {m.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {section.recommendations && section.recommendations.length > 0 && (
                        <div className="bg-kairos-royal-surface/50 rounded-lg p-3">
                          <p className="text-[10px] font-heading font-bold uppercase tracking-wider text-kairos-gold mb-2">Recommendations</p>
                          <div className="space-y-1">
                            {section.recommendations.map((r: string, ri: number) => (
                              <p key={ri} className="text-xs font-body text-kairos-silver-dark flex gap-2">
                                <span className="text-kairos-gold flex-shrink-0">•</span>{r}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pathway Analysis — genetic */}
          {report.pathwayAnalysis && Array.isArray(report.pathwayAnalysis) && (
            <div className="space-y-2">
              <h3 className="text-lg font-heading font-bold text-white">Pathway Analysis</h3>
              {report.pathwayAnalysis.map((p: ReportData, i: number) => (
                <div key={i} className="kairos-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-heading font-semibold text-white">{p.pathway}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-heading font-bold px-2 py-0.5 rounded-full",
                        p.riskLevel === "high" ? "bg-red-500/20 text-red-400" :
                        p.riskLevel === "moderate" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-green-500/20 text-green-400"
                      )}>{p.riskLevel} risk</span>
                      <span className={cn(
                        "text-[10px] font-heading font-bold px-2 py-0.5 rounded-full",
                        p.currentProtocolCoverage === "fully_addressed" ? "bg-green-500/20 text-green-400" :
                        p.currentProtocolCoverage === "partially_addressed" ? "bg-yellow-500/20 text-yellow-400" :
                        "bg-red-500/20 text-red-400"
                      )}>{p.currentProtocolCoverage?.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                  {p.gaps && p.gaps.length > 0 && (
                    <div className="mt-2 text-xs font-body text-kairos-silver-dark">
                      <span className="text-red-400 font-semibold">Gaps: </span>
                      {p.gaps.join("; ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Glucose Analysis — metabolic */}
          {report.glucoseAnalysis && (
            <div className="kairos-card p-4">
              <h3 className="text-sm font-heading font-bold text-white mb-3">Glucose Analysis</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {report.glucoseAnalysis.avgGlucose != null && (
                  <div className="text-center">
                    <p className="text-xl font-heading font-bold text-white">{report.glucoseAnalysis.avgGlucose}</p>
                    <p className="text-[10px] font-body text-kairos-silver-dark">Avg mg/dL</p>
                  </div>
                )}
                {report.glucoseAnalysis.timeInRange != null && (
                  <div className="text-center">
                    <p className="text-xl font-heading font-bold text-white">{report.glucoseAnalysis.timeInRange}%</p>
                    <p className="text-[10px] font-body text-kairos-silver-dark">Time in Range</p>
                  </div>
                )}
                {report.glucoseAnalysis.spikeCount != null && (
                  <div className="text-center">
                    <p className="text-xl font-heading font-bold text-amber-400">{report.glucoseAnalysis.spikeCount}</p>
                    <p className="text-[10px] font-body text-kairos-silver-dark">Spikes</p>
                  </div>
                )}
                {report.glucoseAnalysis.variability && (
                  <div className="text-center">
                    <p className="text-xl font-heading font-bold text-white capitalize">{report.glucoseAnalysis.variability}</p>
                    <p className="text-[10px] font-body text-kairos-silver-dark">Variability</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sleep Analysis — recovery */}
          {report.sleepAnalysis && (
            <div className="kairos-card p-4">
              <h3 className="text-sm font-heading font-bold text-white mb-3">Sleep Analysis</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-xl font-heading font-bold text-white">{report.sleepAnalysis.avgDuration}</p>
                  <p className="text-[10px] font-body text-kairos-silver-dark">Avg Duration</p>
                </div>
                {report.sleepAnalysis.avgQuality != null && (
                  <div className="text-center">
                    <p className="text-xl font-heading font-bold text-white">{report.sleepAnalysis.avgQuality}/100</p>
                    <p className="text-[10px] font-body text-kairos-silver-dark">Quality</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xl font-heading font-bold text-purple-400">{report.sleepAnalysis.deepSleepPct}</p>
                  <p className="text-[10px] font-body text-kairos-silver-dark">Deep Sleep</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-heading font-bold text-blue-400 capitalize">{report.sleepAnalysis.consistency}</p>
                  <p className="text-[10px] font-body text-kairos-silver-dark">Consistency</p>
                </div>
              </div>
            </div>
          )}

          {/* Top Risks */}
          {report.topRisks && report.topRisks.length > 0 && (
            <div>
              <h3 className="text-lg font-heading font-bold text-white mb-3">Top Risks</h3>
              <div className="space-y-2">
                {report.topRisks.map((r: ReportData, i: number) => (
                  <div key={i} className="kairos-card p-3 border-l-[3px] border-l-red-400">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} className={cn("mt-0.5 flex-shrink-0", r.severity === "high" ? "text-red-400" : r.severity === "medium" ? "text-amber-400" : "text-yellow-400")} />
                      <div>
                        <p className="text-sm font-body text-white">{r.risk}</p>
                        <p className="text-xs font-body text-kairos-silver-dark mt-1">Mitigation: {r.mitigation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Strengths */}
          {report.topStrengths && report.topStrengths.length > 0 && (
            <div>
              <h3 className="text-lg font-heading font-bold text-white mb-3">Strengths</h3>
              <div className="space-y-2">
                {report.topStrengths.map((s: ReportData, i: number) => (
                  <div key={i} className="kairos-card p-3 border-l-[3px] border-l-green-400">
                    <p className="text-sm font-body text-white">{s.strength}</p>
                    <p className="text-xs font-body text-kairos-silver-dark mt-1">{s.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross-domain insights — comprehensive */}
          {report.crossDomainInsights && report.crossDomainInsights.length > 0 && (
            <div>
              <h3 className="text-lg font-heading font-bold text-white mb-3">Cross-Domain Insights</h3>
              <div className="space-y-2">
                {report.crossDomainInsights.map((c: ReportData, i: number) => (
                  <div key={i} className="kairos-card p-3">
                    <p className="text-sm font-body text-white">{c.insight}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {c.domains?.map((d: string, di: number) => (
                        <span key={di} className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-kairos-gold/20 text-kairos-gold">{d}</span>
                      ))}
                    </div>
                    <p className="text-xs font-body text-kairos-silver-dark mt-1">{c.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Plan */}
          {(report.actionPlan || report.prioritizedActions) && (
            <div>
              <h3 className="text-lg font-heading font-bold text-white mb-3">Action Plan</h3>
              <div className="space-y-2">
                {(report.actionPlan ?? report.prioritizedActions)?.map((a: ReportData, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 kairos-card">
                    <div className="w-6 h-6 rounded-full bg-kairos-gold/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-heading font-bold text-kairos-gold">{a.priority}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-body text-white">{a.action}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-kairos-royal-surface text-kairos-silver-dark capitalize">{a.category}</span>
                        {a.timeframe && <span className="text-[10px] font-body text-kairos-silver-dark capitalize">{a.timeframe.replace(/_/g, " ")}</span>}
                        {a.expectedImpact && <span className="text-[10px] font-body text-kairos-silver-dark">{a.expectedImpact}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="p-3 rounded-lg bg-kairos-royal-surface border border-kairos-border">
            <p className="text-[10px] font-body text-kairos-silver-dark">
              This AI-generated report is for informational purposes only and should not replace professional medical advice. Discuss any changes to your health protocol with your healthcare provider or EVERIST coach.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Page
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function InsightsPage() {
  const router = useRouter();
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  const [selectedCategory, setSelectedCategory] = useState<InsightCategory | null>(null);
  const [activeTab, setActiveTab] = useState<"insights" | "reports">("reports");
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<{ data: ReportData; type: string } | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const range = useMemo(() => ({
    startDate: dateRange.startDate.toISOString().split("T")[0],
    endDate: dateRange.endDate.toISOString().split("T")[0],
  }), [dateRange]);

  const insightsQuery = trpc.clientPortal.insights.getAll.useQuery(range, { staleTime: 30_000 });
  const { data: insightsData } = insightsQuery;

  // ── Saved reports ────────────────────────────────────────
  const savedReportsQuery = trpc.clientPortal.reports.listAll.useQuery(undefined, { staleTime: 60_000 });
  const saveReportMutation = trpc.clientPortal.reports.save.useMutation({
    onSuccess: () => savedReportsQuery.refetch(),
  });
  /** Map of reportType → saved report */
  const savedReportsMap = useMemo(() => {
    const map: Record<string, { data: ReportData; createdAt: Date; expiresAt: Date }> = {};
    for (const r of savedReportsQuery.data ?? []) {
      map[r.reportType] = {
        data: r.reportData as ReportData,
        createdAt: new Date(r.createdAt),
        expiresAt: new Date(r.expiresAt),
      };
    }
    return map;
  }, [savedReportsQuery.data]);

  const insights = (insightsData?.insights ?? []).map((i) => ({
    ...i,
    displayCategory: mapCategory(i.category),
  }));

  const filteredInsights = selectedCategory
    ? insights.filter((insight) => insight.displayCategory === selectedCategory)
    : insights;

  const score = insights.length > 0
    ? Math.min(10, Math.round(insights.filter((i) => i.severity === "positive").length / Math.max(insights.length, 1) * 10))
    : 0;
  const trend = insights.length > 0 ? "+0.5" : "0";

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const generateReport = useCallback(async (reportType: string) => {
    setGeneratingReport(reportType);
    setReportError(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportType }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to generate report");
      }
      const data = await res.json();
      const report = data.report as ReportData;
      setCurrentReport({ data: report, type: reportType });

      // Save to DB with 60-day expiry
      const rtConfig = REPORT_TYPES.find((rt) => rt.id === reportType);
      saveReportMutation.mutate({
        reportType,
        title: rtConfig?.title ?? reportType,
        reportData: report,
      });
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGeneratingReport(null);
    }
  }, [saveReportMutation]);

  /** Handle clicking a report card — show cached or generate */
  const handleReportClick = useCallback((reportType: string) => {
    const saved = savedReportsMap[reportType];
    if (saved) {
      setCurrentReport({ data: saved.data, type: reportType });
    } else {
      generateReport(reportType);
    }
  }, [savedReportsMap, generateReport]);

  /** Download the current report as a simple HTML-to-PDF */
  const downloadReportPdf = useCallback(() => {
    if (!currentReport) return;
    const report = currentReport.data;
    const title = (report.title as string) ?? "Health Report";

    // Build printable HTML
    const sections = (report.sections as ReportData[] | undefined) ?? [];
    const actionPlan = (report.actionPlan ?? report.prioritizedActions) as ReportData[] | undefined;
    const topRisks = report.topRisks as ReportData[] | undefined;

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${title}</title>
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a2e; }
  h1 { color: #0A1628; border-bottom: 3px solid #D4AF37; padding-bottom: 8px; }
  h2 { color: #2a2a4a; margin-top: 28px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
  .summary { background: #f8f6f0; border-left: 4px solid #D4AF37; padding: 16px; margin: 20px 0; border-radius: 4px; }
  .score-box { display: inline-block; background: #0A1628; color: #D4AF37; font-size: 36px; font-weight: bold; padding: 12px 24px; border-radius: 8px; margin: 8px 0; }
  .risk { border-left: 3px solid #e74c3c; padding: 8px 12px; margin: 8px 0; background: #fff5f5; border-radius: 4px; }
  .strength { border-left: 3px solid #27ae60; padding: 8px 12px; margin: 8px 0; background: #f0fff4; border-radius: 4px; }
  .action { padding: 8px 0; border-bottom: 1px solid #eee; }
  .action-num { display: inline-block; background: #D4AF37; color: #fff; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: bold; margin-right: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
  th { background: #f5f5f5; font-weight: 600; }
  .disclaimer { font-size: 10px; color: #999; margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; }
  .footer { text-align: center; font-size: 11px; color: #aaa; margin-top: 24px; }
  @media print { body { padding: 20px; } }
</style></head><body>`;

    html += `<h1>${title}</h1>`;
    html += `<p class="meta">Generated ${new Date(report.generatedAt as string).toLocaleString()} &bull; Expires in 60 days &bull; EVERIST.ai</p>`;
    html += `<div class="summary">${report.summary}</div>`;

    // Scores
    if (report.overallScore != null) html += `<div class="score-box">${report.overallScore}/100</div><p style="color:#666;font-size:13px">Overall Health Score</p>`;
    if (report.metabolicScore != null) html += `<div class="score-box">${report.metabolicScore}/100</div><p style="color:#666;font-size:13px">Metabolic Score</p>`;
    if (report.recoveryScore != null) html += `<div class="score-box">${report.recoveryScore}/100</div><p style="color:#666;font-size:13px">Recovery Score</p>`;
    if (report.alignmentScore != null) html += `<div class="score-box">${report.alignmentScore}/100</div><p style="color:#666;font-size:13px">Protocol Alignment</p>`;

    // Health Age
    if (report.healthAge) {
      const ha = report.healthAge as HealthAgeData;
      html += `<h2>Health Age</h2>`;
      html += `<p>Chronological Age: <strong>${ha.chronologicalAge}</strong> &bull; Biological Age: <strong>${ha.biologicalAge}</strong> &bull; Delta: <strong>${ha.delta > 0 ? "+" : ""}${ha.delta} years</strong></p>`;
      html += `<p>${ha.interpretation}</p>`;
    }

    // Domain Scores
    if (report.domainScores) {
      html += `<h2>Domain Breakdown</h2><table><tr><th>Domain</th><th>Score</th><th>Age Impact</th><th>Status</th></tr>`;
      for (const d of report.domainScores as DomainScore[]) {
        html += `<tr><td>${d.domain}</td><td>${d.score}/100</td><td>${d.ageImpact > 0 ? "+" : ""}${d.ageImpact}y</td><td>${d.status}</td></tr>`;
      }
      html += `</table>`;
    }

    // Sections
    if (sections.length > 0) {
      html += `<h2>Detailed Analysis</h2>`;
      for (const s of sections) {
        html += `<h3>${s.title} ${s.score != null ? `(${s.score}/100)` : ""}</h3>`;
        html += `<p>${s.summary}</p>`;
        if (s.metrics?.length > 0) {
          html += `<table><tr><th>Metric</th><th>Value</th><th>Status</th></tr>`;
          for (const m of s.metrics) html += `<tr><td>${m.label}</td><td>${m.value}</td><td>${m.status}</td></tr>`;
          html += `</table>`;
        }
        if (s.recommendations?.length > 0) {
          html += `<ul>`;
          for (const r of s.recommendations) html += `<li>${r}</li>`;
          html += `</ul>`;
        }
      }
    }

    // Risks
    if (topRisks?.length) {
      html += `<h2>Top Risks</h2>`;
      for (const r of topRisks) html += `<div class="risk"><strong>${r.risk}</strong><br/><small>Mitigation: ${r.mitigation}</small></div>`;
    }

    // Strengths
    if (report.topStrengths && (report.topStrengths as ReportData[]).length > 0) {
      html += `<h2>Strengths</h2>`;
      for (const s of report.topStrengths as ReportData[]) html += `<div class="strength"><strong>${s.strength}</strong><br/><small>${s.impact}</small></div>`;
    }

    // Action Plan
    if (actionPlan?.length) {
      html += `<h2>Action Plan</h2>`;
      for (const a of actionPlan) html += `<div class="action"><span class="action-num">${a.priority}</span><strong>${a.action}</strong> <small style="color:#666">${a.category} &bull; ${a.timeframe ?? a.effort ?? ""}</small></div>`;
    }

    html += `<p class="disclaimer">This AI-generated report is for informational purposes only and should not replace professional medical advice. Discuss any changes with your healthcare provider or EVERIST coach.</p>`;
    html += `<p class="footer">EVERIST.ai &bull; Private Health Management</p>`;
    html += `</body></html>`;

    // Open in new window for print/PDF
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  }, [currentReport]);

  if (insightsQuery.isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
            <Brain size={24} className="text-red-400" />
          </div>
          <h3 className="font-heading font-semibold text-white">Unable to load insights</h3>
          <p className="text-sm font-body text-kairos-silver-dark">
            We couldn&apos;t fetch your health insights. Please try again.
          </p>
          <button onClick={() => insightsQuery.refetch()} className="kairos-btn-gold text-sm px-6 py-2">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-1">Insight Sherpa</h1>
          <p className="text-kairos-silver-dark font-body text-sm">
            Your AI guide to personalized health intelligence
          </p>
        </div>
        <div className="text-xs font-heading font-semibold px-3 py-1 rounded-full bg-kairos-gold/20 text-kairos-gold flex items-center gap-1">
          <Brain className="w-4 h-4" />
          Powered by Everist AI
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-kairos-royal-surface rounded-xl">
        <button
          onClick={() => setActiveTab("reports")}
          className={cn(
            "flex-1 px-4 py-2.5 rounded-lg text-sm font-heading font-semibold transition-all flex items-center justify-center gap-2",
            activeTab === "reports"
              ? "bg-kairos-gold text-kairos-royal-dark shadow-lg"
              : "text-kairos-silver-dark hover:text-white"
          )}
        >
          <FileText size={16} />
          AI Reports
        </button>
        <button
          onClick={() => setActiveTab("insights")}
          className={cn(
            "flex-1 px-4 py-2.5 rounded-lg text-sm font-heading font-semibold transition-all flex items-center justify-center gap-2",
            activeTab === "insights"
              ? "bg-kairos-gold text-kairos-royal-dark shadow-lg"
              : "text-kairos-silver-dark hover:text-white"
          )}
        >
          <Lightbulb size={16} />
          Data Insights
        </button>
      </div>

      {/* ━━━ AI Reports Tab ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          {/* Report Error */}
          {reportError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-heading font-semibold text-red-400">Report Generation Failed</p>
                <p className="text-xs font-body text-kairos-silver-dark mt-1">{reportError}</p>
              </div>
              <button onClick={() => setReportError(null)} className="ml-auto">
                <X size={16} className="text-kairos-silver-dark" />
              </button>
            </div>
          )}

          {/* Report Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REPORT_TYPES.map((rt) => {
              const isGenerating = generatingReport === rt.id;
              const saved = savedReportsMap[rt.id];
              return (
                <button
                  key={rt.id}
                  onClick={() => !isGenerating && handleReportClick(rt.id)}
                  disabled={isGenerating || generatingReport !== null}
                  className={cn(
                    "kairos-card p-5 text-left bg-gradient-to-br hover:border-kairos-gold/30 transition-all hover:shadow-lg hover:shadow-kairos-gold/5 group disabled:opacity-60",
                    rt.bgGradient,
                    saved && "border-kairos-gold/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-current/10", rt.color)}>
                      {isGenerating ? <Loader2 size={20} className="animate-spin" /> : rt.icon}
                    </div>
                    <div className="flex items-center gap-2">
                      {saved && (
                        <span className="text-[10px] font-heading font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                          Saved
                        </span>
                      )}
                      <ChevronRight size={16} className="text-kairos-silver-dark group-hover:text-kairos-gold transition-colors" />
                    </div>
                  </div>
                  <h3 className="text-base font-heading font-bold text-white mb-1">{rt.title}</h3>
                  <p className="text-xs font-body text-kairos-silver-dark mb-3 line-clamp-2">{rt.description}</p>
                  {saved ? (
                    <div className="flex items-center gap-2 text-[10px] font-body text-kairos-silver-dark">
                      <Clock size={12} />
                      <span>Generated {saved.createdAt.toLocaleDateString()}</span>
                      <span className="text-kairos-gold">• Click to view</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {rt.metrics.map((m) => (
                        <span key={m} className="text-[10px] font-heading font-semibold px-2 py-0.5 rounded-full bg-kairos-royal-surface text-kairos-silver-dark">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                  {isGenerating && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-kairos-royal-surface rounded-full overflow-hidden">
                        <div className="h-full bg-kairos-gold rounded-full animate-pulse w-2/3" />
                      </div>
                      <span className="text-[10px] font-body text-kairos-gold">Analyzing data...</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Info note */}
          <div className="p-4 rounded-xl bg-kairos-royal-surface border border-kairos-border flex items-start gap-3">
            <Sparkles size={16} className="text-kairos-gold mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-heading font-semibold text-white">AI-Powered Reports</p>
              <p className="text-xs font-body text-kairos-silver-dark mt-1">
                Each report pulls from your complete health profile — genetics, labs, CGM, sleep, blood pressure, supplements, and more — to generate personalized, data-driven analysis. Reports take 15-30 seconds to generate.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ━━━ Data Insights Tab ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {activeTab === "insights" && (
        <>
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

          {/* Summary Card */}
          <div className="kairos-card bg-gradient-to-br from-kairos-royal-surface to-kairos-card border-l-4 border-kairos-gold">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-heading font-bold text-white mb-2">
                  {period === "week" ? "Weekly" : "Monthly"} Health Summary
                </h2>
                <p className="text-kairos-silver-dark text-sm">{formattedRange}</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-heading font-bold text-kairos-gold">{score}/10</div>
                <p className="text-xs text-kairos-silver-dark">Overall Score</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-kairos-card/50 rounded-kairos-sm p-4 border border-kairos-border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-kairos-gold" />
                  <span className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Score Trend</span>
                </div>
                <p className="text-lg font-bold text-kairos-gold">{trend}</p>
                <p className="text-xs text-kairos-silver-dark">vs previous {period}</p>
              </div>
              <div className="bg-kairos-card/50 rounded-kairos-sm p-4 border border-kairos-border">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-kairos-gold" />
                  <span className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Insights</span>
                </div>
                <p className="text-lg font-bold text-white">{insights.length}</p>
                <p className="text-xs text-kairos-silver-dark">Generated</p>
              </div>
              <div className="bg-kairos-card/50 rounded-kairos-sm p-4 border border-kairos-border">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Positive</span>
                </div>
                <p className="text-lg font-bold text-pink-400">{insights.filter((i) => i.severity === "positive").length}</p>
                <p className="text-xs text-kairos-silver-dark">Good signals</p>
              </div>
              <div className="bg-kairos-card/50 rounded-kairos-sm p-4 border border-kairos-border">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Actions</span>
                </div>
                <p className="text-lg font-bold text-yellow-400">{insights.filter((i) => i.severity === "warning" || i.severity === "critical").length}</p>
                <p className="text-xs text-kairos-silver-dark">Needs attention</p>
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
                className={`kairos-card bg-gradient-to-br ${categoryGradients[insight.displayCategory] ?? ""} animate-fade-in border-2 hover:border-kairos-gold/50 transition-all hover:shadow-lg hover:shadow-kairos-gold/10`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1 text-kairos-gold">{categoryIcons[insight.displayCategory]}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-heading font-bold text-white mb-1">{insight.title}</h3>
                      <p className="text-xs text-kairos-silver-dark uppercase tracking-wide">{insight.displayCategory}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-kairos-sm text-xs font-semibold uppercase tracking-wide ${
                    insight.severity === "positive"
                      ? "bg-green-500/20 text-green-300 border border-green-500/30"
                      : insight.severity === "warning"
                      ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                      : insight.severity === "critical"
                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                      : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  }`}>
                    {insight.severity}
                  </div>
                </div>

                <p className="text-kairos-silver-dark text-sm mb-4 leading-relaxed">{insight.description}</p>

                {insight.recommendation && (
                  <div className="bg-kairos-card/50 rounded-kairos-sm p-4 mb-4 border border-kairos-border/50">
                    <div className="flex items-start gap-2 mb-2">
                      <Lightbulb className="w-4 h-4 text-kairos-gold flex-shrink-0 mt-0.5" />
                      <h4 className="text-xs font-semibold text-kairos-gold uppercase tracking-wide">Recommendation</h4>
                    </div>
                    <p className="text-sm text-kairos-silver-dark leading-relaxed">{insight.recommendation}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-kairos-border/30">
                  <p className="text-xs text-kairos-silver-dark">{insight.dataSource}</p>
                  <p className="text-xs text-kairos-silver-dark">{new Date(insight.timestamp).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredInsights.length === 0 && (
            <div className="kairos-card text-center py-10">
              <Brain size={32} className="text-kairos-silver-dark mx-auto mb-3" />
              <p className="text-sm font-body text-kairos-silver-dark">No insights available yet. Continue logging data for personalized analysis.</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="kairos-card bg-gradient-to-br from-kairos-royal-surface to-kairos-card border-l-4 border-kairos-gold">
            <div className="flex items-center gap-3 mb-6">
              <Target className="w-6 h-6 text-kairos-gold" />
              <h2 className="text-2xl font-heading font-bold text-white">Take Action</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => router.push("/goals")} className="kairos-btn-gold px-6 py-3 rounded-kairos-sm font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                <Target className="w-4 h-4" />
                Create Action Plan
              </button>
              <button
                onClick={() => setActiveTab("reports")}
                className="kairos-btn-outline px-6 py-3 rounded-kairos-sm font-semibold transition-all flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Generate AI Report
              </button>
            </div>
          </div>
        </>
      )}

      {/* Report Viewer Modal */}
      {currentReport && (
        <ReportViewer
          report={currentReport.data}
          reportType={currentReport.type}
          onClose={() => setCurrentReport(null)}
          onUpdate={() => {
            setCurrentReport(null);
            generateReport(currentReport.type);
          }}
          onDownloadPdf={downloadReportPdf}
          isUpdating={generatingReport === currentReport.type}
        />
      )}
    </div>
  );
}
