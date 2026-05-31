# /research - Research Workflow

You are running the **research phase** of a project. Your goal is to gather information, ask clarifying questions, and write a research document that will be stored in the `ai-research` directory.

## Inputs the user may provide

- A free-form description of the work
- Neither (ask for at least one before proceeding)

Parse whatever the user supplied

## Step 1 - Load shared context first

Before any codebase exploration, read these files (do not re-discover what's already documented)

1. [.github/copilot-instructions.md](../copilot-intructions.md) - Review rubric

## Step 2 - Story quality check

Skim the task or problem to solve and flag any of these **before** spending tool calls on exploration:

- Missing or vague requirements
- Unclear success criteria
- Ambiguous user needs
- Lack of constraints or assumptions
- Undefined terms not in the glossary

If any flag fires, ask the user before continuing. Do not invent answers.

## Step 3 - Ask about scope and complexity

Use `vscode_askQuestions` to resolve at minimum:

1. Quick or full research? Estimate complexity based on the requirements of the story. If it looks like a small bug fix or one-line behavioral change, ask:
   > "This looks small. Want a quick research note (~30 lines, lightweight template) or the full template (300-500 lines)?"

Default to full template if unclear 2. Cross feature edition? If the story seems to touch multiple features or areas of the codebase, ask:

> "This looks like it might touch multiple features or areas of the codebase. Is that right? If so, I can do a more comprehensive research note that covers all relevant areas."

Default to single feature if unclear 3. Any specific areas to focus on? If the story is complex, ask:

> "Are there any specific areas of the codebase or specific questions you want me to focus on during the research? This can help me prioritize and tailor the research note to your needs."

4. Any other clarifying questions specific to the story (component choice, design references, edge cases)

Batch these into one `vscode_askQuestions` call to minimize back-and-forth. Do not invent answers if the user doesn't provide them. Default to the most comprehensive research if unclear.

## Step 4 - Write the research doc

File path: `ai-research/{story-name}.md`
Length target: 300 - 500 lines for full mode, ~30 lines for quick mode

## Step 5 - Capture non-obvious findings to memory

If research surfaces a non-obvious constraint, conflict or domain fact that future work would benefit from, write a short note to memory with `vscode_memoryAdd` so it can be recalled in future research or implementation phases. Do not add obvious facts or information that is already well-documented in the codebase or research notes. Focus on insights that would not be easily discovered through code exploration alone.

## Step 6 - Present for review

End the turn with:

1. The path to the research doc
2. A bullet list of unresolved open questions
3. A bullet list of assumptions made

Do **not** start planning or writing code. Wait for the human sign-off.

## Don'ts

- Don't propose implementation. That's the planning phase.
- Don't write or modify source files (other than the research doc and optional context/memory updates)
- Don't run tests, builds, or any package install
- Don't write 1,000 line research doc. Cut sections aggresively.
