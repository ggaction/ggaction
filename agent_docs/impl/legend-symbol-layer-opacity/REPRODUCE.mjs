// Reproduce current public behavior; does not implement the proposed option.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chart} from '../../../src/index.js';
const base = chart()
  .createCanvas({width: 560, height: 360, margin: {left: 50, right: 180, top: 40, bottom: 50}})
  .createData({values: [{x: 1, y: 2, group: 'A'}, {x: 3, y: 4, group: 'B'}]})
  .createScatterPlot({x: 'x', y: 'y', guides: false})
  .encodeColor({field: 'group'})
  .encodeStroke({field: 'group'})
  .editPointMark({opacity: 0.7, strokeWidth: 2});
const recipe = {layers: [{type: 'point', size: 5, strokeWidth: 1.5}]};
const p = base.createLegend({symbol: recipe});
const points = p.graphicSpec.objects.seriesLegendSymbolPoints;
assert(points && points.type === 'circle');
const samples = points.items ?? [points];
const sampleProperties = samples.map(item => item.properties);
assert(sampleProperties.length === 2);
const sampleOpacity = sampleProperties[0].opacity ?? 1;
assert(sampleProperties.every(p => (p.opacity ?? 1) === 1));
assert.equal(sampleOpacity, 1);
const rejected = [];
for (const type of ['point', 'line', 'swatch']) {
  const symbol = {layers: [{type, opacity: 0.7}]};
  for (const [method, owner] of [['createLegend', base], ['editLegend', p], ['editLegendSymbols', p]]) {
    let message;
    try { owner[method]({symbol}); } catch (error) {message = error.message;}
    assert(message && message.includes('opacity'), `${method}/${type} must reject the unsupported key`);
    rejected.push({method, type, message});
  }
}
assert.deepEqual(recipe, {layers: [{type: 'point', size: 5, strokeWidth: 1.5}]});
const result = {
  status: 'current-public-gap-reproduced-no-implementation',
  genericRows: 2, markOpacity: 0.7, legendSampleEffectiveOpacity: sampleOpacity,
  sampleCount: sampleProperties.length,
  sampleFill: sampleProperties.map(p => p.fill), sampleStroke: sampleProperties.map(p => p.stroke),
  rejected, publicOptionImplemented: false, chartPixelsInspected: false,
  modelCalls: 0
};
fs.writeFileSync(new URL('./REPRODUCTION.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
