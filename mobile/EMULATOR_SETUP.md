# Everist.ai iOS App — Emulator Setup Guide

## Prerequisites

You need a Mac with macOS 13+ (Ventura or later). The iOS Simulator ships with Xcode.

---

## Step 1: Install Xcode

1. Open the **App Store** on your Mac
2. Search for **Xcode** and install it (it's free, ~12 GB download)
3. Once installed, open Xcode once to accept the license agreement
4. Install the Command Line Tools:

```bash
xcode-select --install
```

5. Install an iOS Simulator runtime (if not already present):
   - Open **Xcode → Settings → Platforms**
   - Click the **+** button and add **iOS 17** (or the latest available)
   - This downloads the simulator runtime (~7 GB)

---

## Step 2: Install Node.js

If you don't already have Node.js installed:

```bash
# Using Homebrew (recommended)
brew install node

# Verify
node --version   # Should be 18+ or 20+
npm --version
```

---

## Step 3: Install Expo CLI & EAS CLI

```bash
npm install -g expo-cli eas-cli
```

---

## Step 4: Install Project Dependencies

Navigate to the mobile app directory and install:

```bash
cd ~/Library/CloudStorage/Dropbox/Claud-AI-Longevity/kairos-app/mobile
npm install
```

---

## Step 5: Create the Environment File

Create a `.env` file in the `mobile/` directory:

```bash
cp .env.example .env
```

Then edit `.env` with your values:

```
EXPO_PUBLIC_API_URL=https://kairos-health.vercel.app
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_key_here
```

**Note:** The app has a demo fallback mode — if the API URL points to localhost or is unreachable, it will use sample data so you can preview all screens without a running backend.

---

## Step 6: Start the Expo Dev Server

```bash
npx expo start
```

You'll see a QR code and menu in the terminal. Press **`i`** to open the iOS Simulator.

If Expo can't find a simulator, try:

```bash
npx expo start --ios
```

This will automatically boot the simulator and install the Expo Go development client.

---

## Step 7: Running in the Simulator

Once the simulator opens:
- The app will compile and load (first launch takes 30-60 seconds)
- You'll see the Everist.ai splash screen, then the sign-in page
- Since Clerk isn't configured yet, the auth guard will redirect to sign-in

### To browse all screens without auth:

Temporarily bypass the auth guard by editing `lib/auth-guard.tsx`. Change the early return:

```typescript
// In auth-guard.tsx, find the AuthGuard component
// Temporarily add this at the top of the component body:
const skipAuth = true; // TEMP: remove before production
if (skipAuth) return <>{children}</>;
```

This lets you navigate through every screen using the tab bar and tap into sub-screens.

---

## Simulator Tips

| Action | How |
|--------|-----|
| Go Home | `Cmd + Shift + H` |
| Shake (dev menu) | `Cmd + D` (or `Ctrl + Cmd + Z`) |
| Reload app | Press `r` in the terminal |
| Toggle keyboard | `Cmd + K` in simulator |
| Rotate device | `Cmd + Left/Right Arrow` |
| Screenshot | `Cmd + S` |
| Change device | `Cmd + Shift + 2` in Xcode, pick device |

---

## Troubleshooting

### "No simulators found"
```bash
# List available simulators
xcrun simctl list devices available

# If empty, open Xcode → Settings → Platforms → install iOS runtime
```

### "Command not found: expo"
```bash
# Use npx instead
npx expo start
```

### Metro bundler port conflict
```bash
# Kill existing Metro process
lsof -ti:8081 | xargs kill -9

# Or use a different port
npx expo start --port 8082
```

### Slow first build
First launch compiles all native modules. Subsequent launches are much faster. If it seems stuck, check the terminal for build progress.

### "Unable to resolve module" errors
```bash
# Clear caches and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

---

## Next Steps

Once you can see the app in the simulator:
1. Browse through all 5 tabs (Home, Health, Protocols, Chat, Profile)
2. Tap into health detail screens (Sleep, Glucose, Blood Pressure, etc.)
3. Check the notification center, appointment booking flow, and device connections
4. Try the AI Health Analysis and Q&A screens under Insights

When your Clerk key is configured, the full auth flow (sign-in, sign-up, onboarding) will work.
