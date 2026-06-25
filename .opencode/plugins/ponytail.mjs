// Ponytail OpenCode plugin wrapper.
// Re-exports the plugin from the local checkout so opencode.json can reference
// ./.opencode/plugins/ponytail.mjs while hooks/ and skills/ stay inside the checkout.
import ponytailPlugin from './ponytail/.opencode/plugins/ponytail.mjs';

export default ponytailPlugin;
