// DEV MODE: Clerk bypassed — forms navigate directly without auth
/**
 * Sign In screen for the Everist.ai mobile app.
 *
 * Uses local state with direct navigation (Clerk auth disabled).
 * Supports social login via Apple and Google OAuth (placeholder).
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Eye, EyeOff, Apple, Chrome } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export default function SignInScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      // DEV MODE: skip Clerk auth, navigate directly
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Sign In Failed", "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, password, router]);

  const handleOAuthSignIn = useCallback(
    async (strategy: "oauth_apple" | "oauth_google") => {
      Alert.alert(
        "OAuth",
        `${strategy === "oauth_apple" ? "Apple" : "Google"} sign-in requires additional configuration.`,
      );
    },
    [],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo area */}
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>EVERIST</Text>
          <Text style={styles.subtitle}>Private Health Management</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.silver}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!loading}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor={Colors.silver}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                hitSlop={8}
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.silver} />
                ) : (
                  <Eye size={20} color={Colors.silver} />
                )}
              </Pressable>
            </View>
          </View>

          {/* Sign In button */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.dark} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social login row */}
          <View style={styles.socialRow}>
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => handleOAuthSignIn("oauth_apple")}
            >
              <Apple size={20} color={Colors.white} />
              <Text style={styles.socialButtonText}>Apple</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => handleOAuthSignIn("oauth_google")}
            >
              <Chrome size={20} color={Colors.white} />
              <Text style={styles.socialButtonText}>Google</Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom link */}
        <View style={styles.bottomLink}>
          <Text style={styles.bottomText}>Don't have an account? </Text>
          <Pressable onPress={() => router.push("/sign-up")}>
            <Text style={styles.linkText}>Sign Up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },

  /* Logo */
  logoArea: {
    alignItems: "center",
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xl,
  },
  logoText: {
    fontSize: 36,
    fontWeight: "700",
    color: Colors.gold,
    letterSpacing: 6,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    marginTop: Spacing.xs,
    letterSpacing: 1,
  },

  /* Form */
  form: {
    gap: Spacing.md,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: "500",
    color: Colors.silverLight,
  },
  input: {
    backgroundColor: Colors.navy,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.white,
  },

  /* Password */
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  eyeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },

  /* Primary button */
  primaryButton: {
    backgroundColor: Colors.gold,
    borderRadius: Radii.md,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.dark,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  /* Divider */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    marginHorizontal: Spacing.md,
  },

  /* Social buttons */
  socialRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: "transparent",
  },
  socialButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.white,
  },

  /* Bottom link */
  bottomLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  bottomText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },
  linkText: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.gold,
  },
});
