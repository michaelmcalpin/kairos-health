/**
 * Welcome step — first screen of the onboarding flow.
 *
 * Shows the Everist.ai brand mark, headline, three value-prop bullets,
 * and a "Get Started" CTA.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Heart, Sparkles, Users } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { SummitGlyph } from "@/components/brand";

interface Props {
  onContinue: () => void;
}

export function WelcomeStep({ onContinue }: Props) {
  return (
    <View style={styles.container}>
      {/* Brand mark */}
      <View style={styles.logoWrap}>
        <SummitGlyph size={64} />
      </View>

      <Text style={styles.title}>Welcome to Everist.ai</Text>
      <Text style={styles.subtitle}>
        Your journey to optimal health starts here. Let's personalize your
        experience in a few quick steps.
      </Text>

      {/* Value props */}
      <View style={styles.features}>
        <FeatureRow
          icon={<Heart size={22} color={Colors.gold} />}
          title="Track Your Health"
          description="Monitor biomarkers, vitals, and lab results in one dashboard"
        />
        <FeatureRow
          icon={<Sparkles size={22} color={Colors.gold} />}
          title="AI-Powered Insights"
          description="Personalized recommendations backed by your real data"
        />
        <FeatureRow
          icon={<Users size={22} color={Colors.gold} />}
          title="Expert Coaching"
          description="Connect with physicians and longevity coaches"
        />
      </View>

      <Button
        title="Get Started"
        variant="primary"
        size="lg"
        onPress={onContinue}
        style={styles.cta}
      />
    </View>
  );
}

function FeatureRow({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>{icon}</View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSizes.title,
    fontWeight: "800",
    color: Colors.white,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.silver,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  features: {
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSizes.md,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    lineHeight: 18,
  },
  cta: {
    width: "100%",
  },
});
