# Everist.ai — TestFlight Submission Guide

Everything you need to get the Expo React Native app into TestFlight for beta testing.

---

## Prerequisites

Before you start, make sure you have:

1. **Apple Developer Account** ($99/year) — enroll at [developer.apple.com](https://developer.apple.com/programs/enroll/)
2. **EAS CLI** installed globally
3. **Expo account** linked to the project (owner: `michael-everist`)
4. **Clerk publishable key** from your Clerk dashboard

---

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

Log in with the Expo account that owns the `michael-everist` organization.

---

## Step 2: Set Environment Variables in EAS

The mobile app needs two environment variables baked into the build. Set them as EAS secrets so they're available during the build process:

```bash
cd mobile

# Your Vercel-hosted web app URL (the tRPC API backend)
eas secret:create --name EXPO_PUBLIC_API_URL --value "https://kairos-health.vercel.app" --scope project

# Your Clerk publishable key (same one used in the web app's NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
eas secret:create --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value "pk_live_YOUR_CLERK_KEY_HERE" --scope project
```

> **Important:** Use your **production** Clerk publishable key (`pk_live_...`), not the test key (`pk_test_...`), for the TestFlight build. The test key only works in Clerk's development instance.

---

## Step 3: Link Your Apple Developer Account

EAS needs access to your Apple Developer account to create certificates and provisioning profiles. Run:

```bash
eas credentials
```

Select **iOS**, then **production**. EAS will walk you through signing in with your Apple ID and creating/selecting a distribution certificate and provisioning profile. EAS can manage these automatically — choose "Let EAS handle it" when prompted.

---

## Step 4: Build for iOS

From the `mobile/` directory:

```bash
eas build --platform ios --profile production
```

This will:
- Upload your source code to EAS Build servers
- Generate the native iOS project (`expo prebuild` runs automatically)
- Compile a production `.ipa` file signed for App Store / TestFlight distribution
- Auto-increment the build number (configured in `eas.json`)

The build takes ~10-20 minutes. You'll get a URL to track progress.

> **Note:** You do NOT need Xcode, a Mac, or a local `ios/` directory. EAS Build runs in the cloud.

---

## Step 5: Submit to TestFlight

Once the build completes:

```bash
eas submit --platform ios --profile production
```

EAS will prompt you to select the build you just created. It uses the Apple ID configured in `eas.json` (`michael.mcalpin@gmail.com`) to submit.

You'll need to provide:
- **App Store Connect API Key** (recommended) or your Apple ID password + app-specific password
- To create an API Key: go to [App Store Connect > Users and Access > Integrations > App Store Connect API](https://appstoreconnect.apple.com/access/integrations/api), create a key with "Developer" role, download the `.p8` file

Alternatively, combine build + submit in one command:

```bash
eas build --platform ios --profile production --auto-submit
```

---

## Step 6: Complete App Store Connect Setup

After the first submission, go to [App Store Connect](https://appstoreconnect.apple.com):

1. **App Information**: The app should appear automatically with bundle ID `ai.everist.app`
2. **TestFlight tab**: Your build will show as "Processing" for a few minutes
3. **Compliance**: When prompted, answer "No" to export compliance (the app doesn't use non-standard encryption beyond HTTPS)
4. **Test Information**: Fill in the required fields:
   - Beta App Description: "Everist.ai — AI-powered health coaching platform"
   - Contact email: michael.mcalpin@gmail.com
   - Privacy Policy URL: (required — can be a simple page on everist.ai)

---

## Step 7: Add Beta Testers

In App Store Connect > TestFlight:

**Internal testers** (up to 100, no review needed):
- Go to "Internal Group" or create one
- Add testers by Apple ID email — they get an invite immediately

**External testers** (up to 10,000, requires Apple review):
- Create an External Group
- Add testers by email
- Submit the build for Beta App Review (usually takes 24-48 hours for first review)

Testers will receive an email invitation to install the app via the TestFlight app on their iPhone.

---

## App Configuration Reference

| Setting | Value |
|---------|-------|
| App Name | Everist.ai |
| Bundle ID | `ai.everist.app` |
| Version | 1.0.0 |
| EAS Project ID | `de1593e7-ee5f-4793-bc1d-0f789cd3696d` |
| Expo Owner | `michael-everist` |
| Apple ID for submit | `michael.mcalpin@gmail.com` |
| Scheme | `everist` |
| Minimum iOS | Default (iOS 16+) |

---

## Updating the App

To push a new build to TestFlight:

```bash
cd mobile
eas build --platform ios --profile production --auto-submit
```

The build number auto-increments. Testers with automatic updates enabled will get the new version automatically.

---

## Troubleshooting

**"No matching provisioning profiles found"**
Run `eas credentials` and let EAS regenerate them. Make sure your Apple Developer membership is active.

**Build fails with "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is empty"**
Verify secrets are set: `eas secret:list`. Re-create if needed.

**App crashes on launch**
Check that `EXPO_PUBLIC_API_URL` points to your live Vercel deployment and that the Clerk key matches the environment (production Clerk instance for production builds).

**"App is not available for testing"**
In App Store Connect, check if the build is still processing. Also ensure you've answered the export compliance question.

---

## Git Commits Ready to Push

Before building, push all pending commits to your GitHub repo. From your local machine:

```bash
git push origin main
```

Commits prepared in this session:
- `0a905a6` — Fix admin portal bugs: permission error, React hooks violation, missing safe wrappers
- `510d7d5` — Polish admin portals: fix branding, remove fake flows, show real user names
- `9ff90cf` — Remove fake trend values and standardize pricing to canonical tier model
- `db4f032` — Production polish: replace alert() with inline errors, complete Everist rebrand
- `8f74c70` — Update email template and sender defaults from kairos.health to everist.ai
- `ccdbfc3` — Fix runtime errors: messaging hooks violation and cron crash on missing table
- `7f85a5a` — Fix stale data after saves and remove fake defaults in settings
- `ab8ed6b` — Fix remaining Trainer-to-Coach labels in messages page and dev login
- `1c0545f` — Wire up real Clerk auth in mobile app and complete Everist branding
- `011e4de` — Remove hardcoded fake data from mobile Home and Health screens
