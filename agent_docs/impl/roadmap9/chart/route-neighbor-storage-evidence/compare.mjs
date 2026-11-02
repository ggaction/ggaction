// Run from the repository root with Node 20, 22, or 24.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const previousSource = '68627051f627a04a5477dbe52b12d3c31e90f70e';
const owner = 'src/grammar/graph/routes/forceDirected.js';
const directory = await mkdtemp(path.join(tmpdir(), 'ggaction-force-previous-'));
try {
  const previous = execFileSync('git', ['show', `${previousSource}:${owner}`], { cwd: root, encoding: 'utf8' });
  const rewritten = previous.replace(/from "(\.[^"]+)"/g, (_, relative) => `from ${JSON.stringify(pathToFileURL(path.resolve(root, path.dirname(owner), relative)).href)}`);
  const oldFile = path.join(directory, 'previous.mjs'); await writeFile(oldFile, rewritten);
  const { bundleForceDirectedRoutes: before } = await import(pathToFileURL(oldFile));
  const module = relative => import(pathToFileURL(path.join(root, relative)));
  const { chart } = await module('src/index.js');
  const { bundleForceDirectedRoutes: after } = await module(owner);
  const { routeValueHash } = await module('src/grammar/graph/routes/job.js');
  const { edgeRouteJob } = await module('src/materialization/graph/routeResource.js');
  const { normalizeRouteIntent } = await module('src/grammar/graph/routes/options.js');
  const count = 100, nodes = Array.from({ length: count }, (_, id) => ({ id }));
  const edges = nodes.map(({ id }) => ({ id, source: id, target: (id + Math.floor(count / 3)) % count }));
  const positions = nodes.map(({ id }) => ({ key: id, x: 200 + 150 * Math.cos(2 * Math.PI * id / count), y: 200 + 150 * Math.sin(2 * Math.PI * id / count) }));
  const base = chart().createData({ id: 'nodes', values: nodes, keyField: 'id' }).createData({ id: 'edges', values: edges, keyField: 'id' })
    .createGraphData({ id: 'graph', nodes: 'nodes', edges: 'edges', nodeKey: 'id', edgeKey: 'id', source: 'source', target: 'target', directed: false })
    .layoutGraph({ id: 'layout', method: 'fixed', options: { positions } });
  const graph = base.semanticSpec.resources.find(r => r.id === 'graph'), layout = base.semanticSpec.resources.find(r => r.id === 'layout');
  const job = edgeRouteJob(base, graph, layout, normalizeRouteIntent('force-directed', {}, 'world'));
  const old = before(job.input), next = after(job.input);
  assert.deepEqual(next, old); assert.equal(routeValueHash(next), routeValueHash(old));
  const published = base.bundleGraphEdges({ id: 'routes', method: 'force-directed' }).semanticSpec.resources.find(r => r.id === 'routes').result;
  assert.deepEqual(published.diagnostics, old.diagnostics); assert.equal(published.resultHash, routeValueHash(old));
  const currentSourceSHA256 = {};
  for (const name of ['forceDirected.js', 'forceNeighbors.js']) currentSourceSHA256[name] = createHash('sha256').update(await readFile(path.join(root, 'src/grammar/graph/routes', name))).digest('hex');
  const report = { node: process.version, count, edges: old.routes.length, hash: routeValueHash(old), diagnostics: old.diagnostics, previousSource, currentSourceSHA256,
    equal: 'all result keys, finite coordinates including signed zero, bounds/provenance/order, options, diagnostics and canonical hash' };
  const out = path.join(root, '.artifacts/route-neighbors'); await mkdir(out, { recursive: true });
  await writeFile(path.join(out, `exact-${process.versions.node.split('.')[0]}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally { await rm(directory, { recursive: true, force: true }); }
