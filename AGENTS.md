# PrimeEstate Codex Rules

Read `CODEX_PROJECT_HANDOFF.md` before changing code.

## Mandatory
- Never modify `kaankisa-primeestate/remax-CRM`.
- Work only in `kaankisa-primeestate/primeestate`.
- Verify current GitHub main/branch/PR/CI before making changes.
- Do not merge red CI.
- Do not guess a root cause. Inspect evidence first.
- Do not reset production PostgreSQL.
- Never request, hard-code, print, or commit secrets.
- Preserve tenant isolation and authorization at the API layer.
- Use existing Prisma migration history; do not create destructive shortcuts.
- When an E2E test fails, isolate the exact endpoint/status/body and reproduce before changing business logic.
- Keep Phase 7 test files serial where Next.js dev servers are involved because of the shared `.next` lock.
- After changes, run relevant tests plus lint/typecheck/build as applicable.
- Update documentation/state only after verifying the real GitHub state.

## Current priority
PR #81 is open and its CI is red. Find the actual CI root cause before changing product logic or merging anything.
