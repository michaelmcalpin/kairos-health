/**
 * Expo config plugin: fix fmt consteval error on Xcode 26.4+
 *
 * The `fmt` CocoaPod (used by Hermes) uses C++20 `consteval` in a way
 * that Xcode 26.4+'s stricter Clang rejects. Downgrading ONLY the fmt
 * pod to C++17 sidesteps the issue — C++17 doesn't have `consteval`,
 * so fmt falls back to `constexpr` which compiles cleanly.
 *
 * Safe to remove once on Expo SDK 56+ / React Native >= 0.83.9 (ships fmt 12.1.0).
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function fixFmtConsteval(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      let podfile = fs.readFileSync(podfilePath, "utf8");

      // The fix: force the fmt pod to compile as C++17 instead of C++20.
      // Scoped to the `fmt` target only so the rest of the project stays on C++20.
      const fmtFix = `
# --- Fix fmt consteval error on Xcode 26.4+ ---
post_install do |installer|
  installer.pods_project.targets.each do |target|
    if target.name == 'fmt'
      target.build_configurations.each do |bc|
        bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      end
    end
  end
end
`;

      // Check if there's already a post_install block we need to merge into.
      // Expo/RN Podfiles typically have one. We'll inject our fix into it.
      if (podfile.includes("post_install do |installer|")) {
        // Inject the fmt fix right after the existing post_install opening line
        podfile = podfile.replace(
          /post_install do \|installer\|/,
          `post_install do |installer|
    # Fix fmt consteval error on Xcode 26.4+ (safe to remove on SDK 56+)
    installer.pods_project.targets.each do |target|
      if target.name == 'fmt'
        target.build_configurations.each do |bc|
          bc.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
        end
      end
    end`
        );
      } else {
        // No existing post_install — append our own
        podfile += fmtFix;
      }

      fs.writeFileSync(podfilePath, podfile, "utf8");

      return config;
    },
  ]);
}

module.exports = fixFmtConsteval;
