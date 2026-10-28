import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileTypeScript } from "../support/typescript.js";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("hierarchy public types preserve explicit sources, layout policies and Full boundaries", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-hierarchy-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import { chart, type HierarchyResource, type HierarchyLayoutResource } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basicChart } from ${JSON.stringify(path.join(root, "types/basic.js"))};
import { inspectProgram, comparePrograms } from ${JSON.stringify(path.join(root, "types/inspection.js"))};
const p = chart().createData({ values: [{ id: 'a', parent: null, v: 3 }] })
 .createHierarchyData({ id: 'h', key: 'id', parent: 'parent', value: 'v', valueMode: 'inclusive' })
 .layoutHierarchy({ id: 'l', method: 'tree', options: { nodeSize: [10, 10], siblingGap: 4, depthGap: 5, orientation: 'radial', radius: 100, startAngle: 0, sweep: 360 } })
 .createTreePlot({ labels: { overrides: [{ key: 'a', text: 'Node A' }] }, nodes: { opacity: 0 } })
 .editTreePlot({ links: false, origin: 'auto' })
 .editLayout({ options: { orientation: 'horizontal' } })
 .editHierarchyData({ valueMode: 'leaf-sum' });
p.removeResource({ kind: 'layout', id: 'l' });
chart().createHierarchyData({ id: 'nested', key: 'id', children: 'children', value: 'v' });
chart().createHierarchyData({ id: 'groups', groupFields: ['a', 'b'], value: 'v', missingCategory: 'include' })
 .layoutHierarchy({ id: 'map', method: 'treemap', order: { by: 'field', field: 'rank', direction: 'ascending', nulls: 'last' }, options: { size: [100, 200], padding: 3, method: 'squarify' } })
 .createTreemapPlot({ cells: { overrides: [{ path: ['A', null], fill: 'red' }] } }).editTreemapPlot({ labels: false });
inspectProgram(p, { target: { kind: 'hierarchy', id: 'h' } });
comparePrograms(p, p, { target: { kind: 'layout', id: 'l' } });
for (const r of p.semanticSpec.resources) {
 if (r.kind === 'hierarchy') { const h: HierarchyResource = r; h.result.nodes.map(n => n.totalValue); }
 if (r.kind === 'layout') { const l: HierarchyLayoutResource = r; l.inputs[0].revision; }
}
// @ts-expect-error Basic does not register hierarchy actions
basicChart().createHierarchyData({ id: 'h', key: 'id', parent: 'p', value: 'v' });
// @ts-expect-error Basic does not register hierarchy plot actions
basicChart().createTreePlot();
// @ts-expect-error exactly one source form
chart().createHierarchyData({ id: 'h', key: 'id', parent: 'p', children: 'kids', value: 'v' });
// @ts-expect-error groups accept leaf-sum only
chart().createHierarchyData({ id: 'h', groupFields: ['g'], value: 'v', valueMode: 'inclusive' });
// @ts-expect-error tree layout decisions are explicit
p.layoutHierarchy({ id: 'l', method: 'tree', options: { orientation: 'vertical' } });
// @ts-expect-error radial options require radial orientation
p.layoutHierarchy({ id: 'l', method: 'tree', options: { nodeSize: [1, 1], siblingGap: 1, depthGap: 1, orientation: 'horizontal', radius: 100 } });
// @ts-expect-error layout edit keeps its method
p.editLayout({ method: 'treemap' });
// @ts-expect-error branch targets use scalar keys
p.editTreePlot({ nodes: { overrides: [{ key: ['a'], fill: 'red' }] } });
// @ts-expect-error hierarchy paint does not create an encoded field
p.editTreemapPlot({ cells: { field: 'v' } });
// @ts-expect-error node radius belongs to tree only
p.createTreemapPlot({ cells: { radius: 5 } });
// @ts-expect-error explicit undefined is not an edit
p.editTreePlot({ labels: undefined });
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
