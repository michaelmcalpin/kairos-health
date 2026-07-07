#!/bin/bash
# EAS Build post-install hook
# Runs after npm install + pod install, before Xcode build.
#
# Fixes the fmt consteval error on Xcode 26.4+ by patching the fmt pod
# source to disable consteval (falls back to constexpr).
# Safe to remove once on Expo SDK 56+ / React Native >= 0.83.9.

set -e

echo "=== Patching fmt pod for Xcode 26 consteval compatibility ==="

# Find the fmt base header (location varies by fmt version)
FMT_BASE=""
for candidate in \
  "ios/Pods/fmt/include/fmt/base.h" \
  "ios/Pods/fmt/include/fmt/core.h" \
  "ios/Pods/fmt/include/fmt/format.h"; do
  if [ -f "$candidate" ]; then
    FMT_BASE="$candidate"
    break
  fi
done

if [ -z "$FMT_BASE" ]; then
  echo "WARNING: Could not find fmt header files. Skipping patch."
  echo "  Checked: ios/Pods/fmt/include/fmt/{base,core,format}.h"
  exit 0
fi

echo "Found fmt header: $FMT_BASE"

# Patch 1: Disable FMT_USE_CONSTEVAL (changes consteval -> constexpr)
if grep -q "FMT_USE_CONSTEVAL" "$FMT_BASE"; then
  sed -i.bak 's/#define FMT_USE_CONSTEVAL 1/#define FMT_USE_CONSTEVAL 0/g' "$FMT_BASE"
  echo "Patched FMT_USE_CONSTEVAL=1 -> 0 in $FMT_BASE"
else
  echo "FMT_USE_CONSTEVAL not found in $FMT_BASE, trying alternative approach..."
fi

# Patch 2: Also patch format-inl.h if it has direct consteval usage
FMT_INL="ios/Pods/fmt/include/fmt/format-inl.h"
if [ -f "$FMT_INL" ]; then
  # Replace any remaining consteval with constexpr in fmt headers
  for header in ios/Pods/fmt/include/fmt/*.h; do
    if grep -q "consteval" "$header" 2>/dev/null; then
      sed -i.bak 's/consteval/constexpr/g' "$header"
      echo "Replaced consteval -> constexpr in $header"
    fi
  done
fi

# Clean up backup files
find ios/Pods/fmt -name "*.bak" -delete 2>/dev/null || true

echo "=== fmt patch complete ==="
