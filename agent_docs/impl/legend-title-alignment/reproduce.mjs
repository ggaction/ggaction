// Source-neutral read-only public API reproduction; no chart pixels or external data.
// node agent_docs/impl/legend-title-alignment/reproduce.mjs [runtime-root]
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const runtimeRoot = path.resolve(process.argv[2] ?? '.');
const {chart} = await import(pathToFileURL(path.join(runtimeRoot, 'src/index.js')));
const {resolveConcreteGraphicBounds} = await import(pathToFileURL(path.join(runtimeRoot, 'src/grammar/schemas/graphicBounds.js')));
const base = () => chart().createCanvas({width: 600, height: 460, margin: {left: 60, top: 40, right: 20, bottom: 100}})
  .createData({values: [{x: 1, y: 2, group: 'Alpha'}, {x: 2, y: 3, group: 'Beta'}, {x: 3, y: 1, group: 'Longer category'}]})
  .createScatterPlot({x: 'x', y: 'y', guides: false}).encodeColor({field: 'group'});
const legend = {direction: 'horizontal', title: 'Group', titleStyle: {fontSize: 11}, labels: {fontSize: 10}};
const cases = {
  centeredTop: p => p.createLegend({...legend, at: {x: -40, y: 340}}),
  inlineLeft: p => p.createLegend({...legend, at: {x: -40, y: 340}, titlePosition: 'left'}),
  simultaneousAnchor: p => p.createLegend({...legend, at: {x: -40, y: 340}, position: 'bottom-left'}),
  cornerThenFree: p => p.createLegend({...legend, position: 'bottom-left'}).editLegendLayout({at: {x: -40, y: 340}}),
  requestedTitleAlignment: p => p.createLegend({...legend, at: {x: -40, y: 340}, titleStyle: {fontSize: 11, align: 'left'}})
};
const results = [];
for (const [name, run] of Object.entries(cases)) {
  try {
    const p = run(base());
    results.push({name, pass: true, title: p.graphicSpec.objects.colorLegendTitle,
      bounds: resolveConcreteGraphicBounds(p.graphicSpec, 'colorLegendTitle')});
  } catch (error) { results.push({name, pass: false, error: error.message}); }
}
assert.equal(results.find(r => r.name === 'centeredTop').title.properties.textAlign, 'center');
assert.equal(results.find(r => r.name === 'inlineLeft').title.properties.textAlign, 'left');
assert.match(results.find(r => r.name === 'simultaneousAnchor').error, /conflicts/);
assert.match(results.find(r => r.name === 'requestedTitleAlignment').error, /Unknown.*align/);
const evidence = {reviewer: 'codex', status: 'proposal-only-current-behavior', chartPixelsInspected: false, newModelResponses: 0, results};
if (process.env.EVIDENCE_OUTPUT) fs.writeFileSync(process.env.EVIDENCE_OUTPUT, JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
