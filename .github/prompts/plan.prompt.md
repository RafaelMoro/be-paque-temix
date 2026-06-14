---
description: 'Convert a research doc into a implementation plan. Reads ai-research/*.md, defines phases, specifies file-level changes, and writes ai-planning/planning-*.md'
---

# /plan - Story Planning workflow

You are a running the **planning phase** for a story or task. Input is a completed research document; output is an actionable implementation plan.

## Inputs the user may provide

- A research doc path (e.g. `ai-research/{story-name}.md`) - ideal
- Nothing - list available research docs and ask which one to plan

## Step 1 - Load shared context first

Read in order:

1. The specified research document (if provided) or ask the user to select one from `ai-research/*.md`. This is the source of truth for scope, affected files and open questions.
2. [.github/copilot-instructions.md](../copilot-instructions.md) - Review rubric and guidelines for code quality, type safety, testing, documentation, and best practices.
3. [.github/REPO_CONTEXT.md](../REPO_CONTEXT.md) - Current codebase structure to understand existing modules and services.
4. [.github/IMPLEMENTATION_GUIDELINES.md](../IMPLEMENTATION_GUIDELINES.md) - Technical patterns for NestJS modules, services, controllers, and module dependencies.
5. `/memories/repo/*-research.md` - Check for any relevant research memories that may impact planning or implementation.

## Step 2 - Verify research plan-ready

Before drafting the plan, confirm:

- All "Open Questions" in the research doc are resolved or explicity deferred with an assumption recorded.
- Acceptance criteria are unambiguous and actionable.

If anything is unresolved, ask the user before proceeding. Do not guess answers to open questions - that's what the research phase was for.

## Step 2.5 - Scope discipline (do this before any phase work)

The plan covers **only** what the story explicitly asks for. For every concrete item you're about to add to the plan (a constant, a file, a test, a helper, refactor, a prop, piece of error handling), it must trace to one of:

1. A specific acceptance criteria in the story, **or**
2. A direct technical prerequisite of an AC, **or**
3. A repo convention enforces by `.github/copilot-instructions.md` **or**
4. A research-doc finding that the user explicitly accepted in the planning Q&A

If an item doesn't trace to one of those, it is **out of scope**. Coimmon temptations to refuse:

- Speculative error handling. Don't add try/catches, fallbacks, or alerts for failure modes the story doesn't mention. Trust internal code; only handle errors at boundaries the story implies
- Telemetry, logging, caching strategies that the story doesn't mention.
- **Refactors of nearby code** that the story doesn't ask for, even if they look tempting.
- **Tests for invented behavior** Tests cover what the plan actually builds, if the behavior isn't planned, neither the test
- **Nice-to-haves** that aren't required by an AC

When tempted to include something speculative, instead:

- Note if under "Open Questions" in the research doc for future research or planning phases to address if needed, **or**
- If it's a technical prerequisite, trace it to the AC it supports and ask the user to confirm it's in scope before including it in the plan
- Drop it entirely

The story's own words are the highest authority. Repo conventions are second. Research findings the user accepted are third.

## Step 3 - Define phases

Break into phases, each independently testable. Common patterns:

| Story type | Phase Pattern                                                                                |
| ---------- | -------------------------------------------------------------------------------------------- |
| New Module | Core component or feature -> integration with existing code -> edge cases and error handling |
| Bug fix    | Fix -> Unit testing -> Related cleanup or refactors                                          |

Don't create a phase for "lint/format or "code review" - thoise are PR concerns, not phases.

## Step 4 - Specify changes per phase

For each phase, include a **"Changes Required"** section that specifies:

For each file change:

- **Exact path** (e.g., `src/users/services/user.service.ts`)
- **Action**: Create / Modify / Delete
- **For modifications**: line range or "after line x"
- **Code structure**: function signatures, key logic, critical conditionals. Not full implementations
- **Edge cases** worth flagging (only the non-obvious ones)
- **Rationale**: A 1-2 sentence "why" only when not self-evident

**Stay concise**. Show the implementer what to build; don't write it for them. Target 500-700 lines for the whole plan.

## Step 5 - Specify success criteria per phase

Each phase needs

- **Automated** exact commands using pnpm. For this repo, typical:
  - `pnpm test`
  - `pnpm dev` (Check not logged errors)
  - `pnpm build`
- **Manual**: Specific user-facing steps

## Step 6 - Specify test coverage (not test code)

Add a table like this example:

| File                                        | Coverage areas                  | Pattern reference                                               |
| ------------------------------------------- | ------------------------------- | --------------------------------------------------------------- |
| `src/addresses/services/address.service.ts` | New method `getAddressByUserId` | Unit test for new method, integration test for service consumer |

Describe what to test, not how. Full test code beling in the implementation phase.

## Step 7 - Write the planning doc

File path: `ai-planning/planning-{story-name}.md`
Length target: 500-700 lines. If exceeding, you're writing implementation, not a plan. Also may be the AC is too broad and needs to be broken into multiple stories.

## Step 8 - Capture planning insights to memory

If planning reveals non-obvious technical decisions or constraints that future work would benefit from, write a short note to `/memories/repo/{story-name}-planning.md`.

## Step 9 - Present for review

End the turn with:

1. The path to the planning doc
2. Phase summary (one line per phase)
3. A bullet list of any assumptions made during planning
4. A bullet list of any unresolved questions that need to be addressed before implementation
5. Any decisions made beyond what the research doc resolved

Do **not** start implementing. Wait for human sign-off.

## Don'ts

- Don't write source files, tests or run commands.
- Don't include full code implementations - show structure.
- Don't repeat content already in the research doc - link to it
- Don't add phases for things tooling handles (linting, formatting)
- Don't invent answers to open questions left unresolved by research
- Don't invent specifics the story doesn't supply. If the story says "do X" without specifying how, don't invent the how. Instead, note it as an open question in the plan for the user to answer.
