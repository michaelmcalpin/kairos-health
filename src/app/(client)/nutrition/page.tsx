"use client";

import { useState, useMemo, useCallback } from "react";
import {
  UtensilsCrossed,
  Plus,
  X,
  Loader2,
  Target,
  Coffee,
  Sun,
  Moon,
  Cookie,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trash2,
  Clock,
  ShoppingCart,
  Check,
  BookOpen,
  RotateCcw,
  Tag,
} from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { trpc } from "@/lib/trpc";

// ─── Types ─────────────────────────────────────────────────────
type PageTab = "log" | "library" | "shopping";
type MealCategory = "breakfast" | "lunch" | "dinner" | "snack";

interface PlanMeal {
  id: string;
  name: string;
  category: MealCategory;
  prepTimeMinutes: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  ingredients: { name: string; amount: string; category: string }[];
  instructions: string;
  tags: string[];
  rationale: string;
}

interface MealLibrary {
  libraryName: string;
  description: string;
  dailyTargets: { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number };
  meals: PlanMeal[];
}

const MEAL_TYPE_META: Record<MealCategory, { label: string; icon: typeof Coffee }> = {
  breakfast: { label: "Breakfast", icon: Coffee },
  lunch: { label: "Lunch", icon: Sun },
  dinner: { label: "Dinner", icon: Moon },
  snack: { label: "Snacks", icon: Cookie },
};

const INGREDIENT_CATEGORIES = ["Produce", "Protein", "Dairy", "Pantry", "Frozen", "Other"] as const;

// ─── Circular Progress Ring ───────────────────────────────────
function MacroRing({ pct, label, value }: { pct: number; label: string; value: string }) {
  const c = 2 * Math.PI * 45;
  const offset = c - (Math.min(pct, 100) / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24 mb-1.5">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-kairos-royal-surface" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6"
            strokeDasharray={c} strokeDashoffset={offset}
            className="text-kairos-gold transition-all duration-500" strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold text-kairos-gold">{Math.round(pct)}%</span>
          <span className="text-[10px] text-kairos-silver-dark">{value}</span>
        </div>
      </div>
      <p className="text-xs font-body text-kairos-silver-dark">{label}</p>
    </div>
  );
}

