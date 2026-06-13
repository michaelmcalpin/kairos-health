/**
 * Sign Up screen for the Everist.ai mobile app.
 *
 * Uses Clerk's useSignUp hook for email/password registration.
 * Includes email verification step and social OAuth placeholders.
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
import { useSignUp } from "@clerk/clerk-expo";
import { Eye, EyeOff, Apple, Chrome } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verification state
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const handleSignUp = useCallback(async () => {
    if (!isLoaded) return;

    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      await signUp.create({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        emailAddress: email.trim(),
        password,
      });

      // Send email verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        "An unexpected error occurred. Please try again.";
      Alert.alert("Sign Up Failed", message);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, firstName, lastName, email, password, signUp]);

  const handleVerification = useCallback(async () => {
    if (!isLoaded) return;

    if (!verificationCode.trim()) {
      Alert.alert(
        "Missing Code",
        "Please enter the verification code sent to your email.",
      );
      return;
    }

    setLoading(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/onboarding");
      } else {
        Alert.alert(
          "Verification Incomplete",
          "Please check the code and try again.",
        );
      }
    } catch (err: any) {
      const message =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        "Verification failed. Please try again.";
      Alert.alert("Verification Failed", message);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, verificationCode, signUp, setActive, router]);

  const handleOAuthSignUp = useCallback(
    async (strategy: "oauth_apple" | "oauth_google") => {
      if (!isLoaded) return;

      try {
        Alert.alert(
          "OAuth",
          `${strategy === "oauth_apple" ? "Apple" : "Google"} sign-up requires additional configuration.`,
        );
      } catch (err: any) {
        const message =
          err?.errors?.[0]?.message ?? "OAuth sign-up failed. Please try again.";
        Alert.alert("Sign Up Failed", message);
      }
    },
    [isLoaded],
  );

  // ---------- Verification view ----------
  if (pendingVerification) {
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
          <View style={styles.logoArea}>
            <Text style={styles.logoText}>EVERIST</Text>
            <Text style={styles.subtitle}>Verify Your Email</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.verificationHint}>
              We sent a verification code to {email}. Enter it below to
              complete your registration.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 6-digit code"
                placeholderTextColor={Colors.silver}
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                editable={!loading}
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleVerification}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={Colors.dark} />
              ) : (
                <Text style={styles.primaryButtonText}>Verify Email</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => setPendingVerification(false)}
              style={styles.backButton}
            >
              <Text style={styles.linkText}>Back to Sign Up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ---------- Main sign-up view ----------
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
          {/* Name row */}
          <View style={styles.nameRow}>
            <View style={[styles.fieldGroup, styles.nameField]}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="First"
                placeholderTextColor={Colors.silver}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete="given-name"
                editable={!loading}
              />
            </View>

            <View style={[styles.fieldGroup, styles.nameField]}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Last"
                placeholderTextColor={Colors.silver}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
                editable={!loading}
              />
            </View>
          </View>

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
                placeholder="Create a password"
                placeholderTextColor={Colors.silver}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
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
            <Text style={styles.passwordHint}>
              Must be at least 8 characters with a number and a letter.
            </Text>
          </View>

          {/* Create Account button */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.dark} />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
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
              onPress={() => handleOAuthSignUp("oauth_apple")}
            >
              <Apple size={20} color={Colors.white} />
              <Text style={styles.socialButtonText}>Apple</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => handleOAuthSignUp("oauth_google")}
            >
              <Chrome size={20} color={Colors.white} />
              <Text style={styles.socialButtonText}>Google</Text>
            </Pressable>
          </View>
        </View>

        {/* Bottom link */}
        <View style={styles.bottomLink}>
          <Text style={styles.bottomText}>Already have an account? </Text>
          <Pressable onPress={() => router.push("/sign-in")}>
            <Text style={styles.linkText}>Sign In</Text>
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
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
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

  /* Name row */
  nameRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  nameField: {
    flex: 1,
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
  passwordHint: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    marginTop: 2,
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

  /* Verification */
  verificationHint: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
    textAlign: "center",
  },
  backButton: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
});
