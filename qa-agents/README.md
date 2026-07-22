# Everist.ai QA Agents

Reusable QA audit prompts. To re-run an audit, give the full text of one of
these files to an AI agent (e.g., Claude with repo access) as its task prompt.
Run all three in parallel for a full-platform audit.

- `ios-app-audit.md` — mobile app + Apple Health pipeline trace
- `client-web-audit.md` — client web portal
- `coach-web-audit.md` — coach/trainer web portal

Each prompt instructs the agent to be READ-ONLY and to report findings grouped
CRITICAL / HIGH / MEDIUM / LOW with file:line references and one-line fixes.

Last full run: 2026-07-21 (findings in ../../QA_Findings_July2026.md).
After each sprint, re-run and diff against the previous findings file.
