/**
 * Expo config plugin: Xcode 26 compatibility fixes for Expo SDK 53
 *
 * Fixes TWO Xcode 26 build failures:
 *
 * 1. fmt consteval error — The `fmt` CocoaPod (Hermes dependency) uses
 *    C++20 `consteval` which Xcode 26's stricter Clang rejects.
 *    Fix: set FMT_USE_CONSTEVAL=0 and downgrade fmt to C++17.
 *
 * 2. RCTReactNativeFactoryDelegate not found — Xcode 26 enables Swift
 *    Explicit Precompiled Modules by default. The Expo pod's module map
 *    doesn't declare a dependency on React-RCTAppDelegate, so the
 *    compiler can't find the RCTReactNativeFactoryDelegate protocol.
 *    Fix: disable SWIFT_ENABLE_EXPLICIT_MODULES for all pods.
 *
 * Both fixes are injected AFTER react_native_post_install() so that
 * RN's own build-setting sweep doesn't overwrite our changes.
 *
 * Safe to remove once upgraded to Expo SDK 54+ (designed for Xcode 26).
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const FIX_MARKER = "# [xcode26-compat]";

function fixFmtConsteval(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      let podfile = fs.readFileSync(podfilePath, "utf8");

      console.log("[xcode26-compat] Reading Podfile from:", podfilePath);
      console.log("[xcode26-compat] Podfile length:", podfile.length, "chars");

      // Don't double-inject if the plugin runs twice
      if (podfile.includes(FIX_MARKER)) {
        console.log("[xcode26-compat] Fixes already present — skipping.");
        return config;
      }

      // The code to inject inside the post_install block, AFTER react_native_post_install()
      const xcode26FixLines = [
        "",
        `    ${FIX_MARKER} Xcode 26 compatibility fixes for Expo SDK 53`,
        "    installer.pods_project.targets.each do |target|",
        "      target.build_configurations.each do |bc|",
        "        # Fix 1: Disable Swift Explicit Modules (Xcode 26 default)",
        "        # The Expo pod's module map doesn't declare all its dependencies,",
        "        # so explicit module compilation fails to find RCTReactNativeFactoryDelegate.",
        "        bc.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'",
        "",
        "        # Fix 2: fmt consteval — only for the fmt pod",
        "        if target.name == 'fmt'",
        "          bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']",
        "          bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_USE_CONSTEVAL=0'",
        "          bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'",
        "        end",
        "      end",
        "    end",
      ].join("\n");

      let injected = false;

      if (podfile.includes("post_install")) {
        // Strategy: walk backwards from the end of the file to find the
        // last two bare `end` keywords. In the standard Expo Podfile:
        //   - the LAST  `end` closes the `target '...' do` block
        //   - the 2nd-to-last `end` closes `post_install do |installer|`
        // We splice our fix just BEFORE that 2nd-to-last `end`, so it
        // runs inside post_install but AFTER react_native_post_install().

        const lines = podfile.split("\n");
        const endIndices = [];

        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].trim() === "end") {
            endIndices.push(i);
            if (endIndices.length >= 2) break;
          }
        }

        if (endIndices.length >= 2) {
          const postInstallEndLine = endIndices[1]; // closes post_install
          lines.splice(postInstallEndLine, 0, xcode26FixLines);
          podfile = lines.join("\n");
          injected = true;
          console.log(
            `[xcode26-compat] Injected Xcode 26 fixes AFTER react_native_post_install (before line ${postInstallEndLine + 1})`
          );
        }
      }

      if (!injected) {
        // Fallback: no post_install block found (unusual). Append a standalone one.
        console.log(
          "[xcode26-compat] No post_install block detected — appending standalone block."
        );
        podfile += [
          "",
          `${FIX_MARKER} Standalone post_install for Xcode 26 compat`,
          "post_install do |installer|",
          "  installer.pods_project.targets.each do |target|",
          "    target.build_configurations.each do |bc|",
          "      bc.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'",
          "      if target.name == 'fmt'",
          "        bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']",
          "        bc.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] << 'FMT_USE_CONSTEVAL=0'",
          "        bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'",
          "      end",
          "    end",
          "  end",
          "end",
          "",
        ].join("\n");
      }

      fs.writeFileSync(podfilePath, podfile, "utf8");

      // Log the tail of the Podfile so EAS Build logs show it worked
      const finalLines = podfile.split("\n");
      const tail = finalLines.slice(-30);
      console.log("[xcode26-compat] === Podfile tail (last 30 lines) ===");
      tail.forEach((line, i) => {
        console.log(`  ${finalLines.length - 30 + i + 1}: ${line}`);
      });
      console.log("[xcode26-compat] === Done ===");

      return config;
    },
  ]);
}

module.exports = fixFmtConsteval;
