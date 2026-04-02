"use client";

import { useState } from "react";
import {
  Apple,
  Droplets,
  Flame,
  Target,
  TrendingUp,
  CheckCircle,
  UtensilsCrossed,
  Plus,
  X,
  Camera,
} from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useNutrition } from "@/hooks/client/useNutrition";
import { trpc } from "@/lib/trpc";

// ─── Meal data types ────────────────────────────────────────────
interface MealEntry {
  name: string;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Default meal templates shown when no logged meals exist for the day.
 * Once real meal data is available from the DB, these are replaced.
 */
const DEFAULT_MEALS: MealEntry[] = [
  { name: "Breakfast", items: ["Greek yogurt with berries", "Bulletproof coffee", "Walnuts"], calories: 420, protein: 32, carbs: 18, fat: 24 },
  { name: "Lunch", items: ["Grilled chicken salad with olive oil", "Avocado", "Mixed nuts"], calories: 580, protein: 48, carbs: 22, fat: 32 },
  { name: "Dinner", items: ["Grass-fed beef steak", "Mixed green salad with olive oil", "Asparagus"], calories: 520, protein: 52, carbs: 16, fat: 28 },
  { name: "Snacks", items: ["Macadamia nuts", "Grass-fed beef jerky"], calories: 160, protein: 16, carbs: 6, fat: 9 },
];

interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealFormState {
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  photo: File | null;
  foodItems: FoodItem[];
  notes: string;
}

export default function NutritionPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "day" });

  const [waterGlasses, setWaterGlasses] = useState(6);
  const waterTarget = 8;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState<MealFormState>({
    mealType: "breakfast",
    photo: null,
    foodItems: [{ id: "1", name: "", quantity: 1, unit: "g", calories: 0, protein: 0, carbs: 0, fat: 0 }],
    notes: "",
  });

  const { records: nutritionData, stats: nutritionStats } = useNutrition(dateRange);
  const stats = nutritionStats;

  const macros = {
    calories: { target: 2000, actual: stats.calories, unit: "kcal", label: "Calories" },
    protein: { target: 150, actual: stats.protein, unit: "g", label: "Protein" },
    carbs: { target: 100, actual: stats.carbs, unit: "g", label: "Carbs" },
    fat: { target: 120, actual: stats.fat, unit: "g", label: "Fat" },
  };

  const meals = DEFAULT_MEALS;

  const calculatePercentage = (actual: number, target: number) => Math.min((actual / target) * 100, 100);

  // tRPC mutation for saving meals
  const saveMealMutation = trpc.clientPortal.meals.add.useMutation({
    onSuccess: () => {
      handleCloseModal();
    },
  });

  const handleAddMeal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormState({
      mealType: "breakfast",
      photo: null,
      foodItems: [{ id: "1", name: "", quantity: 1, unit: "g", calories: 0, protein: 0, carbs: 0, fat: 0 }],
      notes: "",
    });
  };

  const handleAddFoodItem = () => {
    const newItem: FoodItem = {
      id: Date.now().toString(),
      name: "",
      quantity: 1,
      unit: "g",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    setFormState({
      ...formState,
      foodItems: [...formState.foodItems, newItem],
    });
  };

  const handleRemoveFoodItem = (id: string) => {
    setFormState({
      ...formState,
      foodItems: formState.foodItems.filter((item) => item.id !== id),
    });
  };

  const handleFoodItemChange = (id: string, field: keyof FoodItem, value: any) => {
    setFormState({
      ...formState,
      foodItems: formState.foodItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormState({
        ...formState,
        photo: e.target.files[0],
      });
    }
  };

  const handleSaveMeal = async () => {
    // Calculate totals
    const totalCalories = formState.foodItems.reduce((sum, item) => sum + item.calories, 0);
    const totalProtein = formState.foodItems.reduce((sum, item) => sum + item.protein, 0);
    const totalCarbs = formState.foodItems.reduce((sum, item) => sum + item.carbs, 0);
    const totalFat = formState.foodItems.reduce((sum, item) => sum + item.fat, 0);

    // Convert form state to mutation input
    saveMealMutation.mutate({
      date: dateRange.startDate instanceof Date ? dateRange.startDate.toISOString().split("T")[0] : String(dateRange.startDate),
      mealType: formState.mealType,
      items: formState.foodItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      })),
      photoUrl: formState.photo ? URL.createObjectURL(formState.photo) : undefined,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalFiber: 0, // Could be enhanced to calculate from items
    });
  };

  const renderCircularProgress = (percentage: number, label: string, value: string) => {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-28 h-28 mb-2">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-kairos-royal-surface" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              className="text-kairos-gold transition-all duration-500" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-kairos-gold">{Math.round(percentage)}%</span>
            <span className="text-xs text-kairos-silver-dark">{value}</span>
          </div>
        </div>
        <p className="text-sm font-body text-kairos-silver-dark">{label}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-3xl text-white mb-2">Nutrition Protocol</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-heading font-semibold px-3 py-1 rounded-full bg-kairos-gold/20 text-kairos-gold">Mediterranean-Keto Hybrid</span>
          <span className="text-xs font-body text-kairos-silver-dark">Optimized for longevity</span>
        </div>
      </div>

      <DateRangeNavigator
        availablePeriods={["day", "week", "month"]}
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        formattedRange={formattedRange}
        isCurrent={isCurrent}
        canForward={canForward}
        onBack={goBack}
        onForward={goForward}
        onToday={goToToday}
      />

      {/* Daily Macros Progress */}
      <div className="kairos-card">
        <div className="flex items-center gap-2 mb-6">
          <Target className="w-5 h-5 text-kairos-gold" />
          <h2 className="font-heading font-bold text-lg text-white">
            {period === "day" ? "Today\u0027s Macros" : `Avg Daily Macros — ${formattedRange}`}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(macros).map(([key, macro]) => (
            <div key={key}>
              {renderCircularProgress(
                calculatePercentage(macro.actual, macro.target),
                macro.label,
                `${macro.actual}/${macro.target}${macro.unit}`
              )}
            </div>
          ))}
        </div>
      </div>

      {/* DAY VIEW: Meal log */}
      {period === "day" && (
        <div className="kairos-card">
          <div className="flex items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-kairos-gold" />
              <h2 className="font-heading font-bold text-lg text-white">Meal Log</h2>
            </div>
            <button
              onClick={handleAddMeal}
              className="kairos-btn-gold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Meal
            </button>
          </div>
          <div className="space-y-4">
            {meals.map((meal, idx) => (
              <div key={idx} className="border border-kairos-border rounded-kairos-sm bg-kairos-royal-surface/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading font-semibold text-white">{meal.name}</h3>
                  <span className="text-kairos-gold font-bold text-sm">{meal.calories} kcal</span>
                </div>
                <ul className="text-sm text-kairos-silver-dark font-body mb-3 space-y-1">
                  {meal.items.map((item, i) => (<li key={i}>• {item}</li>))}
                </ul>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-kairos-royal-surface rounded px-2 py-1"><span className="text-kairos-silver-dark">P: </span><span className="text-kairos-gold font-semibold">{meal.protein}g</span></div>
                  <div className="bg-kairos-royal-surface rounded px-2 py-1"><span className="text-kairos-silver-dark">C: </span><span className="text-kairos-gold font-semibold">{meal.carbs}g</span></div>
                  <div className="bg-kairos-royal-surface rounded px-2 py-1"><span className="text-kairos-silver-dark">F: </span><span className="text-kairos-gold font-semibold">{meal.fat}g</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WEEK/MONTH VIEW: Daily nutrition trend */}
      {(period === "week" || period === "month") && (
        <div className="kairos-card">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-bold text-lg text-white">Daily Calorie Trend — {formattedRange}</h2>
          </div>
          <div className="space-y-2">
            {nutritionData.slice(0, period === "week" ? 7 : 30).map((day, i) => {
              const pct = Math.min((day.calories / 2500) * 100, 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-heading text-kairos-silver-dark w-10">{day.dateLabel}</span>
                  <div className="flex-1 h-6 bg-kairos-royal-surface rounded-kairos-sm overflow-hidden relative">
                    <div className="h-full bg-kairos-gold/30 rounded-kairos-sm" style={{ width: `${pct}%` }} />
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-heading font-semibold text-white">{day.calories} kcal</span>
                  </div>
                  <span className="text-xs font-body text-kairos-silver-dark w-16 text-right">P:{day.protein}g</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="kairos-card">
          <div className="flex items-center gap-2 mb-4">
            <Apple className="w-5 h-5 text-kairos-gold" />
            <h3 className="font-heading font-bold text-white">Dietary Guidelines</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-heading font-semibold text-kairos-gold mb-2">Foods to Emphasize</p>
              <ul className="text-sm text-kairos-silver-dark font-body space-y-1">
                <li>✓ Fatty fish (salmon, mackerel, sardines) - high omega-3</li>
                <li>✓ Anti-inflammatory vegetables (broccoli, leafy greens)</li>
                <li>✓ Grass-fed beef and pasture-raised eggs</li>
                <li>✓ Nuts and seeds (almonds, macadamia)</li>
                <li>✓ Extra virgin olive oil for healthy fats</li>
              </ul>
            </div>
            <div className="border-t border-kairos-border pt-4">
              <p className="text-xs font-heading font-semibold text-kairos-gold mb-2">Foods to Minimize</p>
              <ul className="text-sm text-kairos-silver-dark font-body space-y-1">
                <li>✕ Refined carbohydrates and sugar</li>
                <li>✕ Seed oils (soybean, canola, sunflower)</li>
                <li>✕ Processed foods and ultra-processed ingredients</li>
                <li>✕ High-sugar fruits (limit dried fruits)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="kairos-card">
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-5 h-5 text-kairos-gold" />
            <h3 className="font-heading font-bold text-white">Hydration Tracker</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="grid grid-cols-4 gap-2 mb-6">
              {Array.from({ length: waterTarget }).map((_, i) => (
                <button key={i} onClick={() => setWaterGlasses(i + 1)}
                  className={`w-12 h-12 rounded-kairos-sm border-2 transition-all ${i < waterGlasses ? "bg-kairos-gold border-kairos-gold" : "border-kairos-border bg-kairos-royal-surface hover:border-kairos-gold"}`}
                  title={`Glass ${i + 1}`}
                >
                  <Droplets className={`w-5 h-5 mx-auto ${i < waterGlasses ? "text-kairos-royal" : "text-kairos-silver-dark"}`} />
                </button>
              ))}
            </div>
            <p className="text-center">
              <span className="text-2xl font-heading font-bold text-kairos-gold">{waterGlasses}</span>
              <span className="text-kairos-silver-dark font-body text-sm"> / {waterTarget} glasses</span>
            </p>
            <p className="text-xs text-kairos-silver-dark font-body mt-3">
              {waterGlasses >= waterTarget ? (
                <span className="flex items-center gap-1 text-kairos-gold"><CheckCircle className="w-4 h-4" /> Hydration goal met!</span>
              ) : (
                <span>{waterTarget - waterGlasses} more glasses to goal</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="kairos-card">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-kairos-gold" />
          <h3 className="font-heading font-bold text-white">Daily Summary</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div className="bg-kairos-royal-surface rounded-kairos-sm p-3">
            <p className="text-xs text-kairos-silver-dark font-body mb-1">Avg Calories</p>
            <p className="text-2xl font-heading font-bold text-kairos-gold">{stats.calories} / 2000</p>
            <p className="text-xs text-kairos-silver-dark font-body mt-1">{Math.round((stats.calories / 2000) * 100)}% of target</p>
          </div>
          <div className="bg-kairos-royal-surface rounded-kairos-sm p-3">
            <p className="text-xs text-kairos-silver-dark font-body mb-1">Macro Balance</p>
            <p className="text-2xl font-heading font-bold text-kairos-gold">94% Score</p>
            <p className="text-xs text-kairos-silver-dark font-body mt-1">Excellent adherence</p>
          </div>
          <div className="bg-kairos-royal-surface rounded-kairos-sm p-3">
            <p className="text-xs text-kairos-silver-dark font-body mb-1">Meal Frequency</p>
            <p className="text-2xl font-heading font-bold text-kairos-gold">4 Meals</p>
            <p className="text-xs text-kairos-silver-dark font-body mt-1">Well distributed</p>
          </div>
        </div>
      </div>

      {/* Add Meal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-kairos-royal-surface border border-kairos-border rounded-kairos-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-kairos-border sticky top-0 bg-kairos-royal-surface">
              <h3 className="font-heading font-bold text-xl text-white">Add Meal</h3>
              <button
                onClick={handleCloseModal}
                className="text-kairos-silver-dark hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Meal Type */}
              <div>
                <label className="block text-sm font-heading font-semibold text-white mb-2">
                  Meal Type
                </label>
                <select
                  value={formState.mealType}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      mealType: e.target.value as "breakfast" | "lunch" | "dinner" | "snack",
                    })
                  }
                  className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-heading font-semibold text-white mb-2">
                  Photo
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="border-2 border-dashed border-kairos-border rounded-kairos-sm p-6 text-center hover:border-kairos-gold transition-colors cursor-pointer">
                    <Camera className="w-8 h-8 text-kairos-gold mx-auto mb-2" />
                    <p className="text-sm text-white font-body">
                      {formState.photo ? formState.photo.name : "Click to upload photo"}
                    </p>
                    <p className="text-xs text-kairos-silver-dark font-body">or drag and drop</p>
                  </div>
                </div>
              </div>

              {/* Food Items */}
              <div>
                <label className="block text-sm font-heading font-semibold text-white mb-3">
                  Food Items
                </label>
                <div className="space-y-4">
                  {formState.foodItems.map((item) => (
                    <div
                      key={item.id}
                      className="border border-kairos-border rounded-kairos-sm p-4 bg-kairos-royal-surface/50"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        {/* Food Name */}
                        <input
                          type="text"
                          placeholder="Food name"
                          value={item.name}
                          onChange={(e) =>
                            handleFoodItemChange(item.id, "name", e.target.value)
                          }
                          className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                        />

                        {/* Quantity + Unit */}
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) =>
                              handleFoodItemChange(item.id, "quantity", parseFloat(e.target.value))
                            }
                            className="flex-1 bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                          />
                          <select
                            value={item.unit}
                            onChange={(e) =>
                              handleFoodItemChange(item.id, "unit", e.target.value)
                            }
                            className="w-16 bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-2 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                          >
                            <option value="g">g</option>
                            <option value="oz">oz</option>
                            <option value="ml">ml</option>
                            <option value="cup">cup</option>
                            <option value="tbsp">tbsp</option>
                            <option value="tsp">tsp</option>
                          </select>
                        </div>
                      </div>

                      {/* Macros */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        <input
                          type="number"
                          placeholder="Calories"
                          value={item.calories}
                          onChange={(e) =>
                            handleFoodItemChange(item.id, "calories", parseFloat(e.target.value))
                          }
                          className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Protein (g)"
                          value={item.protein}
                          onChange={(e) =>
                            handleFoodItemChange(item.id, "protein", parseFloat(e.target.value))
                          }
                          className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Carbs (g)"
                          value={item.carbs}
                          onChange={(e) =>
                            handleFoodItemChange(item.id, "carbs", parseFloat(e.target.value))
                          }
                          className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                        />
                        <input
                          type="number"
                          placeholder="Fat (g)"
                          value={item.fat}
                          onChange={(e) =>
                            handleFoodItemChange(item.id, "fat", parseFloat(e.target.value))
                          }
                          className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                        />
                      </div>

                      {/* Remove Button */}
                      {formState.foodItems.length > 1 && (
                        <button
                          onClick={() => handleRemoveFoodItem(item.id)}
                          className="w-full kairos-btn-outline flex items-center justify-center gap-2 text-xs"
                        >
                          <X className="w-3 h-3" />
                          Remove Item
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Food Item Button */}
                <button
                  onClick={handleAddFoodItem}
                  className="w-full kairos-btn-outline flex items-center justify-center gap-2 text-sm mt-4"
                >
                  <Plus className="w-4 h-4" />
                  Add Food Item
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-heading font-semibold text-white mb-2">
                  Notes
                </label>
                <textarea
                  value={formState.notes}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Add notes about this meal..."
                  rows={3}
                  className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-kairos-border bg-kairos-royal-surface sticky bottom-0">
              <button
                onClick={handleCloseModal}
                disabled={saveMealMutation.isPending}
                className="flex-1 kairos-btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMeal}
                disabled={saveMealMutation.isPending}
                className="flex-1 kairos-btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveMealMutation.isPending ? "Saving..." : "Save Meal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
