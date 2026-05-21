"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  ScanBarcode,
  Search,
  ChevronDown,
  ChevronUp,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Loader2,
  AlertCircle,
  Check,
  Keyboard,
} from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useNutrition } from "@/hooks/client/useNutrition";
import { trpc } from "@/lib/trpc";

// ─── Types ─────────────────────────────────────────────────────
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

interface ScannedProduct {
  name: string;
  brand: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  barcode: string;
}

interface MealSlotData {
  type: "breakfast" | "lunch" | "dinner";
  label: string;
  icon: typeof Coffee;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged: boolean;
}

interface SnackEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

type AddMealTab = "manual" | "scan" | "search";

// ─── Default data ──────────────────────────────────────────────
const DEFAULT_MEAL_SLOTS: MealSlotData[] = [
  {
    type: "breakfast",
    label: "Breakfast",
    icon: Coffee,
    items: ["Greek yogurt with berries", "Bulletproof coffee", "Walnuts"],
    calories: 420,
    protein: 32,
    carbs: 18,
    fat: 24,
    logged: true,
  },
  {
    type: "lunch",
    label: "Lunch",
    icon: Sun,
    items: ["Grilled chicken salad with olive oil", "Avocado", "Mixed nuts"],
    calories: 580,
    protein: 48,
    carbs: 22,
    fat: 32,
    logged: true,
  },
  {
    type: "dinner",
    label: "Dinner",
    icon: Moon,
    items: ["Grass-fed beef steak", "Mixed green salad with olive oil", "Asparagus"],
    calories: 520,
    protein: 52,
    carbs: 16,
    fat: 28,
    logged: true,
  },
];

const DEFAULT_SNACKS: SnackEntry[] = [
  { id: "s1", name: "Macadamia nuts", calories: 100, protein: 8, carbs: 3, fat: 6 },
  { id: "s2", name: "Grass-fed beef jerky", calories: 60, protein: 8, carbs: 3, fat: 3 },
];

