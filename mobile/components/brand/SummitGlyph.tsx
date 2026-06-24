/**
 * Summit Glyph -- EVERIST.ai brand mark (React Native)
 *
 * A stylized mountain-summit icon with the "E" monogram.
 * Uses Summit theme colors: Glacial Navy + Ice Blue.
 * Port of the web component in src/components/brand/SummitGlyph.tsx.
 */

import React from "react";
import { View, Text as RNText, StyleSheet } from "react-native";
import Svg, {
  Rect,
  Path,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";

import { Colors, FontSizes } from "@/lib/constants";

/** Summit theme accent colors (Ice Blue) matching the web app. */
const ACCENT = "#4A90D9";
const ACCENT_LIGHT = "#6AAAE8";

/** Navy gradient for the rounded-square background. */
const BG_START = Colors.navy; // #0F1D32
const BG_END = Colors.navyLight; // #162440

interface SummitGlyphProps {
  /** Overall width and height of the glyph. Default 40. */
  size?: number;
  /** Show "EVERIST.ai" text next to the glyph. Default false. */
  showText?: boolean;
}

export function SummitGlyph({ size = 40, showText = false }: SummitGlyphProps) {
  return (
    <View style={styles.wrapper}>
      <Svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        accessibilityLabel="EVERIST.ai"
      >
        <Defs>
          {/* Background gradient -- navy to navy-light */}
          <LinearGradient id="summit-bg-rn" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={BG_START} />
            <Stop offset="100%" stopColor={BG_END} />
          </LinearGradient>

          {/* Accent gradient -- accent-light to accent */}
          <LinearGradient
            id="summit-accent-rn"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <Stop offset="0%" stopColor={ACCENT_LIGHT} />
            <Stop offset="100%" stopColor={ACCENT} />
          </LinearGradient>
        </Defs>

        {/* Base shape -- rounded square */}
        <Rect width="64" height="64" rx="14" fill="url(#summit-bg-rn)" />

        {/* Mountain summit silhouette -- outer triangle outline */}
        <Path
          d="M12 48 L32 16 L52 48 Z"
          fill="none"
          stroke={ACCENT}
          strokeWidth="2.5"
          strokeLinejoin="round"
          opacity={0.3}
        />

        {/* Mountain summit silhouette -- inner filled triangle */}
        <Path
          d="M22 48 L32 28 L42 48 Z"
          fill={ACCENT}
          opacity={0.15}
        />

        {/* E monogram */}
        <SvgText
          x="32"
          y="42"
          textAnchor="middle"
          fontFamily="System"
          fontWeight="700"
          fontSize="28"
          fill="url(#summit-accent-rn)"
        >
          E
        </SvgText>

        {/* Summit dot */}
        <Circle cx="48" cy="18" r="3" fill={ACCENT} opacity={0.8} />
      </Svg>

      {showText && (
        <RNText style={styles.brandText}>EVERIST.ai</RNText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandText: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginLeft: 8,
    letterSpacing: 0.5,
  },
});
