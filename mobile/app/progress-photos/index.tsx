/**
 * Progress Photos gallery screen.
 *
 * Displays a photo grid of the client's progress photos with angle
 * filtering, add/delete functionality, and pull-to-refresh.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Camera,
  Calendar,
  Plus,
  Trash2,
  ImageIcon,
} from "lucide-react-native";

import { useAuth } from "@clerk/clerk-expo";

import { Colors, Spacing, FontSizes, Radii, API_URL } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { showImagePickerOptions, PickedImage } from "@/lib/image-picker";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type PhotoAngle = "front" | "side" | "back";

interface ProgressPhoto {
  id: string;
  date: string;
  photoUrl: string;
  angle: PhotoAngle;
  notes?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API → UI mapper
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Map a server progress-photo row to the screen's display model.
 * The server returns { id, date, photoUrls: string[] (PHI-proxy paths),
 * poseType } — we surface the first photo per row. Relative proxy paths are
 * prefixed with the API base URL so <Image> can request them.
 */
function mapApiPhoto(row: any): ProgressPhoto {
  const first = Array.isArray(row.photoUrls) ? row.photoUrls[0] : row.photoUrl;
  const url = first
    ? String(first).startsWith("http")
      ? String(first)
      : `${API_URL}${first}`
    : "";
  return {
    id: String(row.id),
    date:
      typeof row.date === "string"
        ? row.date.split("T")[0]
        : new Date(row.date ?? Date.now()).toISOString().split("T")[0],
    photoUrl: url,
    angle: (row.poseType ?? row.angle ?? "front") as PhotoAngle,
    notes: row.notes ?? undefined,
  };
}