// ─── Barcode Scanner Component ─────────────────────────────────
function BarcodeScanner({
  onProductFound,
  onError,
}: {
  onProductFound: (product: ScannedProduct) => void;
  onError: (msg: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    setHasBarcodeDetector("BarcodeDetector" in window);
  }, []);

  const lookupBarcode = useCallback(
    async (barcode: string): Promise<ScannedProduct | null> => {
      setLookingUp(true);
      try {
        const res = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
        );
        const data = await res.json();
        if (data.status === 1) {
          const p = data.product;
          return {
            name: p.product_name || "Unknown Product",
            brand: p.brands || "",
            servingSize: p.serving_size || "100g",
            calories: Math.round(p.nutriments?.["energy-kcal_100g"] || 0),
            protein: Math.round(p.nutriments?.proteins_100g || 0),
            carbs: Math.round(p.nutriments?.carbohydrates_100g || 0),
            fat: Math.round(p.nutriments?.fat_100g || 0),
            fiber: Math.round(p.nutriments?.fiber_100g || 0),
            barcode,
          };
        }
        return null;
      } catch {
        return null;
      } finally {
        setLookingUp(false);
      }
    },
    []
  );

  const stopScanning = useCallback(() => {
    scanningRef.current = false;
    setScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startScanning = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanningRef.current = true;
      setScanning(true);

      if ("BarcodeDetector" in window) {
        const detector = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e"],
        });
        const detectLoop = async () => {
          if (!videoRef.current || !scanningRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const product = await lookupBarcode(barcodes[0].rawValue);
              if (product) {
                onProductFound(product);
              } else {
                onError(
                  `Product not found for barcode: ${barcodes[0].rawValue}`
                );
              }
              stopScanning();
              return;
            }
          } catch {
            // detection frame error, continue
          }
          if (scanningRef.current) {
            requestAnimationFrame(detectLoop);
          }
        };
        detectLoop();
      }
    } catch (err: any) {
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera permissions."
          : "Unable to access camera. Use manual barcode entry below."
      );
    }
  }, [lookupBarcode, onProductFound, onError, stopScanning]);

  useEffect(() => {
    return () => {
      scanningRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleManualLookup = async () => {
    if (!manualBarcode.trim()) return;
    const product = await lookupBarcode(manualBarcode.trim());
    if (product) {
      onProductFound(product);
    } else {
      onError(`Product not found for barcode: ${manualBarcode.trim()}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Camera Scanner */}
      <div className="relative">
        {scanning ? (
          <div className="relative rounded-kairos-sm overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="w-full h-56 object-cover"
              playsInline
              muted
            />
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-32 border-2 border-kairos-gold rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-kairos-gold" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-kairos-gold" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-kairos-gold" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-kairos-gold" />
                {/* Animated scan line */}
                <div className="absolute left-1 right-1 h-0.5 bg-kairos-gold/80 animate-pulse top-1/2" />
              </div>
            </div>
            {/* Scanning indicator */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <span className="bg-black/70 text-kairos-gold text-xs font-heading px-3 py-1 rounded-full flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Scanning for barcode...
              </span>
            </div>
            <button
              onClick={stopScanning}
              className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 hover:bg-black/90 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={startScanning}
            disabled={lookingUp}
            className="w-full border-2 border-dashed border-kairos-border rounded-kairos-sm p-8 text-center hover:border-kairos-gold transition-colors cursor-pointer disabled:opacity-50"
          >
            <Camera className="w-10 h-10 text-kairos-gold mx-auto mb-3" />
            <p className="text-sm text-white font-heading font-semibold mb-1">
              Open Camera Scanner
            </p>
            <p className="text-xs text-kairos-silver-dark font-body">
              {hasBarcodeDetector
                ? "Point your camera at a barcode to scan"
                : "Camera preview available (manual entry recommended for this browser)"}
            </p>
          </button>
        )}

        {cameraError && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-400 font-body">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}
      </div>

      {!hasBarcodeDetector && !scanning && (
        <div className="flex items-center gap-2 text-xs text-amber-400/80 font-body bg-amber-400/10 rounded-kairos-sm px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            BarcodeDetector API is not supported in this browser. Use manual
            entry below, or try Chrome/Edge.
          </span>
        </div>
      )}

      {/* Manual barcode entry */}
      <div>
        <label className="block text-xs font-heading font-semibold text-kairos-silver-dark mb-1.5 flex items-center gap-1.5">
          <Keyboard className="w-3.5 h-3.5" />
          Manual Barcode Entry
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter barcode number (e.g. 3017620422003)"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleManualLookup();
            }}
            className="flex-1 bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
          />
          <button
            onClick={handleManualLookup}
            disabled={lookingUp || !manualBarcode.trim()}
            className="kairos-btn-gold px-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {lookingUp ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Look Up
          </button>
        </div>
      </div>

      {lookingUp && (
        <div className="flex items-center justify-center gap-2 py-4 text-kairos-silver-dark text-sm font-body">
          <Loader2 className="w-5 h-5 animate-spin text-kairos-gold" />
          Looking up product in Open Food Facts...
        </div>
      )}
    </div>
  );
}

// ─── Scanned Product Confirmation Card ─────────────────────────
function ScannedProductCard({
  product,
  onConfirm,
  onCancel,
}: {
  product: ScannedProduct;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="border border-kairos-gold/40 rounded-kairos-sm bg-kairos-gold/5 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-heading font-bold text-white text-sm">
            {product.name}
          </h4>
          {product.brand && (
            <p className="text-xs text-kairos-silver-dark font-body">
              {product.brand}
            </p>
          )}
          <p className="text-xs text-kairos-silver-dark font-body mt-0.5">
            Serving: {product.servingSize} | Barcode: {product.barcode}
          </p>
        </div>
        <ScanBarcode className="w-5 h-5 text-kairos-gold shrink-0" />
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="bg-kairos-royal-surface rounded px-2 py-1.5 text-center">
          <p className="text-kairos-silver-dark">Cal</p>
          <p className="text-kairos-gold font-bold">{product.calories}</p>
        </div>
        <div className="bg-kairos-royal-surface rounded px-2 py-1.5 text-center">
          <p className="text-kairos-silver-dark">Protein</p>
          <p className="text-kairos-gold font-bold">{product.protein}g</p>
        </div>
        <div className="bg-kairos-royal-surface rounded px-2 py-1.5 text-center">
          <p className="text-kairos-silver-dark">Carbs</p>
          <p className="text-kairos-gold font-bold">{product.carbs}g</p>
        </div>
        <div className="bg-kairos-royal-surface rounded px-2 py-1.5 text-center">
          <p className="text-kairos-silver-dark">Fat</p>
          <p className="text-kairos-gold font-bold">{product.fat}g</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 kairos-btn-outline text-xs"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 kairos-btn-gold text-xs flex items-center justify-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" />
          Add to Meal
        </button>
      </div>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────
export default function NutritionPage() {
  const {
    period,
    setPeriod,
    dateRange,
    formattedRange,
    isCurrent,
    canForward,
    goBack,
    goForward,
    goToToday,
  } = useDateRange({ initialPeriod: "day" });

  const [waterGlasses, setWaterGlasses] = useState(6);
  const waterTarget = 8;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AddMealTab>("manual");
  const [scannedProduct, setScannedProduct] = useState<ScannedProduct | null>(
    null
  );
  const [scanError, setScanError] = useState<string | null>(null);

  const [formState, setFormState] = useState<MealFormState>({
    mealType: "breakfast",
    photo: null,
    foodItems: [
      {
        id: "1",
        name: "",
        quantity: 1,
        unit: "g",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      },
    ],
    notes: "",
  });

  // Meal slot expansion state
  const [expandedSlots, setExpandedSlots] = useState<Set<string>>(new Set());

  // Snacks state
  const [snacks, setSnacks] = useState<SnackEntry[]>(DEFAULT_SNACKS);

  const { records: nutritionData, stats: nutritionStats } =
    useNutrition(dateRange);
  const stats = nutritionStats;

  const macros = {
    calories: {
      target: 2000,
      actual: stats.calories,
      unit: "kcal",
      label: "Calories",
    },
    protein: {
      target: 150,
      actual: stats.protein,
      unit: "g",
      label: "Protein",
    },
    carbs: { target: 100, actual: stats.carbs, unit: "g", label: "Carbs" },
    fat: { target: 120, actual: stats.fat, unit: "g", label: "Fat" },
  };

  const mealSlots = DEFAULT_MEAL_SLOTS;

  const calculatePercentage = (actual: number, target: number) =>
    Math.min((actual / target) * 100, 100);

  // tRPC mutation for saving meals
  const saveMealMutation = trpc.clientPortal.meals.add.useMutation({
    onSuccess: () => {
      handleCloseModal();
    },
  });

  const handleOpenModal = (
    mealType: "breakfast" | "lunch" | "dinner" | "snack"
  ) => {
    setFormState({
      mealType,
      photo: null,
      foodItems: [
        {
          id: "1",
          name: "",
          quantity: 1,
          unit: "g",
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
      ],
      notes: "",
    });
    setActiveTab("manual");
    setScannedProduct(null);
    setScanError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setScannedProduct(null);
    setScanError(null);
    setActiveTab("manual");
    setFormState({
      mealType: "breakfast",
      photo: null,
      foodItems: [
        {
          id: "1",
          name: "",
          quantity: 1,
          unit: "g",
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
      ],
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

  const handleFoodItemChange = (
    id: string,
    field: keyof FoodItem,
    value: any
  ) => {
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

  const handleProductScanned = (product: ScannedProduct) => {
    setScannedProduct(product);
    setScanError(null);
  };

  const handleConfirmScannedProduct = () => {
    if (!scannedProduct) return;
    const newItem: FoodItem = {
      id: Date.now().toString(),
      name: scannedProduct.brand
        ? `${scannedProduct.name} (${scannedProduct.brand})`
        : scannedProduct.name,
      quantity: 1,
      unit: scannedProduct.servingSize || "serving",
      calories: scannedProduct.calories,
      protein: scannedProduct.protein,
      carbs: scannedProduct.carbs,
      fat: scannedProduct.fat,
    };
    // Add to food items, replacing empty first item if applicable
    const existingItems = formState.foodItems.filter(
      (item) => item.name.trim() !== ""
    );
    setFormState({
      ...formState,
      foodItems: [...existingItems, newItem],
    });
    setScannedProduct(null);
    setActiveTab("manual"); // Switch to manual to show the added item
  };

  const handleSaveMeal = async () => {
    const totalCalories = formState.foodItems.reduce(
      (sum, item) => sum + item.calories,
      0
    );
    const totalProtein = formState.foodItems.reduce(
      (sum, item) => sum + item.protein,
      0
    );
    const totalCarbs = formState.foodItems.reduce(
      (sum, item) => sum + item.carbs,
      0
    );
    const totalFat = formState.foodItems.reduce(
      (sum, item) => sum + item.fat,
      0
    );

    saveMealMutation.mutate({
      date:
        dateRange.startDate instanceof Date
          ? dateRange.startDate.toISOString().split("T")[0]
          : String(dateRange.startDate),
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
      photoUrl: formState.photo
        ? URL.createObjectURL(formState.photo)
        : undefined,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      totalFiber: 0,
    });
  };

  const toggleSlot = (type: string) => {
    setExpandedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const renderCircularProgress = (
    percentage: number,
    label: string,
    value: string
  ) => {
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset =
      circumference - (percentage / 100) * circumference;
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-28 h-28 mb-2">
          <svg
            className="w-full h-full transform -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-kairos-royal-surface"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="text-kairos-gold transition-all duration-500"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-kairos-gold">
              {Math.round(percentage)}%
            </span>
            <span className="text-xs text-kairos-silver-dark">{value}</span>
          </div>
        </div>
        <p className="text-sm font-body text-kairos-silver-dark">{label}</p>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl text-white mb-2">
          Nutrition Protocol
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs font-heading font-semibold px-3 py-1 rounded-full bg-kairos-gold/20 text-kairos-gold">
            Mediterranean-Keto Hybrid
          </span>
          <span className="text-xs font-body text-kairos-silver-dark">
            Optimized for longevity
          </span>
        </div>
      </div>

      {/* Date Navigator */}
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
            {period === "day"
              ? "Today's Macros"
              : `Avg Daily Macros — ${formattedRange}`}
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

      {/* DAY VIEW: Meal Slots + Snacks */}
      {period === "day" && (
        <>
          {/* Meal Slots */}
          <div className="kairos-card">
            <div className="flex items-center gap-2 mb-6">
              <UtensilsCrossed className="w-5 h-5 text-kairos-gold" />
              <h2 className="font-heading font-bold text-lg text-white">
                Meal Log
              </h2>
            </div>

            <div className="space-y-4">
              {mealSlots.map((slot) => {
                const SlotIcon = slot.icon;
                const isExpanded = expandedSlots.has(slot.type);

                return (
                  <div
                    key={slot.type}
                    className="border border-kairos-border rounded-kairos-sm bg-kairos-royal-surface/50 overflow-hidden"
                  >
                    {/* Slot Header - always visible */}
                    <button
                      onClick={() => toggleSlot(slot.type)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-kairos-royal-surface/80 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-kairos-gold/10 flex items-center justify-center">
                          <SlotIcon className="w-4.5 h-4.5 text-kairos-gold" />
                        </div>
                        <div>
                          <h3 className="font-heading font-semibold text-white text-sm">
                            {slot.label}
                          </h3>
                          {slot.logged && (
                            <p className="text-xs text-kairos-silver-dark font-body">
                              {slot.items.length} items logged
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {slot.logged && (
                          <span className="text-kairos-gold font-bold text-sm font-heading">
                            {slot.calories} kcal
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-kairos-silver-dark" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-kairos-silver-dark" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-kairos-border/50">
                        {slot.logged ? (
                          <>
                            <ul className="text-sm text-kairos-silver-dark font-body my-3 space-y-1">
                              {slot.items.map((item, i) => (
                                <li key={i}>
                                  <span className="text-kairos-gold/60 mr-1.5">
                                    &bull;
                                  </span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                            <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                              <div className="bg-kairos-royal-surface rounded px-2 py-1">
                                <span className="text-kairos-silver-dark">
                                  P:{" "}
                                </span>
                                <span className="text-kairos-gold font-semibold">
                                  {slot.protein}g
                                </span>
                              </div>
                              <div className="bg-kairos-royal-surface rounded px-2 py-1">
                                <span className="text-kairos-silver-dark">
                                  C:{" "}
                                </span>
                                <span className="text-kairos-gold font-semibold">
                                  {slot.carbs}g
                                </span>
                              </div>
                              <div className="bg-kairos-royal-surface rounded px-2 py-1">
                                <span className="text-kairos-silver-dark">
                                  F:{" "}
                                </span>
                                <span className="text-kairos-gold font-semibold">
                                  {slot.fat}g
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-kairos-silver-dark font-body my-3 italic">
                            No items logged yet
                          </p>
                        )}
                        <button
                          onClick={() => handleOpenModal(slot.type)}
                          className="w-full kairos-btn-outline flex items-center justify-center gap-2 text-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {slot.logged ? "Add More Items" : "Log Food"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Snacks Section */}
          <div className="kairos-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cookie className="w-5 h-5 text-kairos-gold" />
                <h2 className="font-heading font-bold text-lg text-white">
                  Snacks
                </h2>
              </div>
              <button
                onClick={() => handleOpenModal("snack")}
                className="kairos-btn-gold flex items-center gap-2 text-xs px-3 py-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Snack
              </button>
            </div>

            {snacks.length > 0 ? (
              <div className="space-y-2">
                {snacks.map((snack) => (
                  <div
                    key={snack.id}
                    className="flex items-center justify-between border border-kairos-border rounded-kairos-sm bg-kairos-royal-surface/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-kairos-gold/10 flex items-center justify-center">
                        <Cookie className="w-3.5 h-3.5 text-kairos-gold" />
                      </div>
                      <span className="text-sm text-white font-body">
                        {snack.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 text-xs text-kairos-silver-dark font-body">
                        <span>
                          P:
                          <span className="text-kairos-gold font-semibold ml-0.5">
                            {snack.protein}g
                          </span>
                        </span>
                        <span>
                          C:
                          <span className="text-kairos-gold font-semibold ml-0.5">
                            {snack.carbs}g
                          </span>
                        </span>
                        <span>
                          F:
                          <span className="text-kairos-gold font-semibold ml-0.5">
                            {snack.fat}g
                          </span>
                        </span>
                      </div>
                      <span className="text-kairos-gold font-bold text-sm font-heading whitespace-nowrap">
                        {snack.calories} kcal
                      </span>
                    </div>
                  </div>
                ))}
                {/* Snack total */}
                <div className="flex items-center justify-end px-4 pt-1">
                  <span className="text-xs text-kairos-silver-dark font-body">
                    Total:{" "}
                    <span className="text-kairos-gold font-semibold">
                      {snacks.reduce((sum, s) => sum + s.calories, 0)} kcal
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-kairos-silver-dark font-body text-center py-4 italic">
                No snacks logged today
              </p>
            )}
          </div>
        </>
      )}

      {/* WEEK/MONTH VIEW: Daily nutrition trend */}
      {(period === "week" || period === "month") && (
        <div className="kairos-card">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-bold text-lg text-white">
              Daily Calorie Trend &mdash; {formattedRange}
            </h2>
          </div>
          <div className="space-y-2">
            {nutritionData
              .slice(0, period === "week" ? 7 : 30)
              .map((day, i) => {
                const pct = Math.min((day.calories / 2500) * 100, 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-heading text-kairos-silver-dark w-10">
                      {day.dateLabel}
                    </span>
                    <div className="flex-1 h-6 bg-kairos-royal-surface rounded-kairos-sm overflow-hidden relative">
                      <div
                        className="h-full bg-kairos-gold/30 rounded-kairos-sm"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-heading font-semibold text-white">
                        {day.calories} kcal
                      </span>
                    </div>
                    <span className="text-xs font-body text-kairos-silver-dark w-16 text-right">
                      P:{day.protein}g
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Dietary Guidelines + Hydration */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="kairos-card">
          <div className="flex items-center gap-2 mb-4">
            <Apple className="w-5 h-5 text-kairos-gold" />
            <h3 className="font-heading font-bold text-white">
              Dietary Guidelines
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-heading font-semibold text-kairos-gold mb-2">
                Foods to Emphasize
              </p>
              <ul className="text-sm text-kairos-silver-dark font-body space-y-1">
                <li>
                  &#10003; Fatty fish (salmon, mackerel, sardines) - high
                  omega-3
                </li>
                <li>
                  &#10003; Anti-inflammatory vegetables (broccoli, leafy greens)
                </li>
                <li>
                  &#10003; Grass-fed beef and pasture-raised eggs
                </li>
                <li>&#10003; Nuts and seeds (almonds, macadamia)</li>
                <li>
                  &#10003; Extra virgin olive oil for healthy fats
                </li>
              </ul>
            </div>
            <div className="border-t border-kairos-border pt-4">
              <p className="text-xs font-heading font-semibold text-kairos-gold mb-2">
                Foods to Minimize
              </p>
              <ul className="text-sm text-kairos-silver-dark font-body space-y-1">
                <li>&#10005; Refined carbohydrates and sugar</li>
                <li>&#10005; Seed oils (soybean, canola, sunflower)</li>
                <li>
                  &#10005; Processed foods and ultra-processed ingredients
                </li>
                <li>&#10005; High-sugar fruits (limit dried fruits)</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="kairos-card">
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-5 h-5 text-kairos-gold" />
            <h3 className="font-heading font-bold text-white">
              Hydration Tracker
            </h3>
          </div>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="grid grid-cols-4 gap-2 mb-6">
              {Array.from({ length: waterTarget }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setWaterGlasses(i + 1)}
                  className={`w-12 h-12 rounded-kairos-sm border-2 transition-all ${
                    i < waterGlasses
                      ? "bg-kairos-gold border-kairos-gold"
                      : "border-kairos-border bg-kairos-royal-surface hover:border-kairos-gold"
                  }`}
                  title={`Glass ${i + 1}`}
                  aria-label={`Water glass ${i + 1}`}
                >
                  <Droplets
                    className={`w-5 h-5 mx-auto ${
                      i < waterGlasses
                        ? "text-kairos-royal"
                        : "text-kairos-silver-dark"
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="text-center">
              <span className="text-2xl font-heading font-bold text-kairos-gold">
                {waterGlasses}
              </span>
              <span className="text-kairos-silver-dark font-body text-sm">
                {" "}
                / {waterTarget} glasses
              </span>
            </p>
            <p className="text-xs text-kairos-silver-dark font-body mt-3">
              {waterGlasses >= waterTarget ? (
                <span className="flex items-center gap-1 text-kairos-gold">
                  <CheckCircle className="w-4 h-4" /> Hydration goal met!
                </span>
              ) : (
                <span>
                  {waterTarget - waterGlasses} more glasses to goal
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="kairos-card">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-kairos-gold" />
          <h3 className="font-heading font-bold text-white">Daily Summary</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div className="bg-kairos-royal-surface rounded-kairos-sm p-3">
            <p className="text-xs text-kairos-silver-dark font-body mb-1">
              Avg Calories
            </p>
            <p className="text-2xl font-heading font-bold text-kairos-gold">
              {stats.calories} / 2000
            </p>
            <p className="text-xs text-kairos-silver-dark font-body mt-1">
              {Math.round((stats.calories / 2000) * 100)}% of target
            </p>
          </div>
          <div className="bg-kairos-royal-surface rounded-kairos-sm p-3">
            <p className="text-xs text-kairos-silver-dark font-body mb-1">
              Macro Balance
            </p>
            <p className="text-2xl font-heading font-bold text-kairos-gold">
              94% Score
            </p>
            <p className="text-xs text-kairos-silver-dark font-body mt-1">
              Excellent adherence
            </p>
          </div>
          <div className="bg-kairos-royal-surface rounded-kairos-sm p-3">
            <p className="text-xs text-kairos-silver-dark font-body mb-1">
              Meal Frequency
            </p>
            <p className="text-2xl font-heading font-bold text-kairos-gold">
              4 Meals
            </p>
            <p className="text-xs text-kairos-silver-dark font-body mt-1">
              Well distributed
            </p>
          </div>
        </div>
      </div>

      {/* ─── Add Meal Modal ──────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-kairos-royal-surface border border-kairos-border rounded-kairos-sm max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-kairos-border sticky top-0 bg-kairos-royal-surface z-10">
              <h3 className="font-heading font-bold text-xl text-white">
                Add{" "}
                {formState.mealType.charAt(0).toUpperCase() +
                  formState.mealType.slice(1)}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-kairos-silver-dark hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-kairos-border">
              {(
                [
                  { key: "manual" as AddMealTab, label: "Manual", icon: UtensilsCrossed },
                  { key: "scan" as AddMealTab, label: "Scan", icon: ScanBarcode },
                  { key: "search" as AddMealTab, label: "Search", icon: Search },
                ] as const
              ).map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key);
                      setScanError(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-heading font-semibold transition-colors border-b-2 ${
                      activeTab === tab.key
                        ? "text-kairos-gold border-kairos-gold"
                        : "text-kairos-silver-dark border-transparent hover:text-white"
                    }`}
                  >
                    <TabIcon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Meal Type Selector */}
              <div>
                <label className="block text-sm font-heading font-semibold text-white mb-2">
                  Meal Type
                </label>
                <select
                  value={formState.mealType}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      mealType: e.target.value as
                        | "breakfast"
                        | "lunch"
                        | "dinner"
                        | "snack",
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

              {/* ── SCAN TAB ─────────────────────────────────────── */}
              {activeTab === "scan" && (
                <div className="space-y-4">
                  <BarcodeScanner
                    onProductFound={handleProductScanned}
                    onError={(msg) => setScanError(msg)}
                  />

                  {scanError && (
                    <div className="flex items-center gap-2 text-xs text-red-400 font-body bg-red-400/10 rounded-kairos-sm px-3 py-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{scanError}</span>
                    </div>
                  )}

                  {scannedProduct && (
                    <ScannedProductCard
                      product={scannedProduct}
                      onConfirm={handleConfirmScannedProduct}
                      onCancel={() => setScannedProduct(null)}
                    />
                  )}
                </div>
              )}

              {/* ── SEARCH TAB ───────────────────────────────────── */}
              {activeTab === "search" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-heading font-semibold text-white mb-2">
                      Search Food Database
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Search for a food (e.g. chicken breast, almonds)..."
                        className="flex-1 bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                      />
                      <button className="kairos-btn-gold px-4 flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        Search
                      </button>
                    </div>
                  </div>
                  <div className="text-center py-8">
                    <Search className="w-10 h-10 text-kairos-silver-dark/50 mx-auto mb-3" />
                    <p className="text-sm text-kairos-silver-dark font-body">
                      Search our food database to quickly find nutritional
                      information
                    </p>
                    <p className="text-xs text-kairos-silver-dark/60 font-body mt-1">
                      Coming soon: AI-powered food recognition
                    </p>
                  </div>
                </div>
              )}

              {/* ── MANUAL TAB / Shared Food Items Section ───────── */}
              {activeTab === "manual" && (
                <>
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
                          {formState.photo
                            ? formState.photo.name
                            : "Click to upload photo"}
                        </p>
                        <p className="text-xs text-kairos-silver-dark font-body">
                          or drag and drop
                        </p>
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
                            <input
                              type="text"
                              placeholder="Food name"
                              value={item.name}
                              onChange={(e) =>
                                handleFoodItemChange(
                                  item.id,
                                  "name",
                                  e.target.value
                                )
                              }
                              className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <input
                                type="number"
                                placeholder="Qty"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleFoodItemChange(
                                    item.id,
                                    "quantity",
                                    parseFloat(e.target.value)
                                  )
                                }
                                className="flex-1 bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                              />
                              <select
                                value={item.unit}
                                onChange={(e) =>
                                  handleFoodItemChange(
                                    item.id,
                                    "unit",
                                    e.target.value
                                  )
                                }
                                className="w-16 bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-2 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                              >
                                <option value="g">g</option>
                                <option value="oz">oz</option>
                                <option value="ml">ml</option>
                                <option value="cup">cup</option>
                                <option value="tbsp">tbsp</option>
                                <option value="tsp">tsp</option>
                                <option value="serving">srv</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                            <input
                              type="number"
                              placeholder="Calories"
                              value={item.calories}
                              onChange={(e) =>
                                handleFoodItemChange(
                                  item.id,
                                  "calories",
                                  parseFloat(e.target.value)
                                )
                              }
                              className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                            />
                            <input
                              type="number"
                              placeholder="Protein (g)"
                              value={item.protein}
                              onChange={(e) =>
                                handleFoodItemChange(
                                  item.id,
                                  "protein",
                                  parseFloat(e.target.value)
                                )
                              }
                              className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                            />
                            <input
                              type="number"
                              placeholder="Carbs (g)"
                              value={item.carbs}
                              onChange={(e) =>
                                handleFoodItemChange(
                                  item.id,
                                  "carbs",
                                  parseFloat(e.target.value)
                                )
                              }
                              className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                            />
                            <input
                              type="number"
                              placeholder="Fat (g)"
                              value={item.fat}
                              onChange={(e) =>
                                handleFoodItemChange(
                                  item.id,
                                  "fat",
                                  parseFloat(e.target.value)
                                )
                              }
                              className="bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                            />
                          </div>

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
                </>
              )}
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
                disabled={
                  saveMealMutation.isPending ||
                  formState.foodItems.every((item) => item.name.trim() === "")
                }
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
