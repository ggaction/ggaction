import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { preparePackageConsumer } from '../../../../../scripts/package-consumer.js';
import { documentationPrograms } from '../../../../../scripts/doc-snippets.js';
import { testTutorialConsumers } from '../../../../../scripts/tutorial-consumer.js';
const artifact = JSON.parse(await readFile(process.argv[2], 'utf8'));
assert.equal(createHash('sha256').update(await readFile(artifact.file)).digest('hex'), artifact.sha256);
const examples = (await documentationPrograms()).filter(example => example.id === 'graticule-analytical-comparison');
assert.equal(examples.length, 1);
const consumer = await preparePackageConsumer({ packageSpec: artifact.file });
try {
  await testTutorialConsumers(consumer.directory, { examples, evidenceFile: path.resolve(process.argv[3] + '.doc.json') });
  const result = { node: process.version, sha256: artifact.sha256, docs: examples.map(example => example.id), status: 'passed' };
  await writeFile(process.argv[3], JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally { await consumer.cleanup(); }
