/**
 * Expo config plugin: fix fmt consteval error on Xcode 26.4+
 *
 * The `fmt` CocoaPod (used by Hermes) uses C++20 `consteval` in a way
 * that Xcode 26.4+'s stricter Clang rejects. We fix this two ways:
 *
 *   1. GCC_PREPROCESSOR_DEFINITIONS += FMT_USE_CONSTEVAL=0
 *      → tells fmt to fall back to constexpr (most targeted fix)
 *   2. CLANG_CXX_LANGUAGE_STANDARD = c++17  (for the fmt target only)
 *      → C++17 has no consteval keyword, so fmt's #ifdef skips it
 *
 * CRITICAL: The fix is injected AFTER react_native_post_install() so
 * that RN's own build-setting sweep doesn't overwrite our changes.
 *
 * Safe to remove once on Expo SDK 56+ / React Native >= 0.83.9 (ships fmt 12.1.0).
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const FMT_FIX_MARKER = "# [fix-fmt-consteval]";

function fixFmtConsteval(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      let podfile = fs.readFileSync(podfilePath, "utf8");

      console.log("[fix-fmt-consteval] Reading Podfile from:", podfilePath);
      console.log("[fix-fmt-consteval] Podfile length:", podfile.length, "chars");

      // Don't double-inject if the plugin runs twice
      if (podfile.includes(FMT_FIX_MARKER)) {
        console.log("[fix-fmt-consteval] Fix already present — skipping.");
        return config;
      }

      // The code to inject inside the post_install block, AFTER react_native_post_install()
      const fmtFixLines = [
        "",
        `    ${FMT_FIX_MARKER} Fix fmt consteval for Xcode 26.4+`,
        "    installer.pods_project.targets.each do |target|",
        "      if target.name == 'fmt'",
        "        target.build_configurations.each do |bc|",
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
          lines.splice(postInstallEndLine, 0, fmtFixLines);
          podfile = lines.join("\n");
          injected = true;
          console.log(
            `[fix-fmt-consteval] Injected fmt fix AFTER react_native_post_install (before line ${postInstallEndLine + 1})`
          );
        }
      }

      if (!injected) {
        // Fallback: no post_install block found (unusual). Append a standalone one.
        console.log(
          "[fix-fmt-consteval] No post_install block detected — appending standalone block."
        );
        podfile += [
          "",
          `${FMT_FIX_MARKER} Standalone post_install for fmt consteval fix`,
          "post_install do |installer|",
          "  installer.pods_project.targets.each do |target|",
          "    if target.name == 'fmt'",
          "      target.build_configurations.each do |bc|",
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
      const tail = finalLines.slice(-25);
      console.log("[fix-fmt-consteval] === Podfile tail (last 25 lines) ===");
      tail.forEach((line, i) => {
        console.log(`  ${finalLines.length - 25 + i + 1}: ${line}`);
      });
      console.log("[fix-fmt-consteval] === Done ===");

      return config;
    },
  ]);
}

module.exports = fixFmtConsteval;
