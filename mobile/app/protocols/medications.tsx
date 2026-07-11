/**
 * Medications screen — empty state.
 *
 * NOTE: Backend does not have a clientPortal.medications router.
 * Medications are managed through clinical docs and coach interactions.
 * This screen shows an honest empty state rather than fake data.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Pill, MessageCircle } from "lucide-react-native";

import { Colors, Spacing, FontSizes } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function MedicationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Medications" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Empty State */}
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Pill size={48} color={Colors.silver} />
          </View>
          <Text style={styles.emptyTitle}>No medications tracked yet</Text>
          <Text style={styles.emptyMessage}>
            Medication tracking is managed through your care team.
            Contact your coach or doctor to add medications to your profile.
          </Text>
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>How medication tracking works</Text>
          <Text style={styles.infoText}>
            Your care team manages your medication records as part of your
            clinical profile. Once medications are added, you will be able to
            view them here along with dosage information and refill reminders.
          </Text>
        </Card>

        {/* Coming Soon */}
        <Button
          title="Add Medication"
          variant="secondary"
          size="lg"
          style={styles.ctaButton}
          onPress={() =>
            Alert.alert(
              "Coming Soon",
              "Self-service medication tracking is coming in a future update. For now, contact your coach to update medications.",
            )
          }
        />

        {/* Talk to Coach */}
        <Button
          title="Talk to Your Coach"
          variant="primary"
          size="lg"
          style={styles.ctaButton}
          icon={<MessageCircle size={18} color={Colors.dark} />}
          onPress={() => router.push("/coach")}
        />
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

  /* Empty State */
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyMessage: {
    color: Colors.silver,
    fontSize: FontSizes.md,
    textAlign: "center",
    lineHeight: 22,
  },

  /* Info Card */
  infoCard: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  infoTitle: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.gold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  infoText: {
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
    lineHeight: 20,
  },

  /* CTA */
  ctaButton: {
    marginTop: Spacing.xs,
  },
});
