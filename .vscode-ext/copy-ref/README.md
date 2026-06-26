# copy-ref

VS Code extension: copy an opencode-style reference (`@relPath:START-END`) of the current selection to the clipboard.

## Install

```
cd .vscode-ext/copy-ref
npm i -g @vscode/vsce   # one time
vsce package --no-dependencies
code --install-extension copy-ref-0.0.1.vsix
```

Reload VS Code after installing.

## Use

Select lines (or place cursor for whole-file ref), press `Ctrl+Shift+R` (Mac: `Cmd+Shift+R`), paste into opencode prompt.

- No selection → `@src/manuable/services/manuable.service.ts`
- Selection  → `@src/manuable/services/manuable.service.ts:223-224`