const ANGLE_TABS: Array<{ key: PhotoAngle | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "front", label: "Front" },
  { key: "side", label: "Side" },
  { key: "back", label: "Back" },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function ProgressPhotosScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [selectedAngle, setSelectedAngle] = useState<PhotoAngle | "all">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [previewImage, setPreviewImage] = useState<PickedImage | null>(null);
  const [uploading, setUploading] = useState(false);

  // ── tRPC: fetch recent progress photos ──
  const photosQuery = trpc.clientPortal.progressPhotos.getRecent.useQuery(
    { limit: 20 },
    DEFAULT_QUERY_OPTIONS,
  );

  const deleteMutation = trpc.clientPortal.progressPhotos.delete.useMutation({
    onSuccess: () => {
      photosQuery.refetch();
    },
  });

  // ── Add mutation: persists the uploaded photo URL to the backend ──
  const addMutation = trpc.clientPortal.progressPhotos.add.useMutation({
    onSuccess: () => {
      photosQuery.refetch();
    },
  });

  // ── Map real API data (no sample fallback) ──
  const rawPhotos: ProgressPhoto[] = Array.isArray(photosQuery.data)
    ? (photosQuery.data as any[]).map(mapApiPhoto)
    : [];

  // ── Filter by selected angle ──
  const photos =
    selectedAngle === "all"
      ? rawPhotos
      : rawPhotos.filter((p) => p.angle === selectedAngle);

  // ── Pull to refresh ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await photosQuery.refetch();
    setRefreshing(false);
  }, [photosQuery]);

  // ── Add Photo ──
  // Upload the picked image to the web /api/upload endpoint (reusing the same
  // Clerk bearer token the tRPC client uses), then persist the returned URL via
  // progressPhotos.add and refetch. The pose type defaults to the currently
  // selected angle filter (or "front" when viewing "All").
  const handleAddPhoto = async () => {
    const image = await showImagePickerOptions();
    if (!image) return;

    // Show a local preview immediately while the upload runs.
    setPreviewImage(image);
    setUploading(true);

    try {
      const token = await getToken();

      const formData = new FormData();
      formData.append("file", {
        uri: image.uri,
        name: image.fileName ?? `photo_${Date.now()}.jpg`,
        type: image.type ?? "image/jpeg",
      } as any);
      formData.append("category", "photo");

      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "x-trpc-source": "everist-mobile",
          // NOTE: do not set Content-Type — RN sets the multipart boundary.
        },
        body: formData,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error ?? `Upload failed (${res.status})`);
      }

      const data = await res.json();
      const uploadedUrl: string | undefined = data?.url;
      if (!uploadedUrl) {
        throw new Error("Upload succeeded but no URL was returned.");
      }

      const poseType: PhotoAngle = selectedAngle === "all" ? "front" : selectedAngle;

      await addMutation.mutateAsync({
        date: new Date().toISOString().split("T")[0],
        photoUrls: [uploadedUrl],
        poseType,
      });

      await photosQuery.refetch();
      setPreviewImage(null);
      Alert.alert("Photo Saved", "Your progress photo has been uploaded.", [{ text: "OK" }]);
    } catch (err: any) {
      Alert.alert(
        "Upload Failed",
        err?.message ?? "Could not upload your photo. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setUploading(false);
    }
  };

  // ── Delete Photo ──
  const handleDelete = (photo: ProgressPhoto) => {
    Alert.alert(
      "Delete Photo",
      `Are you sure you want to delete the photo from ${formatDate(photo.date)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate({ id: photo.id });
          },
        },
      ],
    );
  };

  // ── Format date helper ──
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gold}
            colors={[Colors.gold]}
          />
        }
      >
        {/* ─── Header Stats ────────────────────────────────── */}
        <Card style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{rawPhotos.length}</Text>
              <Text style={styles.statLabel}>Total Photos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {rawPhotos.length > 0 ? formatDate(rawPhotos[0].date) : "—"}
              </Text>
              <Text style={styles.statLabel}>Latest</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {new Set(rawPhotos.map((p) => p.angle)).size}
              </Text>
              <Text style={styles.statLabel}>Angles</Text>
            </View>
          </View>
        </Card>

        {/* ─── Angle Filter Tabs ───────────────────────────── */}
        <View style={styles.filterRow}>
          {ANGLE_TABS.map((tab) => {
            const isActive = selectedAngle === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setSelectedAngle(tab.key)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    isActive && styles.filterTabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ─── Photo Grid ──────────────────────────────────── */}
        {photos.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <View style={styles.emptyIconWrap}>
                <Camera size={32} color={Colors.silver} />
              </View>
              <Text style={styles.emptyTitle}>No Photos Yet</Text>
              <Text style={styles.emptySubtitle}>
                {selectedAngle === "all"
                  ? "Take your first progress photo to start tracking your transformation."
                  : `No ${selectedAngle} view photos yet. Add one to track your progress from this angle.`}
              </Text>
            </View>
          </Card>
        ) : (
          <View style={styles.photoGrid}>
            {photos.map((photo) => (
              <Card key={photo.id} style={styles.photoCard}>
                {/* Photo thumbnail or placeholder */}
                <View style={styles.photoThumb}>
                  {photo.photoUrl ? (
                    <Image
                      source={{ uri: photo.photoUrl }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <ImageIcon size={28} color={Colors.silver} />
                    </View>
                  )}

                  {/* Angle badge */}
                  <View style={styles.angleBadge}>
                    <Text style={styles.angleBadgeText}>
                      {photo.angle.charAt(0).toUpperCase() + photo.angle.slice(1)}
                    </Text>
                  </View>

                  {/* Delete button */}
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(photo)}
                    hitSlop={8}
                  >
                    <Trash2 size={14} color={Colors.danger} />
                  </Pressable>
                </View>

                {/* Photo info */}
                <View style={styles.photoInfo}>
                  <View style={styles.photoDateRow}>
                    <Calendar size={12} color={Colors.silver} />
                    <Text style={styles.photoDate}>{formatDate(photo.date)}</Text>
                  </View>
                  {photo.notes ? (
                    <Text style={styles.photoNotes} numberOfLines={2}>
                      {photo.notes}
                    </Text>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* ─── Photo Preview (while uploading) ───────────────── */}
        {previewImage && (
          <Card style={styles.previewCard}>
            <Text style={styles.previewTitle}>
              {uploading ? "Uploading…" : "Captured Photo"}
            </Text>
            <Image
              source={{ uri: previewImage.uri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
            {uploading && (
              <ActivityIndicator size="small" color={Colors.gold} style={{ marginBottom: Spacing.sm }} />
            )}
            <Text style={styles.previewNote}>
              {uploading
                ? "Uploading your progress photo…"
                : "Photo saved on your device."}
            </Text>
          </Card>
        )}

        {/* ─── Add Photo Button ────────────────────────────── */}
        <Pressable
          disabled={uploading}
          style={({ pressed }) => [
            styles.addButton,
            (pressed || uploading) && styles.addButtonPressed,
          ]}
          onPress={handleAddPhoto}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={Colors.dark} />
          ) : (
            <Plus size={18} color={Colors.dark} />
          )}
          <Text style={styles.addButtonText}>
            {uploading ? "Uploading…" : "Add Progress Photo"}
          </Text>
        </Pressable>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Styles
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    padding: Spacing.md,
  },

  // Stats card
  statsCard: {
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    color: Colors.gold,
    fontSize: FontSizes.lg,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    backgroundColor: Colors.border,
  },

  // Filter tabs
  filterRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    backgroundColor: Colors.navy,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    alignItems: "center",
  },
  filterTabActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  filterTabText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  filterTabTextActive: {
    color: Colors.dark,
  },

  // Photo grid
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  photoCard: {
    flexBasis: "48%",
    flexGrow: 1,
    padding: 0,
    overflow: "hidden",
  },
  photoThumb: {
    width: "100%",
    aspectRatio: 3 / 4,
    backgroundColor: Colors.navyLight,
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  angleBadge: {
    position: "absolute",
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: "rgba(10, 22, 40, 0.8)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  angleBadgeText: {
    color: Colors.gold,
    fontSize: FontSizes.xs,
    fontWeight: "700",
  },
  deleteBtn: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(10, 22, 40, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoInfo: {
    padding: Spacing.sm,
  },
  photoDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  photoDate: {
    color: Colors.silverLight,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  photoNotes: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "400",
    marginTop: 2,
  },

  // Empty state
  emptyCard: {
    marginBottom: Spacing.md,
  },
  emptyContent: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },

  // Add button
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.gold,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    marginTop: Spacing.lg,
  },
  addButtonPressed: {
    opacity: 0.7,
  },
  addButtonText: {
    color: Colors.dark,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },

  // Preview card
  previewCard: {
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  previewTitle: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  previewImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
  },
  previewNote: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    textAlign: "center",
    fontStyle: "italic",
  },

  // Bottom spacer
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
