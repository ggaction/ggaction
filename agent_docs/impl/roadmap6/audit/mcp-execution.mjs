import fs from 'node:fs';
const auditOutput = new URL('../../../../.artifacts/roadmap6-audit-replay/', import.meta.url);
fs.mkdirSync(auditOutput, { recursive: true });

import { chart } from '../../../../src/index.js';
import { searchGgaction } from '../../../../knowledge/task-resolver.js';

const values = [
  { x: 1, y: 2, value: 2, category: 'A', series: 'one' },
  { x: 2, y: 3, value: 3, category: 'B', series: 'one' },
  { x: 3, y: 4, value: 4, category: 'C', series: 'one' }
];
const results = [];
const queries = ['pie chart', 'density plot', 'rose chart', 'radial bar chart', 'radar chart', 'area chart', 'strip plot'];
for (const query of queries) {
  const packet = searchGgaction(query);
  const code = [packet.authoring.initialize, ...packet.authoring.prerequisites.map(p => p.call), ...packet.authoring.steps, 'return program'].join(';\n');
  try {
    // Execute the repository's reviewed templates on local synthetic data.
    const p = new Function('chart', 'values', code)(chart, values);
    results.push({
      query, calls: packet.exactCalls, unresolved: packet.unresolved,
      layers: p.semanticSpec.layers.map(l => ({ id: l.id, mark: l.mark.type, coordinate: l.coordinate, encoding: l.encoding })),
      items: p.semanticSpec.layers.map(l => ({ id: l.id, items: p.graphicSpec.objects[l.id]?.items?.length ?? 0 }))
    });
  } catch (error) {
    results.push({ query, calls: packet.exactCalls, unresolved: packet.unresolved, error: error.message });
  }
}
fs.writeFileSync(new URL('mcp-execution.json', auditOutput), JSON.stringify(results, null, 2) + '\n');
for (const result of results) console.log(JSON.stringify({ query: result.query, items: result.items, error: result.error, unresolved: result.unresolved }));
