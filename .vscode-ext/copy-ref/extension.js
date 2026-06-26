const vscode = require('vscode');

function activate(context) {
  const disposable = vscode.commands.registerCommand('copyRef.copy', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No active editor');
      return;
    }
    const relPath = vscode.workspace.asRelativePath(editor.document.uri, false);
    const { anchor, active } = editor.selection;
    // ponytail: asRelativePath is fine for single-folder workspaces;
    // multi-root would need git rev-parse --show-toplevel
    let ref = `@${relPath}`;
    const hasSelection = !anchor.isEqual(active);
    if (hasSelection) {
      const start = Math.min(anchor.line, active.line) + 1;
      const end = Math.max(anchor.line, active.line) + 1;
      ref += `:${start}-${end}`;
    }
    await vscode.env.clipboard.writeText(ref);
    vscode.window.showInformationMessage(`Copied: ${ref}`);
  });
  context.subscriptions.push(disposable);
}

module.exports = { activate };