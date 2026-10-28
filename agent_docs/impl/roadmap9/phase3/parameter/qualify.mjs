// Explicit review runner, excluded from product and normal test discovery.
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runCheck } from '../../../../../scripts/run-check.js';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const here = path.relative(root, fileURLToPath(new URL('.', import.meta.url)));
const temporary = path.join(root, '.artifacts/checks/parameter-review');
const output = path.join(root, here, 'evidence');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const expressionTests = readdirSync(path.join(root, 'test/unit/grammar'))
  .filter(file => /^expression-.*\.test\.js$/.test(file)).sort().map(file => `unit/grammar/${file}`);
if (expressionTests.length !== 5) throw new Error('Recheck the expression review selection.');
const commands = [
  ['parameter-review', 'node', [`${here}/verify.mjs`]],
  ['parameter-types', 'node', ['node_modules/typescript/bin/tsc', '--strict', '--noEmit', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', `${here}/calls.ts`]],
  ['parameter-exact-types', 'node', ['node_modules/typescript/bin/tsc', '--strict', '--exactOptionalPropertyTypes', '--noEmit', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', `${here}/exact-options.ts`]],
  ['parameter-focused', 'node', ['scripts/run-tests.js', 'unit', ...expressionTests, 'unit/core/resource-state.test.js', 'unit/core/resource-references.test.js', 'unit/actions/data/source-revision.test.js', 'unit/actions/data/derived-editing.test.js', 'unit/actions/resources/remove.test.js', 'unit/persistence/']],
  ['parameter-navigation', 'node', ['scripts/run-tests.js', 'contracts', 'contracts/agent-docs-navigation.test.js']],
  ['parameter-all', 'npm', ['test']],
  ['parameter-machine', 'npm', ['run', 'docs:machine:check']]
];
mkdirSync(output, { recursive: true });
const receipts = [];
for (const [label, command, args] of commands) {
  process.stdout.write(`Running ${label}\n`);
  const code = await runCheck(label, command, args, { cwd: root, outputDirectory: temporary,
    stdout: { write() {} }, stderr: { write() {} } });
  const receiptBytes = readFileSync(path.join(temporary, `${label}.json`));
  const receipt = JSON.parse(receiptBytes);
  const log = readFileSync(path.join(temporary, `${label}.log`));
  if (receipt.truncated) throw new Error(`Truncated evidence: ${label}`);
  writeFileSync(path.join(output, `${label}.json`), receiptBytes);
  const compressed = gzipSync(log);
  writeFileSync(path.join(output, `${label}.log.gz`), compressed);
  receipts.push({ label, exitCode: code, receipt: `${label}.json`, receiptSha256: hash(receiptBytes),
    log: `${label}.log.gz`, compressedSha256: hash(compressed), rawSha256: hash(log) });
  process.stdout.write(`${label}: exit ${code}\n`);
  if (code) { process.stderr.write(log.toString().slice(-9000)); process.exitCode = code; break; }
}
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const inputs = readdirSync(path.join(root, here)).filter(file => /\.(?:mjs|ts|json|md)$/.test(file)).sort()
  .map(file => ({ path: `${here}/${file}`, sha256: hash(readFileSync(path.join(root, here, file))) }));
const reviewManifest = { schemaVersion: 1, inputs };
writeFileSync(path.join(output, 'inputs.json'), JSON.stringify(reviewManifest, null, 2) + '\n');
const summary = {
  schemaVersion: 1, scope: 'Review proposal and unchanged current-product baseline only',
  status: receipts.length === commands.length && receipts.every(entry => entry.exitCode === 0) ? 'passed' : 'failed',
  baselineCommit: git('rev-parse', 'HEAD'), node: process.version, platform: process.platform, arch: process.arch,
  generatedAt: new Date().toISOString(), receipts,
  reviewInputsSha256: hash(readFileSync(path.join(output, 'inputs.json'))),
  productChangedPaths: git('diff', 'HEAD', '--name-only', '--', 'src', 'types', 'test', 'scripts', 'docs', 'knowledge', 'package.json', 'package-lock.json'),
  productImplemented: false, productIntegrationChecksRun: false
};
writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
if (summary.productChangedPaths !== '') throw new Error('Review unexpectedly changed the product surface.');
process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
