import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const skills = ['research', 'plan', 'implement'];

function splitSkill(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { description: '', body: markdown };

  const description =
    match[1].match(/^description:\s*(.*)$/m)?.[1].replace(/^['"]|['"]$/g, '') ?? '';

  return { description, body: match[2].trimStart() };
}

for (const name of skills) {
  const source = join(root, '.opencode', 'skills', name, 'SKILL.md');
  const markdown = await readFile(source, 'utf8');
  const { description, body } = splitSkill(markdown);

  const claudeTarget = join(root, '.claude', 'skills', name, 'SKILL.md');
  await mkdir(dirname(claudeTarget), { recursive: true });
  await writeFile(claudeTarget, markdown);

  const githubTarget = join(root, '.github', 'prompts', `${name}.prompt.md`);
  await mkdir(dirname(githubTarget), { recursive: true });
  await writeFile(
    githubTarget,
    `---\ndescription: '${description.replaceAll("'", "''")}'\n---\n\n${body}`,
  );
}
