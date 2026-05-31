---
description: 'Execute an approved planning doc phase by phase. Read ai-planning/planning-*.md, execute each phase with discipline, and write a completion report with the results of each phase and any open questions or assumptions for user review.'
---

# /implement - Story implementation workflow

You are running the **implementation phase** for a story or task. Input is an approved planning document; output is a completed implementation and a report of the results.

## Inputs the user may provide

- A planning doc path (e.g. `ai-planning/planning-{story-name}.md`) - ideal
- Nothing - list available planning docs and ask which one to implement

## Step 1 - Load shared context first

Read in order:

1. The specified planning document (if provided) or ask the user to select one from `ai-planning/planning-*.md`. This is the source of truth for the implementation.
2. [.github/copilot-instructions.md](../copilot-instructions.md) - Review rubric and guidelines for code quality, type safety, testing, documentation, and best practices.
3. [.github/REPO_CONTEXT.md](../REPO_CONTEXT.md) - Current codebase structure (will be updated at the end).
4. `/memories/repo/*-planning.md` - Check for any relevant planning memories that may impact implementation.

## Step 2 - Confirm plan-ready

Before writing code, confirm:

- The plan exists and has resolved open questions.
- The user has approved running implementation. (assume yes if they invoked `/implement`)
- Branch is correct (or ask whether to create one.)

## Step 3 - Execute phase by phase

For each phase in the plan:

1. **Make the file changes** specified in the "Changes Required" section of the plan. Stay faithful to the structure shown in the plan; fill the implementation details as you go.
2. **Run the phase's automated success criteria** using the execution subagent (or terminal)
3. **Fix anything that fails before moving on**. Do not start the next phase with red tests
4. **Update the implementation checklist** in the planning doc - check off completed tasks
5. **Pause for review between phases** unless the user explicitly said run-all.

## Step 4 - Apply repo conventions while implementing

These are non-negotiable.

- **Do not remove existing console.log console.warn or console.error statements** unless the plan explicitly says to remove them. If the plan doesn't mention them, assume they are there for a reason and leave them in.

If the plan asks for something that violates one of these, stop and ask - the plan may have an error.

## Step 5 - Tests

- Silence console logs, warns or errors during tests unless we're asserting an error or edge case. Do it by adding `jest.spyOn(console, 'log').mockImplementation(() => {})` to the top of test files if needed. Do not remove or comment out console statements in source files.

## Step 6 - Final steps (run before declaring done)

- Update `.github/REPO_CONTEXT.md` - Update if you added modules, controllers, guards, services, or any other significant code structure. This is a living document that should reflect the current state of the codebase.
- **Final test run**: run `pnpm test` -- clean
- **Build (if not trivial change)**: run `pnpm build` -- clean
- **Implementation checklist in planning doc** - all boxes checked off.

## Step 7 - Capture follow-ups

If implementation surfaces something that wasn't in the plan and isn't worth blocking on:

- Write a short note to `/memories/repo/{story-name}-followup.md` so it can be recalled in future research, planning or implementation phases. Focus on insights that would not be easily discovered through code exploration alone.
- List in your final summary so the user knows.

## Step 8 - Present for review

End the turn with:

1. List of files created/modified/deleted (use the [file](link) link format)
2. Test/build status
3. `REPO_CONTEXT.md` updated (yes/no)
4. Any deferred follow-ups.

Do **not** create the PR or push the branch unless the user explicitly asks you to. Wait for the human sign-off.

## Don'ts

- Don't start implementing without an approved planning doc
- Don't skip tests because they're tedious
- Don't bypass safety checks
- Don't push, force-push or open PRs without explicit user approval.
- Don't add features beyond what the plan specifies. If something seems missing, ask - don't improvise
- Don't remove pre-existing console.log console.warn or console.error statements
