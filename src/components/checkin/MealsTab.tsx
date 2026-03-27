'use client';

import React, { useState, useCallback } from 'react';
import { UtensilsCrossed, Camera, Plus, Trash2, ChevronDown, ChevronUp, Image } from 'lucide-react';

// ── Types ──
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

interface MealEntry {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodItem[];
  photoUrl?: string;
  aiAnalysis?: {
    estimatedCalories?: number;
    estimatedProtein?: number;
    estimatedCarbs?: number;
    estimatedFat?: number;
    foodItems?: string[];
    confidence?: number;
  };
  notes?: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface MealsTabProps {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
}

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch', label: 'Lunch', emoji: '☀️' },
  { id: 'dinner', label: 'Dinner', emoji: '🌙' },
  { id: 'snack', label: 'Snack', emoji: '🍎' },
] as const;

const uid = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

export const MealsTab: React.FC<MealsTabProps> = ({ data, onChange }) => {
  const meals = (Array.isArray(data.meals) ? data.meals : []) as MealEntry[];
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Partial<FoodItem>>({});
  const [photoMode, setPhotoMode] = useState<string | null>(null);

  const updateMeals = useCallback((updated: MealEntry[]) => {
    onChange('meals', updated);
  }, [onChange]);

  // ── Calculate totals for a meal ──
  const calcMealTotals = (items: FoodItem[]) => ({
    totalCalories: items.reduce((s, i) => s + (i.calories || 0), 0),
    totalProtein: items.reduce((s, i) => s + (i.protein || 0), 0),
    totalCarbs: items.reduce((s, i) => s + (i.carbs || 0), 0),
    totalFat: items.reduce((s, i) => s + (i.fat || 0), 0),
  });

  // ── Add a new meal slot ──
  const addMeal = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    const newMeal: MealEntry = {
      id: uid(),
      mealType,
      items: [],
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
    };
    updateMeals([...meals, newMeal]);
    setExpandedMeal(newMeal.id);
  };

  // ── Remove a meal ──
  const removeMeal = (mealId: string) => {
    updateMeals(meals.filter((m) => m.id !== mealId));
    if (expandedMeal === mealId) setExpandedMeal(null);
  };

  // ── Add food item to a meal ──
  const addFoodItem = (mealId: string) => {
    if (!newItem.name) return;
    const item: FoodItem = {
      id: uid(),
      name: newItem.name || '',
      quantity: newItem.quantity || 1,
      unit: newItem.unit || 'serving',
      calories: newItem.calories || 0,
      protein: newItem.protein || 0,
      carbs: newItem.carbs || 0,
      fat: newItem.fat || 0,
    };
    const updated = meals.map((m) => {
      if (m.id !== mealId) return m;
      const items = [...m.items, item];
      return { ...m, items, ...calcMealTotals(items) };
    });
    updateMeals(updated);
    setNewItem({});
    setAddingItem(null);
  };

  // ── Remove food item ──
  const removeFoodItem = (mealId: string, itemId: string) => {
    const updated = meals.map((m) => {
      if (m.id !== mealId) return m;
      const items = m.items.filter((i) => i.id !== itemId);
      return { ...m, items, ...calcMealTotals(items) };
    });
    updateMeals(updated);
  };

  // ── Photo upload handler (placeholder — real upload comes via tRPC) ──
  const handlePhotoUpload = (mealId: string) => {
    // In production this will trigger a file upload → S3/Cloudflare R2 → AI analysis
    // For now, toggle the photo mode to show the upload UI
    setPhotoMode(photoMode === mealId ? null : mealId);
  };

  // ── Day totals ──
  const dayTotals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.totalCalories,
      protein: acc.protein + m.totalProtein,
      carbs: acc.carbs + m.totalCarbs,
      fat: acc.fat + m.totalFat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // ── Which meal types are already added ──
  const addedTypes = new Set(meals.map((m) => m.mealType));

  return (
    <div className="space-y-6">
      {/* Header + Day Totals */}
      <div className="kairos-card space-y-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5 text-kairos-gold" />
          <h2 className="font-heading font-semibold text-white">Meals</h2>
        </div>

        {/* Day macro summary */}
        {meals.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            <div className="p-2 rounded border border-kairos-border text-center">
              <p className="text-lg font-heading font-bold text-white">{dayTotals.calories}</p>
              <p className="text-[10px] font-body text-kairos-silver-dark uppercase">Calories</p>
            </div>
            <div className="p-2 rounded border border-kairos-border text-center">
              <p className="text-lg font-heading font-bold text-kairos-gold">{dayTotals.protein}g</p>
              <p className="text-[10px] font-body text-kairos-silver-dark uppercase">Protein</p>
            </div>
            <div className="p-2 rounded border border-kairos-border text-center">
              <p className="text-lg font-heading font-bold text-blue-400">{dayTotals.carbs}g</p>
              <p className="text-[10px] font-body text-kairos-silver-dark uppercase">Carbs</p>
            </div>
            <div className="p-2 rounded border border-kairos-border text-center">
              <p className="text-lg font-heading font-bold text-green-400">{dayTotals.fat}g</p>
              <p className="text-[10px] font-body text-kairos-silver-dark uppercase">Fat</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Meal Buttons */}
      <div className="flex gap-2 flex-wrap">
        {MEAL_TYPES.map((mt) => (
          <button
            key={mt.id}
            onClick={() => addMeal(mt.id)}
            disabled={addedTypes.has(mt.id) && mt.id !== 'snack'}
            className={`flex items-center gap-2 px-3 py-2 rounded-kairos-sm border text-sm font-body transition-colors ${
              addedTypes.has(mt.id) && mt.id !== 'snack'
                ? 'border-kairos-border/50 text-kairos-silver-dark/50 cursor-not-allowed'
                : 'border-kairos-border hover:border-kairos-gold/50 text-kairos-silver hover:text-white'
            }`}
          >
            <span>{mt.emoji}</span>
            <Plus size={14} />
            {mt.label}
          </button>
        ))}
      </div>

      {/* Meal Cards */}
      {meals.map((meal) => {
        const mealConfig = MEAL_TYPES.find((mt) => mt.id === meal.mealType);
        const isExpanded = expandedMeal === meal.id;

        return (
          <div key={meal.id} className="kairos-card space-y-4">
            {/* Meal header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setExpandedMeal(isExpanded ? null : meal.id)}
                className="flex items-center gap-2 flex-1"
              >
                <span className="text-lg">{mealConfig?.emoji}</span>
                <h3 className="font-heading font-semibold text-white">{mealConfig?.label}</h3>
                <span className="text-xs font-body text-kairos-silver-dark ml-2">
                  {meal.totalCalories} cal
                </span>
                {isExpanded ? (
                  <ChevronUp size={16} className="text-kairos-silver ml-auto" />
                ) : (
                  <ChevronDown size={16} className="text-kairos-silver ml-auto" />
                )}
              </button>
              <div className="flex gap-2 ml-2">
                <button
                  onClick={() => handlePhotoUpload(meal.id)}
                  className={`p-2 rounded border transition-colors ${
                    meal.photoUrl
                      ? 'border-kairos-gold bg-kairos-gold/10 text-kairos-gold'
                      : 'border-kairos-border text-kairos-silver hover:border-kairos-gold/30'
                  }`}
                  title="Upload meal photo"
                >
                  <Camera size={16} />
                </button>
                <button
                  onClick={() => removeMeal(meal.id)}
                  className="p-2 rounded border border-kairos-border text-red-400 hover:border-red-500/50 transition-colors"
                  title="Remove meal"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Photo Upload Section */}
            {photoMode === meal.id && (
              <div className="p-4 rounded border border-dashed border-kairos-gold/30 bg-kairos-gold/5">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-kairos-gold/10 flex items-center justify-center mx-auto">
                    <Image size={28} className="text-kairos-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-body text-white">Upload a photo of your meal</p>
                    <p className="text-xs font-body text-kairos-silver-dark mt-1">
                      AI will estimate macros and identify food items
                    </p>
                  </div>
                  <button
                    className="kairos-btn-gold text-sm px-4 py-2"
                    onClick={() => {
                      // Placeholder — real upload will use file input + tRPC mutation
                      const updated = meals.map((m) =>
                        m.id === meal.id
                          ? {
                              ...m,
                              photoUrl: 'pending-upload',
                              aiAnalysis: {
                                estimatedCalories: 0,
                                foodItems: [],
                                confidence: 0,
                              },
                            }
                          : m
                      );
                      updateMeals(updated);
                      setPhotoMode(null);
                    }}
                  >
                    Choose Photo
                  </button>
                </div>
              </div>
            )}

            {/* AI Analysis Badge */}
            {meal.aiAnalysis && meal.aiAnalysis.foodItems && meal.aiAnalysis.foodItems.length > 0 && (
              <div className="p-3 rounded border border-purple-500/30 bg-purple-500/5">
                <p className="text-xs font-body text-purple-400 font-semibold mb-1">
                  AI Detected ({meal.aiAnalysis.confidence ? `${Math.round(meal.aiAnalysis.confidence * 100)}% confidence` : 'analyzing...'})
                </p>
                <div className="flex flex-wrap gap-1">
                  {meal.aiAnalysis.foodItems.map((fi, idx) => (
                    <span
                      key={idx}
                      className="inline-block px-2 py-0.5 rounded text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20"
                    >
                      {fi}
                    </span>
                  ))}
                </div>
                {meal.aiAnalysis.estimatedCalories ? (
                  <p className="text-xs font-body text-kairos-silver-dark mt-2">
                    Est: {meal.aiAnalysis.estimatedCalories} cal | {meal.aiAnalysis.estimatedProtein || 0}g P | {meal.aiAnalysis.estimatedCarbs || 0}g C | {meal.aiAnalysis.estimatedFat || 0}g F
                  </p>
                ) : null}
              </div>
            )}

            {/* Food Items (expanded) */}
            {isExpanded && (
              <div className="space-y-3">
                {/* Existing items */}
                {meal.items.length > 0 ? (
                  <div className="space-y-2">
                    {meal.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded border border-kairos-border"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-body text-white truncate">{item.name}</p>
                          <p className="text-xs font-body text-kairos-silver-dark">
                            {item.quantity} {item.unit} &middot; {item.calories} cal &middot; {item.protein}g P &middot; {item.carbs}g C &middot; {item.fat}g F
                          </p>
                        </div>
                        <button
                          onClick={() => removeFoodItem(meal.id, item.id)}
                          className="p-1 text-red-400 hover:text-red-300 ml-2"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-body text-kairos-silver-dark text-center py-2">
                    No food items added yet. Use the button below or upload a photo.
                  </p>
                )}

                {/* Add food item form */}
                {addingItem === meal.id ? (
                  <div className="p-3 rounded border border-kairos-gold/30 bg-kairos-gold/5 space-y-3">
                    <input
                      type="text"
                      value={newItem.name || ''}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="Food name (e.g., Grilled Chicken)"
                      className="kairos-input w-full"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={newItem.quantity || ''}
                        onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                        placeholder="Qty"
                        className="kairos-input"
                      />
                      <input
                        type="text"
                        value={newItem.unit || ''}
                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                        placeholder="Unit (oz, cup, serving)"
                        className="kairos-input"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        type="number"
                        value={newItem.calories || ''}
                        onChange={(e) => setNewItem({ ...newItem, calories: parseInt(e.target.value) || 0 })}
                        placeholder="Cal"
                        className="kairos-input"
                      />
                      <input
                        type="number"
                        value={newItem.protein || ''}
                        onChange={(e) => setNewItem({ ...newItem, protein: parseInt(e.target.value) || 0 })}
                        placeholder="Prot"
                        className="kairos-input"
                      />
                      <input
                        type="number"
                        value={newItem.carbs || ''}
                        onChange={(e) => setNewItem({ ...newItem, carbs: parseInt(e.target.value) || 0 })}
                        placeholder="Carbs"
                        className="kairos-input"
                      />
                      <input
                        type="number"
                        value={newItem.fat || ''}
                        onChange={(e) => setNewItem({ ...newItem, fat: parseInt(e.target.value) || 0 })}
                        placeholder="Fat"
                        className="kairos-input"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addFoodItem(meal.id)}
                        disabled={!newItem.name}
                        className="kairos-btn-gold text-xs px-3 py-1.5 disabled:opacity-50"
                      >
                        Add Item
                      </button>
                      <button
                        onClick={() => { setAddingItem(null); setNewItem({}); }}
                        className="px-3 py-1.5 text-xs font-body text-kairos-silver border border-kairos-border rounded hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingItem(meal.id)}
                    className="w-full py-2 rounded border border-dashed border-kairos-border text-kairos-silver hover:border-kairos-gold/30 hover:text-white transition-colors text-sm font-body flex items-center justify-center gap-2"
                  >
                    <Plus size={14} />
                    Add Food Item
                  </button>
                )}

                {/* Meal notes */}
                <div>
                  <input
                    type="text"
                    value={meal.notes || ''}
                    onChange={(e) => {
                      const updated = meals.map((m) =>
                        m.id === meal.id ? { ...m, notes: e.target.value } : m
                      );
                      updateMeals(updated);
                    }}
                    placeholder="Meal notes (optional)"
                    className="kairos-input w-full text-xs"
                  />
                </div>

                {/* Meal macros summary row */}
                <div className="flex gap-4 text-xs font-body text-kairos-silver-dark pt-1 border-t border-kairos-border">
                  <span>{meal.totalCalories} cal</span>
                  <span className="text-kairos-gold">{meal.totalProtein}g P</span>
                  <span className="text-blue-400">{meal.totalCarbs}g C</span>
                  <span className="text-green-400">{meal.totalFat}g F</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {meals.length === 0 && (
        <div className="kairos-card p-8 text-center">
          <UtensilsCrossed size={32} className="text-kairos-silver-dark mx-auto mb-3" />
          <p className="text-sm font-body text-kairos-silver">No meals logged yet today</p>
          <p className="text-xs font-body text-kairos-silver-dark mt-1">
            Tap a meal type above to start logging, or upload a photo
          </p>
        </div>
      )}
    </div>
  );
};
