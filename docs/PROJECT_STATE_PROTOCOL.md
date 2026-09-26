# PrimeEstate — Project State Protocol

## Purpose

PrimeEstate uses `PROJECT_STATE.md` as its canonical cross-session project memory.

The repository itself is the source of truth. Chat history is helpful context, but development must be recoverable from GitHub.

## Standard command

When the user says:

**PrimeEstate**

the development session starts with:

1. Read `PROJECT_STATE.md`.
2. Read `CURRENT_STATE.md` only when historical reconciliation is useful.
3. Inspect current `main`.
4. Find active feature branches and open PRs.
5. Check CI for the relevant commit/PR.
6. Inspect the files named by `CURRENT_TASK`.
7. Continue from the first incomplete step.

## State update rule

At the end of a meaningful development step, update `PROJECT_STATE.md` with:

- current phase
- current task
- active branch
- base main commit
- active PR
- last green checks
- production migration status when relevant
- next step
- blockers
- timestamp

## Merge rule

Do not update the state to say a PR is merged until GitHub confirms the merge.

Do not describe CI as green unless the relevant GitHub checks are actually green.

## Safety rule

The state file is documentation, not permission to bypass repository controls.

Always verify the real repository state before acting.

## Branch rule

Feature work stays on a feature branch until the required checks are green and the change is ready for merge.

## Production rule

Production database changes must use the established migration workflow. Never use a destructive reset as a shortcut.

## Security rule

Customer privacy, tenant isolation, office portfolio visibility, and server-side authorization rules in `PROJECT_STATE.md` are permanent product constraints.

## Historical rule

When a decision changes, update the canonical state rather than creating contradictory instructions in another handoff document.
