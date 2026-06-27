# /research - Research Workflow

You are running the **research phase** of a project. Your goal is to gather information, ask clarifying questions, and write a research document that will be stored in the `ai-research` directory.

## Inputs the user may provide

- A free-form description of the work
- Neither (ask for at least one before proceeding)

Parse whatever the user supplied

## Step 1 - Load shared context first

Before any codebase exploration, read these files (do not re-discover what's already documented)

1. [.github/copilot-instructions.md](../copilot-instructions.md) - Review rubric and coding standards
2. [.github/REPO_CONTEXT.md](../REPO_CONTEXT.md) - Current codebase structure (modules, services, guards, controllers)

## Step 2 - Story quality check

Skim the task or problem to solve and flag any of these **before** spending tool calls on exploration:

- Missing or vague requirements
- Unclear success criteria or acceptance criteria
- Ambiguous user needs
- Lack of constraints or assumptions
- Undefined terms not in the glossary

If any flag fires, ask the user before continuing. Do not invent answers.

## Step 3 - Assess scope and formalize story

Before deep exploration, assess whether this is:

- **Single story**: Can be completed in 1-3 phases with clear ACs
- **Multiple stories**: Needs to be broken down into separate deliverables
- **Epic**: Complex initiative requiring multiple stories with dependencies

If the requirement is too broad or complex:

1. Break it into an **epic** with multiple stories
2. Each story should have 2-5 acceptance criteria
3. Each story should be independently deliverable
4. Ask the user which story to research first

## Step 4 - Scope discipline

Apply these constraints **before** exploration:

- Only research what the story explicitly requests
- Don't explore tangential improvements or refactors
- Don't invent features the story doesn't mention
- If scope seems unclear, ask before exploring

## Step 5 - Ask about scope and complexity

Use `vscode_askQuestions` to resolve at minimum:

1. Quick or full research? Estimate complexity based on the requirements of the story. If it looks like a small bug fix or one-line behavioral change, ask:
   > "This looks small. Want a quick research note (~200 lines, lightweight template) or the full template (300-1000 lines)?"

Default to full template if unclear

2. Cross feature edition? If the story seems to touch multiple features or areas of the codebase, ask:
   > "This looks like it might touch multiple features or areas of the codebase. Is that right? If so, I can do a more comprehensive research note that covers all relevant areas."

Default to single feature if unclear

3. Any specific areas to focus on? If the story is complex, ask:

   > "Are there any specific areas of the codebase or specific questions you want me to focus on during the research? This can help me prioritize and tailor the research note to your needs."

4. Any other clarifying questions specific to the story (component choice, design references, edge cases)

Batch these into one `vscode_askQuestions` call to minimize back-and-forth. Do not invent answers if the user doesn't provide them. Default to the most comprehensive research if unclear.

## Step 6 - Write the research doc

File path: `ai-research/{story-name}.md`
Length target: 300 - 1000 lines for full mode, ~200 lines for quick mode

The research doc must include:

### Story Definition

- Story title and description
- Acceptance Criteria (ACs) - 2-5 clear, testable criteria
- Task breakdown - if complex, break into subtasks
- Epic structure - if scope is too large, define constituent stories

### Technical Research

- Affected files and modules (reference REPO_CONTEXT.md)
- Existing patterns to follow
- Dependencies and integration points
- Edge cases and constraints

### Open Questions

- List any unresolved decisions
- Flag ambiguous requirements
- Note missing information

Focus on high-level actions needed to accomplish the task, no implementation details.

## Step 7 - Capture non-obvious findings to memory

If research surfaces a non-obvious constraint, conflict or domain fact that future work would benefit from, write a short note to `/memories/repo/{story-name}-research.md` so it can be recalled in future research or implementation phases. Do not add obvious facts or information that is already well-documented in the codebase or research notes. Focus on insights that would not be easily discovered through code exploration alone.

## Step 8 - Present for review

End the turn with:

1. The path to the research doc
2. Story/Epic structure (if broken down)
3. A bullet list of unresolved open questions
4. A bullet list of assumptions made

Do **not** start planning or writing code. Wait for the human sign-off.

## Don'ts

- Don't propose implementation. That's the planning phase.
- Don't write or modify source files (other than the research doc and optional context/memory updates)
- Don't run tests, builds, or any package install
- Don't write 1,000 line research doc. Cut sections aggresively.
