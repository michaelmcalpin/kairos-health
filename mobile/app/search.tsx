/**
 * Global Search screen.
 *
 * Universal search across health data, protocols, appointments, labs,
 * documents, and insights. Features a search bar with auto-focus,
 * recent searches, quick filter chips, and results grouped by category.
 */

import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Keyboard,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Search,
  X,
  ChevronRight,
  Clock,
  Droplets,
  Pill,
  FlaskConical,
  Brain,
  Calendar,
  Heart,
  Moon,
  FileText,
  Activity,
  Dumbbell,
  AlertCircle,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  useGlobalSearch,
  type SearchFilterChip,
  type SearchResult,
  type SearchResultGroup,
} from "@/hooks/useSearch";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MAX_RECENT_SEARCHES = 5;

const FILTER_CHIPS: { key: SearchFilterChip; label: string }[] = [
  { key: "all", label: "All" },
  { key: "health_data", label: "Health Data" },
  { key: "protocols", label: "Protocols" },
  { key: "appointments", label: "Appointments" },
  { key: "labs", label: "Labs" },
  { key: "documents", label: "Documents" },
];

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  droplets: Droplets,
  pill: Pill,
  "flask-conical": FlaskConical,
  brain: Brain,
  calendar: Calendar,
  heart: Heart,
  moon: Moon,
  "file-text": FileText,
  activity: Activity,
  dumbbell: Dumbbell,
  "alert-circle": AlertCircle,
};

const CATEGORY_BADGE_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  health_data: "info",
  protocols: "warning",
  appointments: "success",
  labs: "danger",
  documents: "default",
  insights: "info",
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Component
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function SearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<SearchFilterChip>("all");
  const [recentSearches, setRecentSearches] = useState<string[]>([
    "glucose",
    "blood pressure",
    "sleep quality",
    "vitamin D",
  ]);

  const filters = useMemo<SearchFilterChip[]>(
    () => [activeFilter],
    [activeFilter],
  );

  const { results, grouped, isLoading, isSearching } = useGlobalSearch(
    query,
    filters,
  );

  // ── Handlers ─────────────────────────────────────────────

  const handleSearch = useCallback(
    (text: string) => {
      setQuery(text);
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const without = prev.filter((s) => s !== trimmed);
      return [trimmed, ...without].slice(0, MAX_RECENT_SEARCHES);
    });
    Keyboard.dismiss();
  }, [query]);

  const handleRecentTap = useCallback((term: string) => {
    setQuery(term);
  }, []);

  const handleClearRecent = useCallback((term: string) => {
    setRecentSearches((prev) => prev.filter((s) => s !== term));
  }, []);

  const handleResultTap = useCallback(
    (result: SearchResult) => {
      // Save to recent
      handleSubmit();
      if (result.route) {
        router.push(result.route as any);
      }
    },
    [handleSubmit, router],
  );

  const handleCancel = useCallback(() => {
    Keyboard.dismiss();
    router.back();
  }, [router]);

  // ── Icon resolver ────────────────────────────────────────

  const getIcon = useCallback(
    (iconName: string, size = 20, color = Colors.silver) => {
      const IconComponent = ICON_MAP[iconName] ?? Activity;
      return <IconComponent size={size} color={color} />;
    },
    [],
  );

  // ── Render helpers ───────────────────────────────────────

  const renderSearchBar = () => (
    <View style={styles.searchBarContainer}>
      <View style={styles.searchInputWrapper}>
        <Search size={18} color={Colors.silver} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder="Search health data, protocols, labs..."
          placeholderTextColor={Colors.silver}
          value={query}
          onChangeText={handleSearch}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={Colors.gold}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={18} color={Colors.silver} />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFilterChips = () => (
    <FlatList
      horizontal
      data={FILTER_CHIPS}
      keyExtractor={(item) => item.key}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipContainer}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.chip,
            activeFilter === item.key && styles.chipActive,
          ]}
          onPress={() => setActiveFilter(item.key)}
        >
          <Text
            style={[
              styles.chipText,
              activeFilter === item.key && styles.chipTextActive,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      )}
    />
  );

  const renderRecentSearches = () => {
    if (recentSearches.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Searches</Text>
        {recentSearches.map((term) => (
          <TouchableOpacity
            key={term}
            style={styles.recentItem}
            onPress={() => handleRecentTap(term)}
          >
            <Clock size={16} color={Colors.silver} />
            <Text style={styles.recentText}>{term}</Text>
            <TouchableOpacity
              onPress={() => handleClearRecent(term)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={14} color={Colors.silver} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderResultItem = (result: SearchResult) => (
    <TouchableOpacity
      key={result.id}
      style={styles.resultItem}
      onPress={() => handleResultTap(result)}
      activeOpacity={0.7}
    >
      <View style={styles.resultIconContainer}>
        {getIcon(result.icon, 20, Colors.gold)}
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {result.title}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={1}>
          {result.subtitle}
        </Text>
      </View>
      <Badge
        label={result.categoryLabel}
        variant={CATEGORY_BADGE_VARIANT[result.category] ?? "default"}
      />
      <ChevronRight
        size={16}
        color={Colors.silver}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );

  const renderGroupedResults = () => {
    if (!isSearching) return renderRecentSearches();

    if (results.length === 0 && !isLoading) {
      return (
        <View style={styles.emptyState}>
          <Search size={48} color={Colors.silver} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyMessage}>
            Try a different search term or adjust your filters
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.resultsContainer}>
        {grouped.map((group: SearchResultGroup) => (
          <View key={group.category} style={styles.resultGroup}>
            <Text style={styles.groupHeader}>{group.categoryLabel}</Text>
            <Card>
              {group.results.map((result, index) => (
                <React.Fragment key={result.id}>
                  {index > 0 && <View style={styles.divider} />}
                  {renderResultItem(result)}
                </React.Fragment>
              ))}
            </Card>
          </View>
        ))}
      </View>
    );
  };

  // ── Main render ──────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {renderSearchBar()}
      {renderFilterChips()}
      <FlatList
        data={[{ key: "content" }]}
        renderItem={() => renderGroupedResults()}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      />
    </SafeAreaView>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Styles
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },

  // Search bar
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontSize: FontSizes.md,
    height: 44,
    ...Platform.select({
      web: { outlineStyle: "none" } as any,
    }),
  },
  cancelButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  cancelText: {
    color: Colors.gold,
    fontSize: FontSizes.md,
    fontWeight: "500",
  },

  // Filter chips
  chipContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    backgroundColor: Colors.navy,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.goldDark,
    borderColor: Colors.gold,
  },
  chipText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  chipTextActive: {
    color: Colors.white,
  },

  // Scroll content
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },

  // Recent searches
  section: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  sectionTitle: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  recentText: {
    flex: 1,
    color: Colors.white,
    fontSize: FontSizes.md,
  },

  // Results
  resultsContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  resultGroup: {
    marginBottom: Spacing.md,
  },
  groupHeader: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm + 2,
    gap: Spacing.sm,
  },
  resultIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
  },
  resultContent: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  resultTitle: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  resultSubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  chevron: {
    marginLeft: Spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing.xxl * 2,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  emptyMessage: {
    color: Colors.silver,
    fontSize: FontSizes.md,
    textAlign: "center",
    lineHeight: 22,
  },
});
