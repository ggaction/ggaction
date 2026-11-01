import assert from 'node:assert/strict';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { preparePackageConsumer } from '../../../../../scripts/package-consumer.js';
import { testOptionalDependencies } from '../../../../../scripts/consumers/optional-peers.js';
import { root, run, tscCommand } from '../../../../../scripts/consumers/runtime.js';
import { documentationPrograms } from '../../../../../scripts/doc-snippets.js';
import { testTutorialConsumers } from '../../../../../scripts/tutorial-consumer.js';
import { measureMinimalBrowserBundle, BROWSER_BUNDLE_GZIP_LIMITS } from '../../../../../scripts/browser-bundle-size.js';
const fixed = JSON.parse(await readFile(process.argv[2], 'utf8'));
assert.equal(createHash('sha256').update(await readFile(fixed.file)).digest('hex'), fixed.sha256);
const receipt = { node: process.version, sha256: fixed.sha256, checks: [], bundles: [] };
const consumer = await preparePackageConsumer({ packageSpec: fixed.file });
try {
  await testOptionalDependencies(consumer);
  await copyFile(path.join(root, 'scripts/consumers/fixtures/node/edge-routes.mjs'), path.join(consumer.directory, 'edge-routes.mjs'));
  await writeFile(path.join(consumer.directory, 'runner.mjs'), `import {cases} from './edge-routes.mjs';
import {writeFile} from 'node:fs/promises'; const results=[];
for(const entry of cases.filter(value=>['edge-routes/bounded-long-paths','edge-routes/worker-authority-and-cache','edge-routes/offline-restore-and-revision','edge-routes/four-renderers-and-scene'].includes(value.id))) {await entry.run();results.push(entry.id);}
await writeFile('results.json',JSON.stringify(results));`);
  run(process.execPath, ['runner.mjs'], consumer.directory);
  receipt.checks = JSON.parse(await readFile(path.join(consumer.directory, 'results.json'), 'utf8')); assert.equal(receipt.checks.length, 4);
  for (const [engine, file] of [['22', 'density.public.json'], ['24', 'density.node24.public.json']]) {
    await copyFile(path.join(root, 'test/charts/edge-routes', file), path.join(consumer.directory, 'density.json'));
    await writeFile(path.join(consumer.directory, 'codec.mjs'), `import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{serializeProgram,deserializeProgram}from'ggaction/persistence';const text=(await readFile('density.json','utf8')).trimEnd();assert.equal(serializeProgram(deserializeProgram(text)),text);`);
    run(process.execPath, ['codec.mjs'], consumer.directory); receipt.checks.push(`density/from-node${engine}-fresh-exact-codec`);
  }
  await copyFile(path.join(root, 'scripts/consumers/fixtures/edge-routes.ts'), path.join(consumer.directory, 'routes.mts'));
  run(process.execPath, [tscCommand, '--noEmit', '--strict', '--exactOptionalPropertyTypes', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'routes.mts'], consumer.directory);
  receipt.types = 'passed';
  const examples = (await documentationPrograms()).filter(example => example.id === 'edge-route-analytical-comparison'); assert.equal(examples.length, 1);
  await testTutorialConsumers(consumer.directory, { examples, evidenceFile: path.resolve(process.argv[3] + '.doc.json') }); receipt.docs = examples.map(example => example.id);
  for (const specifier of ['ggaction', 'ggaction/basic', 'ggaction/svg', 'ggaction/graph', 'ggaction/animation', 'ggaction/interaction']) receipt.bundles.push(await measureMinimalBrowserBundle(consumer.directory, { specifier }));
  receipt.status = receipt.bundles.every(value => value.gzipBytes <= BROWSER_BUNDLE_GZIP_LIMITS[value.specifier]) ? 'passed' : 'bundle-limit-failed';
} finally { await writeFile(process.argv[3], JSON.stringify(receipt, null, 2) + '\n'); await consumer.cleanup(); }
console.log(JSON.stringify(receipt)); assert.equal(receipt.status, 'passed');
