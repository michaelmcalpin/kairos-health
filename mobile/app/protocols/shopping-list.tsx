/**
 * Shopping List screen — grocery list derived from the weekly meal plan.
 * Categories are collapsible, items can be checked off, swiped to delete,
 * and new items can be added per category.
 */

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
  Animated,
  PanResponder,
  TextInput,
  Share,
} from "react-native";
import { Stack } from "expo-router";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  price: number;
  purchased: boolean;
}

interface ShoppingCategory {
  id: string;
  label: string;
  icon: string;
  items: ShoppingItem[];
}

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const INITIAL_CATEGORIES: ShoppingCategory[] = [
  {
    id: "proteins",
    label: "Proteins",
    icon: "🥩",
    items: [
      { id: "p1", name: "Chicken breast", quantity: "2 lbs", price: 8.99, purchased: false },
      { id: "p2", name: "Salmon fillets", quantity: "1 lb", price: 12.99, purchased: false },
      { id: "p3", name: "Greek yogurt", quantity: "32 oz", price: 5.49, purchased: false },
      { id: "p4", name: "Eggs", quantity: "1 dozen", price: 4.29, purchased: false },
      { id: "p5", name: "Whey protein", quantity: "1 container", price: 29.99, purchased: false },
    ],
  },
  {
    id: "vegetables",
    label: "Vegetables",
    icon: "🥦",
    items: [
      { id: "v1", name: "Broccoli", quantity: "2 heads", price: 3.98, purchased: false },
      { id: "v2", name: "Spinach", quantity: "1 bag", price: 2.99, purchased: false },
      { id: "v3", name: "Sweet potatoes", quantity: "4", price: 3.96, purchased: false },
      { id: "v4", name: "Bell peppers", quantity: "3", price: 4.47, purchased: false },
      { id: "v5", name: "Avocados", quantity: "4", price: 5.96, purchased: false },
    ],
  },
  {
    id: "grains",
    label: "Grains & Carbs",
    icon: "🌾",
    items: [
      { id: "g1", name: "Brown rice", quantity: "2 lbs", price: 3.49, purchased: false },
      { id: "g2", name: "Oats", quantity: "1 container", price: 4.29, purchased: false },
      { id: "g3", name: "Quinoa", quantity: "1 lb", price: 5.99, purchased: false },
      { id: "g4", name: "Whole wheat bread", quantity: "1 loaf", price: 3.79, purchased: false },
    ],
  },
  {
    id: "fruits",
    label: "Fruits",
    icon: "🫐",
    items: [
      { id: "f1", name: "Blueberries", quantity: "2 pints", price: 7.98, purchased: false },
      { id: "f2", name: "Bananas", quantity: "1 bunch", price: 1.49, purchased: false },
      { id: "f3", name: "Apples", quantity: "6", price: 4.99, purchased: false },
    ],
  },
  {
    id: "dairy",
    label: "Dairy & Alternatives",
    icon: "🥛",
    items: [
      { id: "d1", name: "Almond milk", quantity: "1 carton", price: 3.79, purchased: false },
      { id: "d2", name: "Cottage cheese", quantity: "16 oz", price: 4.49, purchased: false },
    ],
  },
  {
    id: "pantry",
    label: "Pantry",
    icon: "🫙",
    items: [
      { id: "pa1", name: "Olive oil", quantity: "1 bottle", price: 7.99, purchased: false },
      { id: "pa2", name: "Almonds", quantity: "1 bag", price: 6.99, purchased: false },
      { id: "pa3", name: "Chia seeds", quantity: "1 bag", price: 5.49, purchased: false },
      { id: "pa4", name: "Honey", quantity: "1 bottle", price: 6.99, purchased: false },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* SwipeableItem                                                       */
/* ------------------------------------------------------------------ */

function SwipeableItem({
  item,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dy) < 20,
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) {
          translateX.setValue(Math.max(gs.dx, -100));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -60) {
          Animated.timing(translateX, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleDelete = () => {
    Animated.timing(translateX, {
      toValue: -400,
      duration: 250,
      useNativeDriver: true,
    }).start(onDelete);
  };

  return (
    <View style={swipeStyles.container}>
      {/* Delete background */}
      <Pressable onPress={handleDelete} style={swipeStyles.deleteBackground}>
        <Text style={swipeStyles.deleteText}>Delete</Text>
      </Pressable>

      <Animated.View
        style={[swipeStyles.foreground, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <Pressable onPress={onToggle} style={swipeStyles.row}>
          {/* Checkbox */}
          <View
            style={[
              swipeStyles.checkbox,
              item.purchased && swipeStyles.checkboxChecked,
            ]}
          >
            {item.purchased && <Text style={swipeStyles.checkmark}>✓</Text>}
          </View>

          {/* Name & quantity */}
          <View style={swipeStyles.info}>
            <Text
              style={[
                swipeStyles.name,
                item.purchased && swipeStyles.nameStrikethrough,
              ]}
            >
              {item.name}
            </Text>
            <Text style={swipeStyles.quantity}>{item.quantity}</Text>
          </View>

          {/* Price */}
          <Text
            style={[
              swipeStyles.price,
              item.purchased && swipeStyles.pricePurchased,
            ]}
          >
            ${item.price.toFixed(2)}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const swipeStyles = StyleSheet.create({
  container: {
    overflow: "hidden",
    marginBottom: 1,
  },
  deleteBackground: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: Colors.danger,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: Radii.sm,
  },
  deleteText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: FontSizes.sm,
  },
  foreground: {
    backgroundColor: Colors.navy,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xs,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.silver,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  checkmark: {
    color: Colors.dark,
    fontSize: 13,
    fontWeight: "700",
    marginTop: -1,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FontSizes.md,
    color: Colors.white,
    fontWeight: "500",
  },
  nameStrikethrough: {
    textDecorationLine: "line-through",
    color: Colors.silver,
  },
  quantity: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    marginTop: 1,
  },
  price: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.silverLight,
  },
  pricePurchased: {
    color: Colors.silver,
    textDecorationLine: "line-through",
  },
});

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function ShoppingListScreen() {
  const [categories, setCategories] = useState<ShoppingCategory[]>(INITIAL_CATEGORIES);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");

  /* Computed totals */
  const allItems = categories.flatMap((c) => c.items);
  const totalItems = allItems.length;
  const purchasedCount = allItems.filter((i) => i.purchased).length;
  const remainingCount = totalItems - purchasedCount;
  const estimatedTotal = allItems.reduce((sum, i) => sum + i.price, 0);

  /* Toggle collapse */
  const toggleCollapse = (catId: string) => {
    setCollapsed((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  /* Toggle item purchased */
  const toggleItem = useCallback((catId: string, itemId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === itemId
                  ? { ...item, purchased: !item.purchased }
                  : item
              ),
            }
          : cat
      )
    );
  }, []);

  /* Delete item */
  const deleteItem = useCallback((catId: string, itemId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId
          ? { ...cat, items: cat.items.filter((item) => item.id !== itemId) }
          : cat
      )
    );
  }, []);

  /* Clear purchased */
  const clearPurchased = () => {
    Alert.alert(
      "Clear Purchased Items",
      "Remove all checked items from the list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            setCategories((prev) =>
              prev.map((cat) => ({
                ...cat,
                items: cat.items.filter((item) => !item.purchased),
              }))
            );
          },
        },
      ]
    );
  };

  /* Share list */
  const shareList = async () => {
    const lines = categories
      .filter((cat) => cat.items.length > 0)
      .map(
        (cat) =>
          `${cat.icon} ${cat.label}\n` +
          cat.items
            .map(
              (item) =>
                `  ${item.purchased ? "✓" : "○"} ${item.name} (${item.quantity}) — $${item.price.toFixed(2)}`
            )
            .join("\n")
      )
      .join("\n\n");

    const text = `Shopping List — This Week's Meals\n${"─".repeat(32)}\n\n${lines}\n\nEstimated Total: $${estimatedTotal.toFixed(2)}`;

    await Share.share({ message: text });
  };

  /* Add item */
  const addItem = (catId: string) => {
    if (!newItemName.trim()) return;
    const newItem: ShoppingItem = {
      id: `new_${Date.now()}`,
      name: newItemName.trim(),
      quantity: "1",
      price: 0,
      purchased: false,
    };
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === catId ? { ...cat, items: [...cat.items, newItem] } : cat
      )
    );
    setNewItemName("");
    setAddingTo(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Shopping List" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.title}>Shopping List</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{totalItems} items</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Based on This Week's Meals
          </Text>
        </View>

        {/* Category Sections */}
        {categories.map((cat) => {
          const isCollapsed = collapsed[cat.id] ?? false;
          const catPurchased = cat.items.filter((i) => i.purchased).length;

          return (
            <Card key={cat.id} style={styles.categoryCard}>
              {/* Category header — tap to collapse */}
              <Pressable
                onPress={() => toggleCollapse(cat.id)}
                style={styles.categoryHeader}
              >
                <View style={styles.categoryHeaderLeft}>
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                  <Text style={styles.categoryCount}>
                    {catPurchased}/{cat.items.length}
                  </Text>
                </View>
                <Text style={styles.chevron}>{isCollapsed ? "▸" : "▾"}</Text>
              </Pressable>

              {/* Items */}
              {!isCollapsed && (
                <View style={styles.itemsList}>
                  {cat.items.map((item) => (
                    <SwipeableItem
                      key={item.id}
                      item={item}
                      onToggle={() => toggleItem(cat.id, item.id)}
                      onDelete={() => deleteItem(cat.id, item.id)}
                    />
                  ))}

                  {/* Add Item */}
                  {addingTo === cat.id ? (
                    <View style={styles.addItemRow}>
                      <TextInput
                        style={styles.addItemInput}
                        placeholder="Item name"
                        placeholderTextColor={Colors.silver}
                        value={newItemName}
                        onChangeText={setNewItemName}
                        autoFocus
                        onSubmitEditing={() => addItem(cat.id)}
                        returnKeyType="done"
                      />
                      <Pressable
                        onPress={() => addItem(cat.id)}
                        style={styles.addItemConfirm}
                      >
                        <Text style={styles.addItemConfirmText}>Add</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setAddingTo(null);
                          setNewItemName("");
                        }}
                        style={styles.addItemCancel}
                      >
                        <Text style={styles.addItemCancelText}>✕</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => setAddingTo(cat.id)}
                      style={styles.addItemButton}
                    >
                      <Text style={styles.addItemButtonText}>+ Add Item</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Card>
          );
        })}

        {/* Summary & Actions */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated Total</Text>
            <Text style={styles.summaryValue}>${estimatedTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items Remaining</Text>
            <Text style={styles.summaryValue}>
              {remainingCount}/{totalItems}
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width:
                    totalItems > 0
                      ? `${(purchasedCount / totalItems) * 100}%`
                      : "0%",
                },
              ]}
            />
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <Button
            title="Share List"
            variant="secondary"
            style={styles.flex1}
            onPress={shareList}
          />
          <Button
            title="Clear Purchased"
            variant="tertiary"
            style={styles.flex1}
            onPress={clearPurchased}
            disabled={purchasedCount === 0}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },

  /* Header */
  header: {
    gap: Spacing.xs,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    color: Colors.white,
  },
  countBadge: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.full,
  },
  countBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: "700",
    color: Colors.dark,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },

  /* Category */
  categoryCard: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.gold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  categoryCount: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    fontWeight: "500",
  },
  chevron: {
    fontSize: FontSizes.md,
    color: Colors.silver,
  },

  /* Items */
  itemsList: {
    marginTop: Spacing.xs,
  },

  /* Add Item */
  addItemButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  addItemButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.gold,
    fontWeight: "500",
  },
  addItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    gap: Spacing.sm,
  },
  addItemInput: {
    flex: 1,
    height: 36,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSizes.sm,
    color: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addItemConfirm: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.sm,
  },
  addItemConfirmText: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.dark,
  },
  addItemCancel: {
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  addItemCancelText: {
    fontSize: FontSizes.md,
    color: Colors.silver,
  },

  /* Summary */
  summaryCard: {
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  summaryValue: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.navyLight,
    overflow: "hidden",
    marginTop: Spacing.xs,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: Colors.gold,
  },

  /* Buttons */
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  flex1: {
    flex: 1,
  },
});
