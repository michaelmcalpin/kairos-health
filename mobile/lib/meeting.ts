/**
 * Open a meeting link, preferring the native app where possible.
 *
 * For Zoom URLs we build a `zoomus://` deep link so the phone opens the Zoom
 * app directly; if the app isn't installed (openURL rejects) we fall back to
 * the original web URL. Non-Zoom links (Google Meet, Teams, generic) open
 * directly — their https links already hand off to the installed app via
 * universal links.
 */

import { Linking } from "react-native";

/** Build a zoomus:// deep link from a Zoom web URL, or null if not Zoom. */
export function toZoomDeepLink(url: string): string | null {
  if (!/zoom\.us/i.test(url)) return null;
  // Meeting id: .../j/1234567890 (also /wc/1234567890/join)
  const idMatch = url.match(/\/(?:j|wc)\/(\d+)/);
  if (!idMatch) return null;
  const confno = idMatch[1];
  const pwdMatch = url.match(/[?&]pwd=([^&#]+)/);
  const pwd = pwdMatch ? pwdMatch[1] : null;
  return `zoomus://zoom.us/join?confno=${confno}${pwd ? `&pwd=${pwd}` : ""}`;
}

/** Open a meeting URL, using the Zoom app when the link is a Zoom meeting. */
export async function openMeetingLink(url: string | null | undefined): Promise<void> {
  if (!url) return;
  const deep = toZoomDeepLink(url);
  if (deep) {
    try {
      await Linking.openURL(deep); // opens the Zoom app
      return;
    } catch {
      // Zoom app not installed — fall through to the web URL.
    }
  }
  try {
    await Linking.openURL(url);
  } catch {
    // Nothing we can do; leave the user on the current screen.
  }
}
