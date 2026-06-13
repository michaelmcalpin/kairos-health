/**
 * Medications screen — active prescriptions, refill dates, and interaction warnings.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Stack } from "expo-router";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  prescriber: string;
  nextRefill: string;
  daysUntilRefill: number;
  purpose: string;
}

const MEDICATIONS: Medication[] = [
  {
    name: "Metformin",
    dosage: "500 mg",
    frequency: "Twice daily with meals",
    prescriber: "Dr. Sarah Chen",
    nextRefill: "Jun 28, 2026",
    daysUntilRefill: 15,
    purpose: "Blood glucose management, longevity",
  },
  {
    name: "Rosuvastatin",
    dosage: "10 mg",
    frequency: "Once daily, evening",
    prescriber: "Dr. Sarah Chen",
    nextRefill: "Jul 5, 2026",
    daysUntilRefill: 22,
    purpose: "LDL-P and ApoB reduction",
  },
  {
    name: "Telmisartan",
    dosage: "40 mg",
    frequency: "Once daily, morning",
    prescriber: "Dr. James Park",
    nextRefill: "Jun 20, 2026",
    daysUntilRefill: 7,
    purpose: "Blood pressure management",
  },
  {
    name: "Low-Dose Naltrexone",
    dosage: "4.5 mg",
    frequency: "Once daily, bedtime",
    prescriber: "Dr. Sarah Chen",
    nextRefill: "Jul 12, 2026",
    daysUntilRefill: 29,
    purpose: "Immune modulation, inflammation",
  },
];

interface Interaction {
  meds: string;
  severity: "warning" | "info";
  description: string;
}

const INTERACTIONS: Interaction[] = [
  {
    meds: "Metformin + Alcohol",
    severity: "warning",
    description: "Increased risk of lactic acidosis. Limit alcohol intake.",
  },
  {
    meds: "Rosuvastatin + Grapefruit",
    severity: "info",
    description:
      "Grapefruit may increase statin levels. Moderate consumption is generally safe at this dose.",
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function MedicationsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Medications" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Medications */}
        <Card style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Active Medications</Text>
            <Badge label={`${MEDICATIONS.length} Active`} variant="info" />
          </View>
        </Card>

        {MEDICATIONS.map((med, idx) => {
          const refillSoon = med.daysUntilRefill <= 7;

          return (
            <Card key={idx} style={styles.medCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medDosage}>{med.dosage}</Text>
              </View>

              <Text style={styles.medFrequency}>{med.frequency}</Text>
              <Text style={styles.medPurpose}>{med.purpose}</Text>

              <View style={styles.medMeta}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Prescriber</Text>
                  <Text style={styles.metaValue}>{med.prescriber}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Next Refill</Text>
                  <View style={styles.refillRow}>
                    <Text
                      style={[
                        styles.metaValue,
                        refillSoon && styles.refillSoon,
                      ]}
                    >
                      {med.nextRefill}
                    </Text>
                    {refillSoon && (
                      <Badge label="Refill Soon" variant="warning" />
                    )}
                  </View>
                </View>
              </View>
            </Card>
          );
        })}

        {/* Interaction Warnings */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Interaction Warnings</Text>

          {INTERACTIONS.map((interaction, idx) => (
            <View
              key={idx}
              style={[
                styles.interactionRow,
                {
                  backgroundColor:
                    interaction.severity === "warning"
                      ? Colors.warningMuted
                      : Colors.infoMuted,
                  borderLeftColor:
                    interaction.severity === "warning"
                      ? Colors.warning
                      : Colors.info,
                },
              ]}
            >
              <Text
                style={[
                  styles.interactionMeds,
                  {
                    color:
                      interaction.severity === "warning"
                        ? Colors.warning
                        : Colors.info,
                  },
                ]}
              >
                {interaction.meds}
              </Text>
              <Text style={styles.interactionDesc}>
                {interaction.description}
              </Text>
            </View>
          ))}
        </Card>

        {/* Talk to Doctor */}
        <Button
          title="Talk to Doctor"
          variant="primary"
          size="lg"
          style={styles.ctaButton}
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

  /* Sections */
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.gold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  /* Medication cards */
  medCard: {
    gap: Spacing.xs,
  },
  medName: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  medDosage: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.gold,
  },
  medFrequency: {
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
  },
  medPurpose: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    fontStyle: "italic",
  },

  /* Metadata */
  medMeta: {
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  metaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  refillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  refillSoon: {
    color: Colors.warning,
  },

  /* Interactions */
  interactionRow: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderLeftWidth: 3,
    gap: 4,
  },
  interactionMeds: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  interactionDesc: {
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
  },

  /* CTA */
  ctaButton: {
    marginTop: Spacing.xs,
  },
});
