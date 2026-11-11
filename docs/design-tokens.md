# Design tokens

Colors are named by **role**, not by hue. Each token reads a CSS variable
defined per theme in `src/app/globals.css` (`.theme-summit`,
`.theme-warm-slate`, `.theme-classic-royal`), so switching theme never
requires touching components. Tailwind mappings live in
`tailwind.config.ts`; hex copies for charts/SVG live in
`THEME_COLORS` (`src/lib/theme/ThemeProvider.tsx`, via `useThemeColors()`).

All channel-based tokens support opacity modifiers (`bg-accent/15`).

## Color tokens

| Token (Tailwind)          | Example class                 | CSS variable          | Summit    | Use |
| ------------------------- | ----------------------------- | --------------------- | --------- | --- |
| `bg`                      | `bg-bg`                       | `--k-bg`              | `#050D18` | App background |
| `surface`                 | `bg-surface`                  | `--k-card`            | `#0A1628` | Cards, sidebar |
| `surface-raised`          | `bg-surface-raised`           | `--k-card-hover`      | `#101E34` | Raised cards, popovers, card hover |
| `surface-hover`           | `hover:bg-surface-hover`      | `--k-surface-hover`   | `#1A273D` | Hover on raised items, selected rows |
| `input`                   | `bg-input`                    | `--k-input`           | `#050D18` | Form field background |
| `border`                  | `border-border`               | `--k-border`          | `rgba(192,197,206,.15)` | 1 px card and divider lines (no opacity modifier) |
| `text-primary`            | `text-primary`                | `--k-text`            | `#FFFFFF` | Headings, key numbers, body on cards |
| `text-secondary`          | `text-secondary`              | `--k-text-secondary`  | `#C0C5CE` | Body copy, labels |
| `text-muted`              | `text-muted`                  | `--k-text-muted`      | `#8B96A8` | Timestamps, captions (12 px and up) |
| `content-*`               | `border-content-muted`, `fill-content-primary` | same as text-* | — | Text colors for non-text utilities |
| `accent`                  | `bg-accent`, `text-accent`    | `--k-accent`          | `#4A90D9` | **The only interactive color**: primary buttons, links, selected tab, focus ring |
| `accent-hover`            | `hover:bg-accent-hover`       | `--k-accent-light`    | `#6AAAE8` | Hover state of accent elements |
| `accent-pressed`          | `active:bg-accent-pressed`    | `--k-accent-deep`     | `#3A78BE` | Pressed state |
| `accent-muted`            | `bg-accent-muted`             | `--k-accent-muted`    | `rgba(74,144,217,.15)` | Selected/tonal backgrounds |
| `accent-premium`          | `text-accent-premium`         | `--k-accent-premium`  | `#C9A96E` | Sparingly: tier badge, score milestones, membership. Never links or buttons |
| `success`                 | `text-success`, `bg-success-wash` | `--k-success` / `-wash` | `#4A9D5B` | In range, improving |
| `warning`                 | `text-warning`, `bg-warning-wash` | `--k-warning` / `-wash` | `#D4A843` | Needs attention, borderline |
| `danger`                  | `text-danger`, `bg-danger-wash`   | `--k-danger` / `-wash`  | `#E07070` | Out of range, critical, destructive. Never decorative |
| `info`                    | `text-info`, `bg-info-wash`       | `--k-info` / `-wash`    | `#4A90D9` | Neutral notices |

`text-primary` / `text-secondary` / `text-muted` exist only for text color
(so `bg-primary` is deliberately undefined). For borders, fills, strokes or
placeholders use `content-primary` / `content-secondary` / `content-muted`.

### Legacy names (still supported)

The `kairos-*` classes are aliases of the role tokens above and keep
working; prefer the role names in new or touched code.

| Legacy class                 | Same as            | Note |
| ---------------------------- | ------------------ | ---- |
| `kairos-gold`                | `accent`           | "Gold" is a legacy name — in Summit the accent is **blue** |
| `kairos-gold-light`          | `accent-hover`     | |
| `kairos-gold-dim`            | `accent-pressed`   | |
| `kairos-gold-muted`          | `accent-muted`     | |
| `kairos-royal-dark`          | `bg`               | |
| `kairos-royal`, `-light`     | brand navy (`--k-primary`) | A background color. **Never use as text** — it is near-invisible on dark surfaces |
| `kairos-royal-surface`, `kairos-card` | `surface` | |
| `kairos-card-hover`          | `surface-raised`   | |
| `kairos-silver`              | `text-primary`     | |
| `kairos-silver-dark`         | `text-secondary`   | Avoid `/60` and lower opacity for text: it drops below 4.5:1 |
| `kairos-silver-light`        | `--k-text-light`   | |
| `kairos-border`, `kairos-input` | `border`, `input` | |

## Contrast (Summit)

WCAG ratios for the main pairs; body text needs ≥ 4.5:1.

| Foreground       | on `bg` | on `surface` | on `surface-raised` | on `surface-hover` |
| ---------------- | ------- | ------------ | ------------------- | ------------------ |
| text-primary     | 19.5    | 18.1         | 16.7                | 15.0 |
| text-secondary   | 11.3    | 10.5         | 9.6                 | 8.7 |
| text-muted       | 6.5     | 6.1          | 5.6                 | 5.0 |
| accent           | 5.8     | 5.4          | 5.0                 | 4.5 (large text only) |
| success          | 5.8     | 5.4          | 5.0                 | 4.5 (large text only) |
| warning          | 8.8     | 8.2          | 7.5                 | 6.8 |
| danger           | 6.2     | 5.8          | 5.4                 | 4.8 |
| accent-premium   | 8.7     | 8.1          | 7.5                 | 6.7 |
| `bg` text on accent button | 5.8 | | | |

`danger` was raised from `#C65D5D` (4.4:1 on cards) to `#E07070`.
`text-kairos-silver-dark/60` measures 4.49:1 on `surface` (just under) and
lower on raised surfaces; `/50` and below fail — use `text-muted` instead.

Warm Slate and Classic Royal have not been tuned yet: several of their
status colors (Classic Royal success/danger/info, Warm Slate
success/warning/danger) are below 4.5:1 as text on their cards. Use them for fills
and icons, or tune those themes before relying on them for text.

## White-label

Company portals inject `--k-company-brand`, `--k-company-brand-light` and
`--k-company-brand-deep` (see `brandCssVars` in `src/lib/company-ops/brand.ts`)
on the shell container. They are not mapped to any role token today; the
accent stays the theme's accent, and the brand color is applied directly
via the `brandColor` props (sidebar/top bar).

## Layout

Every portal layout wraps pages in `PageContainer`
(`src/components/layout/PageContainer.tsx`): max content width 1280 px,
centered, side gutters 16 px (mobile) / 32 px (≥ 1024 px), top/bottom
padding 24 px / 32 px. Pages should not add their own outer padding.

Full-bleed screens (no max width, legacy 24 px padding) are listed in
`FULL_BLEED_ROUTES` in that file — currently `/chat` — or can pass
`<PageContainer bleed>` where a component controls it.

Spacing: 4 px grid; card padding 20 px (24 px hero cards); 16 px gap within
a section, 32 px between sections.
