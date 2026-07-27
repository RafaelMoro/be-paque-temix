---
description: 'Use when the user asks to plan an implementation, create a plan, or convert research into an implementation plan. Triggers on plan, planning, implementation plan, story plan.'
---

# Planning workflow

You are running the **planning phase** for a story or task. Input is a completed research document; output is an actionable implementation plan.

## Inputs

- A research doc path, e.g. `ai-research/{story-name}.research.md`
- If none is provided, list available `ai-research/*.research.md` files and ask which one to plan

## Steps

1. Read in order:
   - The specified research document
   - `.github/copilot-instructions.md`
   - `.github/REPO_CONTEXT.md`
   - `.github/IMPLEMENTATION_GUIDELINES.md`
   - Relevant `memories/repo/*-research.md`
2. Confirm the research is plan-ready:
   - Open questions are resolved or explicitly deferred with assumptions
   - Acceptance criteria are unambiguous and actionable
3. If anything is unresolved, ask the user before proceeding. Do not guess.
4. Keep scope strict. Every planned item must trace to:
   - A specific acceptance criterion
   - A direct technical prerequisite of an AC
   - A repo convention
   - A research finding the user accepted
5. Define independently testable phases.
6. For each phase, specify changes without writing full implementations:
   - Exact file path
   - Action: create, modify, delete
   - Line range or placement guidance for modifications
   - Function signatures, key logic, and critical conditionals
   - Non-obvious edge cases
   - Short rationale only when useful
   - **Respect the scaffolding convention in `.github/IMPLEMENTATION_GUIDELINES.md`:** when a phase introduces a new NestJS module, service, or controller, plan it as a Nest CLI generation step (`nest g mo <name>`, `nest g s <name>/<name>`, `nest g co <name>/<name>`) rather than a manual file "create". Note that `nest g mo` also registers the module in `AppModule`, so downstream root-registration steps become a **verify**, not a hand edit. Mark the remaining files the CLI does not scaffold (entities, DTOs, constants, interfaces, utils, email templates) as hand-authored "create"/"populate" actions.
7. Specify success criteria per phase:
   - Exact automated commands using `pnpm`
   - Manual verification steps when applicable
8. Specify test coverage areas, not test code.
9. Write `ai-planning/{story-name}.planning.md`.

## Optional Memory

If planning reveals a non-obvious technical decision or constraint useful later, write `memories/repo/{story-name}-planning.md`.

## Final Response

End with:

1. Path to the planning doc
2. One-line phase summary per phase
3. Assumptions made
4. Unresolved questions before implementation
5. Decisions made beyond the research doc

Do **not** start implementing. Wait for human sign-off.

## Don'ts

- Don't write source files or tests.
- Don't run implementation commands.
- Don't include full code implementations.
- Don't repeat the research doc; link to it.
- Don't add phases for linting, formatting, or review.
- Don't invent answers to unresolved research questions.