// ─── Log Meal Modal ──────────────────────────────────────────
function LogMealModal({
  planMeals,
  onClose,
  onSave,
  isSaving,
}: {
  planMeals: PlanMeal[];
  onClose: () => void;
  onSave: (data: { mealType: MealCategory; items: { foodId: string; name: string; quantity: number; unit: string; calories: number; protein: number; carbs: number; fat: number }[] }) => void;
  isSaving: boolean;
}) {
  const [mealType, setMealType] = useState<MealCategory>("breakfast");
  const [mode, setMode] = useState<"manual" | "plan">("manual");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const filteredPlanMeals = planMeals.filter((m) => m.category === mealType);

  const handlePickPlan = (m: PlanMeal) => {
    onSave({
      mealType,
      items: [{ foodId: m.id, name: m.name, quantity: 1, unit: "serving", calories: m.calories, protein: m.proteinG, carbs: m.carbsG, fat: m.fatG }],
    });
  };

  const handleManualSave = () => {
    if (!name.trim()) return;
    onSave({
      mealType,
      items: [{ foodId: crypto.randomUUID(), name: name.trim(), quantity: 1, unit: "serving", calories: Number(calories) || 0, protein: Number(protein) || 0, carbs: Number(carbs) || 0, fat: Number(fat) || 0 }],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-kairos-royal-surface border border-kairos-border rounded-kairos-sm max-w-lg w-full max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-kairos-border sticky top-0 bg-kairos-royal-surface z-10">
          <h3 className="font-heading font-bold text-lg text-white">Log Meal</h3>
          <button onClick={onClose} className="text-kairos-silver-dark hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Meal type */}
          <div>
            <label className="block text-xs font-heading font-semibold text-kairos-silver-dark mb-1.5">Meal Type</label>
            <select value={mealType} onChange={(e) => setMealType(e.target.value as MealCategory)}
              className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none">
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          {/* Mode toggle */}
          {planMeals.length > 0 && (
            <div className="flex gap-1 bg-kairos-card rounded-kairos-sm p-1">
              <button onClick={() => setMode("manual")}
                className={`flex-1 px-3 py-1.5 text-xs font-heading font-semibold rounded-kairos-sm transition-colors ${mode === "manual" ? "bg-kairos-gold text-kairos-royal-dark" : "text-kairos-silver-dark hover:text-white"}`}>
                Manual Entry
              </button>
              <button onClick={() => setMode("plan")}
                className={`flex-1 px-3 py-1.5 text-xs font-heading font-semibold rounded-kairos-sm transition-colors ${mode === "plan" ? "bg-kairos-gold text-kairos-royal-dark" : "text-kairos-silver-dark hover:text-white"}`}>
                Pick from Plan
              </button>
            </div>
          )}

          {mode === "manual" ? (
            <>
              <div>
                <label className="block text-xs font-heading font-semibold text-kairos-silver-dark mb-1.5">Food Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grilled chicken salad"
                  className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: "Calories", v: calories, s: setCalories },
                  { l: "Protein (g)", v: protein, s: setProtein },
                  { l: "Carbs (g)", v: carbs, s: setCarbs },
                  { l: "Fat (g)", v: fat, s: setFat },
                ].map((f) => (
                  <div key={f.l}>
                    <label className="block text-xs font-heading font-semibold text-kairos-silver-dark mb-1.5">{f.l}</label>
                    <input type="number" value={f.v} onChange={(e) => f.s(e.target.value)} placeholder="0"
                      className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredPlanMeals.length === 0 ? (
                <p className="text-sm text-kairos-silver-dark text-center py-6 italic">No {MEAL_TYPE_META[mealType].label.toLowerCase()} meals in your plan</p>
              ) : filteredPlanMeals.map((m) => (
                <button key={m.id} onClick={() => handlePickPlan(m)} disabled={isSaving}
                  className="w-full text-left border border-kairos-border rounded-kairos-sm p-3 hover:border-kairos-gold/60 transition-colors disabled:opacity-50">
                  <p className="text-sm font-heading font-semibold text-white">{m.name}</p>
                  <p className="text-xs text-kairos-silver-dark mt-0.5">{m.calories} kcal &middot; P:{m.proteinG}g C:{m.carbsG}g F:{m.fatG}g</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {mode === "manual" && (
          <div className="flex gap-3 p-5 border-t border-kairos-border">
            <button onClick={onClose} disabled={isSaving} className="flex-1 kairos-btn-outline disabled:opacity-50">Cancel</button>
            <button onClick={handleManualSave} disabled={isSaving || !name.trim()} className="flex-1 kairos-btn-gold disabled:opacity-50">
              {isSaving ? "Saving..." : "Save Meal"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function NutritionPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } = useDateRange({ initialPeriod: "day" });
  const utils = trpc.useUtils();

  // ─── Page tab state ────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<PageTab>("log");
  const [showLogModal, setShowLogModal] = useState(false);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // ─── Date range for tRPC ───────────────────────────────────
  const range = useMemo(() => ({
    startDate: dateRange.startDate.toISOString().split("T")[0],
    endDate: dateRange.endDate.toISOString().split("T")[0],
  }), [dateRange]);

  // ─── tRPC Queries ──────────────────────────────────────────
  const mealsQuery = trpc.clientPortal.nutrition.listMeals.useQuery(range);
  const summaryQuery = trpc.clientPortal.nutrition.dailySummary.useQuery(range);
  const planQuery = trpc.clientPortal.nutrition.getActivePlan.useQuery();

  // ─── tRPC Mutations ────────────────────────────────────────
  const logMealMut = trpc.clientPortal.nutrition.logMeal.useMutation({
    onSuccess: () => {
      setShowLogModal(false);
      utils.clientPortal.nutrition.listMeals.invalidate();
      utils.clientPortal.nutrition.dailySummary.invalidate();
    },
  });

  const savePlanMut = trpc.clientPortal.nutrition.savePlan.useMutation({
    onSuccess: () => {
      utils.clientPortal.nutrition.getActivePlan.invalidate();
    },
  });

  const deletePlanMut = trpc.clientPortal.nutrition.deletePlan.useMutation({
    onSuccess: () => {
      utils.clientPortal.nutrition.getActivePlan.invalidate();
    },
  });

  // ─── Derived data ──────────────────────────────────────────
  const meals = mealsQuery.data ?? [];
  const plan = planQuery.data;
  const library: MealLibrary | null = plan?.meals ? (plan.meals as unknown as MealLibrary) : null;
  const planMeals: PlanMeal[] = library?.meals ?? [];

  const targets = library?.dailyTargets ?? (plan?.macroTargets as MealLibrary["dailyTargets"] | null) ?? { calories: 2000, proteinG: 150, carbsG: 150, fatG: 70, fiberG: 30 };

  const daySummary = useMemo(() => {
    const data = summaryQuery.data ?? [];
    if (data.length === 0) return { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
    const totCal = data.reduce((s, d) => s + d.totalCalories, 0);
    const totP = data.reduce((s, d) => s + d.totalProtein, 0);
    const totC = data.reduce((s, d) => s + d.totalCarbs, 0);
    const totF = data.reduce((s, d) => s + d.totalFat, 0);
    const days = data.length || 1;
    if (period === "day") return { totalCalories: totCal, totalProtein: totP, totalCarbs: totC, totalFat: totF };
    return { totalCalories: Math.round(totCal / days), totalProtein: Math.round(totP / days), totalCarbs: Math.round(totC / days), totalFat: Math.round(totF / days) };
  }, [summaryQuery.data, period]);

  const mealsByType = useMemo(() => {
    const grouped: Record<MealCategory, typeof meals> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    meals.forEach((m) => { if (grouped[m.mealType as MealCategory]) grouped[m.mealType as MealCategory].push(m); });
    return grouped;
  }, [meals]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleLogMeal = (data: { mealType: MealCategory; items: { foodId: string; name: string; quantity: number; unit: string; calories: number; protein: number; carbs: number; fat: number }[] }) => {
    logMealMut.mutate({ date: range.startDate, mealType: data.mealType, items: data.items });
  };

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/meals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userRequest: "Create a personalized meal library based on all my health data." }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Generation failed");
      await savePlanMut.mutateAsync({ name: json.library.libraryName ?? "AI Meal Library", meals: json.library, isAiGenerated: true });
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }, [savePlanMut]);

  const handleDeletePlan = () => {
    if (!plan) return;
    deletePlanMut.mutate({ planId: plan.id });
  };

  // ─── Shopping list derived from plan ───────────────────────
  const shoppingList = useMemo(() => {
    if (!planMeals.length) return [];
    const map = new Map<string, { name: string; amount: string; category: string }>();
    planMeals.forEach((m) =>
      m.ingredients?.forEach((ing) => {
        const key = ing.name.toLowerCase();
        if (!map.has(key)) map.set(key, { name: ing.name, amount: ing.amount, category: ing.category ?? "other" });
        else {
          const existing = map.get(key)!;
          map.set(key, { ...existing, amount: `${existing.amount}; ${ing.amount}` });
        }
      })
    );
    return Array.from(map.values());
  }, [planMeals]);

  const groupedIngredients = useMemo(() => {
    const groups: Record<string, typeof shoppingList> = {};
    INGREDIENT_CATEGORIES.forEach((c) => { groups[c] = []; });
    shoppingList.forEach((item) => {
      const cat = INGREDIENT_CATEGORIES.find((c) => c.toLowerCase() === item.category.toLowerCase()) ?? "Other";
      groups[cat].push(item);
    });
    return groups;
  }, [shoppingList]);

  const totalItems = shoppingList.length;
  const remaining = totalItems - checkedItems.size;

  const toggleCheck = (name: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl text-white mb-1">Nutrition</h1>
        <p className="text-sm font-body text-kairos-silver-dark">Track meals, build your library, and plan your shopping.</p>
      </div>

      {/* Page Tabs */}
      <div className="flex gap-1 bg-kairos-card rounded-kairos-sm p-1">
        {([
          { key: "log" as PageTab, label: "Daily Log", icon: UtensilsCrossed },
          { key: "library" as PageTab, label: "Meal Library", icon: BookOpen },
          { key: "shopping" as PageTab, label: "Shopping List", icon: ShoppingCart },
        ]).map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-heading font-semibold rounded-kairos-sm transition-colors ${activeTab === t.key ? "bg-kairos-gold text-kairos-royal-dark" : "text-kairos-silver-dark hover:text-white"}`}>
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TAB 1: DAILY LOG
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === "log" && (
        <>
          <DateRangeNavigator
            availablePeriods={["day", "week", "month"]}
            selectedPeriod={period} onPeriodChange={setPeriod}
            formattedRange={formattedRange} isCurrent={isCurrent} canForward={canForward}
            onBack={goBack} onForward={goForward} onToday={goToToday}
          />

          {/* Macro Summary Cards */}
          <div className="kairos-card">
            <div className="flex items-center gap-2 mb-5">
              <Target className="w-5 h-5 text-kairos-gold" />
              <h2 className="font-heading font-bold text-lg text-white">
                {period === "day" ? "Today's Macros" : `Avg Daily Macros`}
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MacroRing pct={(daySummary.totalCalories / targets.calories) * 100} label="Calories" value={`${daySummary.totalCalories}/${targets.calories}`} />
              <MacroRing pct={(daySummary.totalProtein / targets.proteinG) * 100} label="Protein" value={`${daySummary.totalProtein}/${targets.proteinG}g`} />
              <MacroRing pct={(daySummary.totalCarbs / targets.carbsG) * 100} label="Carbs" value={`${daySummary.totalCarbs}/${targets.carbsG}g`} />
              <MacroRing pct={(daySummary.totalFat / targets.fatG) * 100} label="Fat" value={`${daySummary.totalFat}/${targets.fatG}g`} />
            </div>
          </div>

          {/* Meal log grouped by type */}
          <div className="kairos-card">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-kairos-gold" />
                <h2 className="font-heading font-bold text-lg text-white">Meals</h2>
              </div>
              <button onClick={() => setShowLogModal(true)} className="kairos-btn-gold flex items-center gap-1.5 text-xs px-3 py-1.5">
                <Plus className="w-3.5 h-3.5" /> Log Meal
              </button>
            </div>

            {mealsQuery.isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-kairos-gold" /></div>
            ) : meals.length === 0 ? (
              <p className="text-sm text-kairos-silver-dark text-center py-8 italic">No meals logged for this period.</p>
            ) : (
              <div className="space-y-3">
                {(["breakfast", "lunch", "dinner", "snack"] as MealCategory[]).map((type) => {
                  const items = mealsByType[type];
                  if (items.length === 0) return null;
                  const meta = MEAL_TYPE_META[type];
                  const Icon = meta.icon;
                  const totalCal = items.reduce((s, m) => s + (m.totalCalories ?? 0), 0);

                  return (
                    <div key={type} className="border border-kairos-border rounded-kairos-sm bg-kairos-royal-surface/50">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-kairos-gold/10 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-kairos-gold" />
                          </div>
                          <div>
                            <h3 className="font-heading font-semibold text-white text-sm">{meta.label}</h3>
                            <p className="text-xs text-kairos-silver-dark">{items.length} {items.length === 1 ? "entry" : "entries"}</p>
                          </div>
                        </div>
                        <span className="text-kairos-gold font-bold text-sm font-heading">{Math.round(totalCal)} kcal</span>
                      </div>
                      <div className="px-4 pb-3 space-y-1.5">
                        {items.map((m) => {
                          const mealItems = (m.items as { name: string }[] | null) ?? [];
                          return (
                            <div key={m.id} className="flex items-center justify-between text-xs">
                              <span className="text-kairos-silver-dark font-body">
                                {mealItems.map((i) => i.name).join(", ") || "Meal logged"}
                              </span>
                              <span className="text-kairos-silver-dark font-body whitespace-nowrap ml-3">
                                P:{m.totalProtein ?? 0}g C:{m.totalCarbs ?? 0}g F:{m.totalFat ?? 0}g
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 2: MEAL LIBRARY
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === "library" && (
        <div className="space-y-6">
          {planQuery.isLoading ? (
            <div className="kairos-card flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-kairos-gold" /></div>
          ) : !library ? (
            /* No plan CTA */
            <div className="kairos-card flex flex-col items-center py-16 text-center">
              <Sparkles className="w-12 h-12 text-kairos-gold mb-4" />
              <h2 className="font-heading font-bold text-xl text-white mb-2">Generate Your AI Meal Library</h2>
              <p className="text-sm text-kairos-silver-dark font-body max-w-md mb-6">
                We will analyze your health data, genetics, lab results, and goals to create a fully personalized meal library with recipes, macros, and shopping lists.
              </p>
              {genError && <p className="text-sm text-red-400 mb-4">{genError}</p>}
              <button onClick={handleGenerate} disabled={generating}
                className="kairos-btn-gold flex items-center gap-2 px-6 py-2.5 disabled:opacity-50">
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate AI Meal Library</>}
              </button>
            </div>
          ) : (
            <>
              {/* Library header */}
              <div className="kairos-card">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-heading font-bold text-lg text-white">{library.libraryName}</h2>
                    {library.description && <p className="text-sm text-kairos-silver-dark font-body mt-1">{library.description}</p>}
                    <p className="text-xs text-kairos-silver-dark font-body mt-2">
                      {planMeals.length} meals &middot; {library.dailyTargets.calories} kcal/day target
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleGenerate} disabled={generating || deletePlanMut.isPending}
                      className="kairos-btn-outline flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-50">
                      {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Regenerate
                    </button>
                    <button onClick={handleDeletePlan} disabled={deletePlanMut.isPending || generating}
                      className="kairos-btn-outline flex items-center gap-1.5 text-xs px-3 py-1.5 text-red-400 border-red-400/30 hover:bg-red-400/10 disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>

              {genError && <p className="text-sm text-red-400">{genError}</p>}

              {/* Meals grouped by category */}
              {(["breakfast", "lunch", "dinner", "snack"] as MealCategory[]).map((cat) => {
                const catMeals = planMeals.filter((m) => m.category === cat);
                if (catMeals.length === 0) return null;
                const meta = MEAL_TYPE_META[cat];
                const CatIcon = meta.icon;
                return (
                  <div key={cat}>
                    <div className="flex items-center gap-2 mb-3">
                      <CatIcon className="w-4 h-4 text-kairos-gold" />
                      <h3 className="font-heading font-bold text-white">{meta.label}</h3>
                      <span className="text-xs text-kairos-silver-dark">({catMeals.length})</span>
                    </div>
                    <div className="space-y-2">
                      {catMeals.map((meal) => {
                        const isExpanded = expandedMealId === meal.id;
                        return (
                          <div key={meal.id} className="kairos-card !p-0 overflow-hidden">
                            <button onClick={() => setExpandedMealId(isExpanded ? null : meal.id)}
                              className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.02] transition-colors">
                              <div className="flex-1 min-w-0">
                                <p className="font-heading font-semibold text-white text-sm truncate">{meal.name}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-kairos-silver-dark">
                                  <span className="text-kairos-gold font-semibold">{meal.calories} kcal</span>
                                  <span>P:{meal.proteinG}g</span>
                                  <span>C:{meal.carbsG}g</span>
                                  <span>F:{meal.fatG}g</span>
                                  {meal.prepTimeMinutes > 0 && (
                                    <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{meal.prepTimeMinutes}m</span>
                                  )}
                                </div>
                                {meal.tags?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {meal.tags.slice(0, 4).map((tag) => (
                                      <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-kairos-gold/10 text-kairos-gold">
                                        <Tag className="w-2.5 h-2.5" />{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-kairos-silver-dark shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-kairos-silver-dark shrink-0 ml-2" />}
                            </button>

                            {isExpanded && (
                              <div className="px-4 pb-4 border-t border-kairos-border/50 space-y-4 pt-3">
                                {/* Ingredients */}
                                {meal.ingredients?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-heading font-semibold text-kairos-gold mb-1.5">Ingredients</p>
                                    <ul className="text-sm text-kairos-silver-dark font-body space-y-0.5">
                                      {meal.ingredients.map((ing, i) => (
                                        <li key={i}><span className="text-kairos-gold/60 mr-1">&bull;</span>{ing.amount} {ing.name}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {/* Instructions */}
                                {meal.instructions && (
                                  <div>
                                    <p className="text-xs font-heading font-semibold text-kairos-gold mb-1.5">Instructions</p>
                                    <p className="text-sm text-kairos-silver-dark font-body whitespace-pre-line">{meal.instructions}</p>
                                  </div>
                                )}
                                {/* Rationale */}
                                {meal.rationale && (
                                  <div>
                                    <p className="text-xs font-heading font-semibold text-kairos-gold mb-1.5">Why This Meal</p>
                                    <p className="text-sm text-kairos-silver-dark font-body">{meal.rationale}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          TAB 3: SHOPPING LIST
         ═══════════════════════════════════════════════════════════ */}
      {activeTab === "shopping" && (
        <div className="space-y-6">
          {planQuery.isLoading ? (
            <div className="kairos-card flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-kairos-gold" /></div>
          ) : !library || shoppingList.length === 0 ? (
            <div className="kairos-card flex flex-col items-center py-16 text-center">
              <ShoppingCart className="w-12 h-12 text-kairos-silver-dark/40 mb-4" />
              <h2 className="font-heading font-bold text-lg text-white mb-2">No Shopping List</h2>
              <p className="text-sm text-kairos-silver-dark font-body max-w-sm">
                Generate a meal library first. Your shopping list will be auto-created from the ingredients.
              </p>
            </div>
          ) : (
            <>
              {/* Summary bar */}
              <div className="kairos-card flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-bold text-lg text-white">Shopping List</h2>
                  <p className="text-xs text-kairos-silver-dark font-body mt-0.5">
                    {remaining} of {totalItems} items remaining
                  </p>
                </div>
                <button onClick={() => setCheckedItems(new Set())}
                  className="kairos-btn-outline text-xs px-3 py-1.5">
                  Clear All
                </button>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-kairos-royal-surface rounded-full overflow-hidden">
                <div className="h-full bg-kairos-gold transition-all duration-300 rounded-full"
                  style={{ width: `${totalItems > 0 ? ((totalItems - remaining) / totalItems) * 100 : 0}%` }} />
              </div>

              {/* Categories */}
              {INGREDIENT_CATEGORIES.map((cat) => {
                const items = groupedIngredients[cat];
                if (!items || items.length === 0) return null;
                return (
                  <div key={cat} className="kairos-card">
                    <h3 className="font-heading font-bold text-white text-sm mb-3">{cat}</h3>
                    <div className="space-y-1.5">
                      {items.map((item) => {
                        const key = item.name.toLowerCase();
                        const done = checkedItems.has(key);
                        return (
                          <button key={key} onClick={() => toggleCheck(key)}
                            className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-kairos-sm transition-colors ${done ? "bg-kairos-gold/5" : "hover:bg-white/[0.02]"}`}>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${done ? "border-kairos-gold bg-kairos-gold" : "border-kairos-border"}`}>
                              {done && <Check className="w-3 h-3 text-kairos-royal-dark" />}
                            </div>
                            <span className={`text-sm font-body flex-1 ${done ? "line-through text-kairos-silver-dark/50" : "text-white"}`}>{item.name}</span>
                            <span className={`text-xs font-body ${done ? "text-kairos-silver-dark/40" : "text-kairos-silver-dark"}`}>{item.amount}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Log Meal Modal */}
      {showLogModal && (
        <LogMealModal
          planMeals={planMeals}
          onClose={() => setShowLogModal(false)}
          onSave={handleLogMeal}
          isSaving={logMealMut.isPending}
        />
      )}
    </div>
  );
}
