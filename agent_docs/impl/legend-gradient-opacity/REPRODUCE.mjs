// Current public behavior only. Does not implement the proposed API.
import fs from 'node:fs';
import {chart} from 'ggaction';
const p = chart()
  .createCanvas({width: 700, height: 500, margin: {left: 100, top: 80, right: 200, bottom: 100}})
  .createData({values: [{x: 0, y: 0, c: 0}, {x: 1, y: 1, c: 9}]})
  .createScatterPlot({x: 'x', y: 'y', guides: false})
  .encodeColor({field: 'c', fieldType: 'quantitative', scale: {domain: [0, 9]}})
  .editPointMark({opacity: 0.7})
  .createLegend();
let error;
try { p.editLegendBlock({target: 'scatterPlot', channel: 'color', symbol: {opacity: 0.7}}); }
catch (caught) { error = caught.message; }
const strips = p.graphicSpec.objects.colorGradientStrips.items;
const result = {status: 'current-behavior-reproduction-not-an-implementation', reviewer: 'codex',
  genericRows: 2, markOpacity: 0.7, gradientStripCount: strips.length,
  gradientEffectiveOpacities: [...new Set(strips.map(item => item.properties.opacity ?? 1))],
  unsupportedExistingPatch: error, proposedDefault: 1, publicAPIImplemented: false,
  newModelCalls: 0, chartPixelsInspected: false};
if (result.gradientEffectiveOpacities.join() !== '1' || !error) throw Error('Reproduction changed.');
fs.writeFileSync(new URL('./REPRODUCTION.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
