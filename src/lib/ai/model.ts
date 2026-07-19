/**
 * Central Anthropic model configuration.
 *
 * All AI routes import from here so a model deprecation only needs
 * a single-line fix. (July 2026: claude-sonnet-4-20250514 was retired
 * and returned 404 not_found_error, breaking chat + reports in prod.)
 *
 * Can be overridden without a deploy via the ANTHROPIC_MODEL env var.
 */

export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
