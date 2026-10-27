import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chart } from '../../ggaction/src/index.js';
import { buildDocMachineArtifacts } from '../../ggaction/scripts/generate-doc-machine-artifacts.js';
import { buildConciseLlmDocumentation, buildFullLlmDocumentation, buildLlmManifest } from '../../ggaction/scripts/generate-llm-docs.js';

const root = new URL('../../ggaction/', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');
const cards = JSON.parse(read('knowledge/action-cards.json')).cards;
const card = name => cards.find(c => c.name === name);
const result = { observedAt: new Date().toISOString(), packageVersion: JSON.parse(read('package.json')).version };
const filtered = chart().createData({ values: [{ value: 1 }] })
  .filterData({ id: 'none', field: 'value', predicate: { op: 'gt', value: 2 } });
result.emptyFilter = { card: card('filterData').completionRequirements,
  resultRows: filtered.semanticSpec.datasets.find(d => d.id === 'none').values.length };
const title = chart().createCanvas({ margin: { top: 80 } }).createTitle({ text: 'A' }).editTitle({ text: 'B' });
result.titleWithoutScale = { card: card('editTitle').resources.prerequisites,
  datasetCount: title.semanticSpec.datasets.length, scaleCount: title.semanticSpec.scales.length,
  lastAction: title.trace.children.at(-1).op };
const colored = chart().createCanvas().createData({ values: [{}] }).createPointMark().encodeColor({ value: '#ff0000' });
result.constantColorWithoutFields = { card: card('encodeColor').resources.prerequisites,
  fields: Object.keys(colored.semanticSpec.datasets[0].values[0]), lastAction: colored.trace.children.at(-1).op };
const compile = spawnSync(fileURLToPath(new URL('node_modules/.bin/tsc', root)), [
  '--noEmit', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'docs/types/program.d.ts'
], { cwd: root, encoding: 'utf8' });
result.publishedDeclarationCompilation = { status: compile.status, output: compile.stdout + compile.stderr };
const generated = await buildDocMachineArtifacts();
result.machineCopies = generated.map(a => ({ source: a.source, destination: a.destination, matches: a.content === read(a.destination) }));
result.llmFreshness = {
  concise: await buildConciseLlmDocumentation() === read('docs/llms.txt'),
  full: await buildFullLlmDocumentation() === read('docs/llms-full.txt'),
  manifest: JSON.stringify(await buildLlmManifest(), null, 2) + '\n' === read('docs/llms-manifest.json')
};
result.sizesBytes = Object.fromEntries(['docs/llms.txt', 'docs/llms-full.txt', 'docs/actions.json', 'docs/llms-manifest.json', 'agent_docs/SECOND_ARCHITECTURE.md']
  .map(p => [p, statSync(new URL(p, root)).size]));
result.cardCounts = { total: cards.length, emptyErrors: cards.filter(c=>c.errors.length===0).length,
  namedTypeSignatures: cards.filter(c=>/options\??:\s+[A-Z]/.test(c.signature)).length };
writeFileSync(new URL('./agent-probe-results.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
