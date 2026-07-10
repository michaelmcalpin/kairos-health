/**
 * Help & Support screen.
 *
 * Searchable FAQ accordion, contact options, feedback, and version info.
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageCircle,
  Send,
  HelpCircle,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii, APP_VERSION } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* FAQ data                                                            */
/* ------------------------------------------------------------------ */

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "How do I connect my Apple Watch?",
    answer:
      "Go to the Profile tab, then tap Connected Devices. Tap 'Connect Device' and select Apple Watch from the list. Make sure Bluetooth is enabled and your Apple Watch is nearby. You'll be prompted to authorize health data sharing through Apple HealthKit.",
  },
  {
    question: "Why is my glucose data delayed?",
    answer:
      "Continuous glucose monitors (like Dexcom G7) typically have a 5-15 minute lag due to the nature of interstitial fluid readings. Additionally, data syncs to the app every 5 minutes. If delays exceed 30 minutes, try opening the Dexcom app to force a sync, or check that Bluetooth is enabled.",
  },
  {
    question: "How do I change my protocol?",
    answer:
      "Navigate to the Protocols tab and select the protocol you want to modify. Tap 'Edit Protocol' to adjust dosages, schedules, or notes. Some protocol changes may require approval from your care team. You can also create a new protocol by tapping the '+' button.",
  },
  {
    question: "Can I share data with my doctor?",
    answer:
      "Yes! Go to Privacy & Security in Settings, and enable 'Share with Care Team.' You can also generate a shareable health report from the Insights tab by tapping 'Export Report.' This creates a PDF summary that you can email or print for your healthcare provider.",
  },
  {
    question: "How is my Health Score calculated?",
    answer:
      "Your Health Score (0-100) is a composite metric based on multiple biomarkers: HRV, resting heart rate, sleep quality, glucose variability, activity levels, and lab results. Each category is weighted and compared against optimal ranges for your age and gender. The score updates daily as new data comes in.",
  },
  {
    question: "How do I enable notifications?",
    answer:
      "Go to the Profile tab and find the Notifications section. Toggle on the notification types you want: Push Notifications, Email Notifications, Appointment Reminders, Lab Results Alerts, and Protocol Reminders. Make sure you've also allowed notifications in your device's system settings.",
  },
  {
    question: "Is my health data secure?",
    answer:
      "Absolutely. All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We are HIPAA compliant and SOC 2 Type II certified. Your data is stored in secure, US-based data centers. You can enable biometric lock for an extra layer of security. We never sell your data.",
  },
];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function HelpScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const filteredFAQ = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_ITEMS;
    const query = searchQuery.toLowerCase();
    return FAQ_ITEMS.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleSendFeedback = () => {
    Alert.alert("Send Feedback", "How would you like to send feedback?", [
      {
        text: "Email",
        onPress: () => Linking.openURL("mailto:feedback@everist.ai"),
      },
      { text: "In-App", onPress: () => Alert.alert("Send Feedback", "Send us feedback at support@everist.ai") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Search ──────────────────────────────────────────────── */}
        <View style={styles.searchWrap}>
          <Search
            size={18}
            color={Colors.silver}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search FAQ..."
            placeholderTextColor={Colors.silver}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

        {filteredFAQ.length === 0 ? (
          <Card style={styles.emptyCard}>
            <HelpCircle
              size={32}
              color={Colors.silver}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyText}>
              No results found for "{searchQuery}"
            </Text>
            <Text style={styles.emptySubtext}>
              Try different keywords or contact support below.
            </Text>
          </Card>
        ) : (
          <View style={styles.faqList}>
            {filteredFAQ.map((item, index) => (
              <Pressable
                key={index}
                onPress={() => toggleFAQ(index)}
                style={[
                  styles.faqItem,
                  index === filteredFAQ.length - 1 && styles.faqItemLast,
                ]}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  {expandedIndex === index ? (
                    <ChevronUp size={18} color={Colors.gold} />
                  ) : (
                    <ChevronDown size={18} color={Colors.silver} />
                  )}
                </View>
                {expandedIndex === index && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Contact Support ─────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Contact Support</Text>

        <Card style={styles.contactCard}>
          <Text style={styles.contactTitle}>Need more help?</Text>
          <Text style={styles.contactSubtitle}>
            Our support team is available Mon-Fri, 9am-6pm PT.
          </Text>

          <View style={styles.contactOptions}>
            <Pressable
              style={styles.contactOption}
              onPress={() =>
                Linking.openURL("mailto:support@everist.ai")
              }
            >
              <View style={styles.contactIconWrap}>
                <Mail size={20} color={Colors.gold} />
              </View>
              <View>
                <Text style={styles.contactLabel}>Email Support</Text>
                <Text style={styles.contactValue}>support@everist.ai</Text>
              </View>
            </Pressable>

            <View style={styles.contactDivider} />

            <Pressable
              style={styles.contactOption}
              onPress={() => router.push("/(tabs)/chat")}
            >
              <View style={styles.contactIconWrap}>
                <MessageCircle size={20} color={Colors.gold} />
              </View>
              <View>
                <Text style={styles.contactLabel}>Live Chat</Text>
                <Text style={styles.contactValue}>
                  Average response: 2 min
                </Text>
              </View>
            </Pressable>
          </View>
        </Card>

        {/* ── Send Feedback ───────────────────────────────────────── */}
        <Button
          title="Send Feedback"
          variant="secondary"
          size="md"
          icon={<Send size={16} color={Colors.gold} />}
          onPress={handleSendFeedback}
          style={styles.feedbackBtn}
        />

        {/* ── App Version ─────────────────────────────────────────── */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Everist.ai v{APP_VERSION}</Text>
          <Text style={styles.buildText}>Build 1</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl + 32,
  },

  /* Search */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.white,
    fontSize: FontSizes.md,
    paddingVertical: 14,
  },

  /* Section title */
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },

  /* FAQ */
  faqList: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  faqItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  faqItemLast: {
    borderBottomWidth: 0,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
    flex: 1,
    marginRight: Spacing.sm,
  },
  faqAnswer: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    lineHeight: 22,
    marginTop: Spacing.sm,
  },

  /* Empty state */
  emptyCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  emptyIcon: {
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptySubtext: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
  },

  /* Contact */
  contactCard: {
    marginBottom: Spacing.md,
  },
  contactTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginBottom: 4,
  },
  contactSubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
  },
  contactOptions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  contactOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  contactIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  contactLabel: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  contactValue: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  contactDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },

  /* Feedback */
  feedbackBtn: {
    marginBottom: Spacing.lg,
  },

  /* Version */
  versionSection: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  versionText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  buildText: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginTop: 2,
    opacity: 0.6,
  },
});
