/**
 * EVERIST Token Encryption Utilities
 *
 * Encrypts and decrypts OAuth tokens at rest using AES-256-GCM.
 * The encryption key is read from the TOKEN_ENCRYPTION_KEY env var
 * (a 64-character hex string representing 32 bytes).
 *
 * Encrypted output format (base64-encoded):
 *   prefix "enc:v1:" + base64( IV (12 bytes) | authTag (16 bytes) | ciphertext )
 *
 * When TOKEN_ENCRYPTION_KEY is not set the functions fall back to
 * plaintext with a console warning, so the app still works in dev.
 *
 * The decrypt function gracefully handles plaintext values (for migration
 * of existing unencrypted tokens).
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag
const ENCRYPTED_PREFIX = "enc:v1:";

let _warned = false;

/**
 * Derive the 32-byte encryption key from the hex env var.
 * Returns null when the env var is missing (dev fallback).
 */
function getEncryptionKey(): Buffer | null {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) {
    if (!_warned) {
      console.warn(
        "[EVERIST] WARNING: TOKEN_ENCRYPTION_KEY is not set. " +
          "OAuth tokens will be stored in plaintext. " +
          "Set a 64-character hex string in production.",
      );
      _warned = true;
    }
    return null;
  }

  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
        `Got ${hex.length} characters.`,
    );
  }

  return Buffer.from(hex, "hex");
}

/**
 * Encrypt a plaintext token string using AES-256-GCM.
 *
 * Returns a deterministic-format string prefixed with "enc:v1:" so
 * callers can distinguish encrypted values from plaintext.
 *
 * If TOKEN_ENCRYPTION_KEY is not configured, returns the plaintext
 * unchanged (with a warning on first call).
 */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Pack IV + authTag + ciphertext into a single buffer, then base64
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return ENCRYPTED_PREFIX + packed.toString("base64");
}

/**
 * Decrypt a token that was encrypted with `encryptToken`.
 *
 * Gracefully handles plaintext values: if the input doesn't carry
 * the "enc:v1:" prefix it is returned as-is. This allows a seamless
 * migration period where the DB contains a mix of encrypted and
 * plaintext tokens.
 *
 * If TOKEN_ENCRYPTION_KEY is not configured and the value appears
 * encrypted, a warning is logged and the raw value is returned
 * (the caller will likely get an API error, but the app won't crash).
 */
export function decryptToken(ciphertext: string): string {
  // Not encrypted — return as-is (migration path)
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    return ciphertext;
  }

  const key = getEncryptionKey();
  if (!key) {
    console.warn(
      "[EVERIST] WARNING: Found encrypted token but TOKEN_ENCRYPTION_KEY is not set. " +
        "Cannot decrypt — returning raw value.",
    );
    return ciphertext;
  }

  const packed = Buffer.from(
    ciphertext.slice(ENCRYPTED_PREFIX.length),
    "base64",
  );

  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    // Malformed — treat as plaintext to avoid crashing
    console.warn("[EVERIST] WARNING: Malformed encrypted token — returning raw value.");
    return ciphertext;
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
