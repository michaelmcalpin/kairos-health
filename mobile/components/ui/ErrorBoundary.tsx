/**
 * ErrorBoundary — catches render errors and displays a dark-themed
 * fallback UI with a "Try Again" button.
 *
 * Logs the error and component stack to the console for debugging.
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

/* ----------------------------------------------------------------------- */
/* Types                                                                   */
/* ----------------------------------------------------------------------- */

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback — receives the error and a reset function. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/* ----------------------------------------------------------------------- */
/* Component                                                               */
/* ----------------------------------------------------------------------- */

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              {this.state.error.message || "An unexpected error occurred."}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
              onPress={this.handleReset}
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

/* ----------------------------------------------------------------------- */
/* Styles                                                                  */
/* ----------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: "center",
    maxWidth: 360,
    width: "100%",
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    color: Colors.white,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.gold,
    borderRadius: Radii.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 160,
  },
  buttonText: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.dark,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
