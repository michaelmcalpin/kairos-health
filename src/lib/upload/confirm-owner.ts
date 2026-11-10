/**
 * When the server says a clinical file names another person, ask the uploader
 * whether that's intentional (e.g. demo data). Returns true if they confirmed,
 * in which case the caller re-sends with `confirmOtherPerson: true`.
 */
const MARKER = "[confirm-other-person]";

export function confirmOtherPerson(err: { message: string }): boolean {
  if (!err.message.includes(MARKER) || typeof window === "undefined") return false;
  return window.confirm(`${err.message.replace(MARKER, "").trim()}\n\nUpload it to this record anyway?`);
}

/** Error text without the internal marker, for showing in the UI. */
export function cleanUploadError(message: string): string {
  return message.replace(MARKER, "").trim();
}
