import fs from 'node:fs';
const auditOutput = new URL('../../../../.artifacts/roadmap6-audit-replay/', import.meta.url);
fs.mkdirSync(auditOutput, { recursive: true });

import { chart } from '../../../../src/index.js';
import { searchGgaction } from '../../../../knowledge/task-resolver.js';

const rows = [
  { x: 1, y: 2, low: 1, high: 3, category: 'A', series: 'one', region: 'east', size: 2 },
  { x: 2, y: 3, low: 2, high: 4, category: 'A', series: 'one', region: 'east', size: 2 },
  { x: 1, y: 4, low: 3, high: 5, category: 'B', series: 'two', region: 'east', size: 4 },
  { x: 2, y: 5, low: 4, high: 6, category: 'B', series: 'two', region: 'east', size: 4 }
];
const base = () => chart().createCanvas({ width: 1000, height: 700, margin: 150 }).createData({ values: rows });
const point = () => base().createScatterPlot({ x: 'x', y: 'y', guides: false });
const line = () => base().createLinePlot({ x: 'x', y: 'y', groupBy: 'series', guides: false });
const polar = () => base().createPointMark().encodeTheta({ field: 'x' }).encodeR({ field: 'y' });
const results = [];
function check(id, claim, run) {
  try { results.push({ id, claim, outcome: 'accepted', details: run() }); }
  catch (error) { results.push({ id, claim, outcome: 'rejected', error: error.message }); }
}
function summary(p) {
  return { layers: p.semanticSpec.layers.map(l => ({ id: l.id, mark: l.mark.type, encoding: l.encoding })), guides: p.semanticSpec.guides };
}
function band() {
  return base().createErrorBand({ id: 'band', x: { field: 'x' }, y: { center: 'y', lower: 'low', upper: 'high' }, groupBy: 'category' }).encodeColor({ target: 'band', field: 'category' });
}

check('P01', 'Two complete facades with omitted guides', () => summary(base().createScatterPlot({ x: 'x', y: 'y' }).createLinePlot({ x: 'x', y: 'y' })));
check('P02', 'Second facade with guides:false', () => summary(base().createScatterPlot({ x: 'x', y: 'y' }).createLinePlot({ x: 'x', y: 'y', guides: false })));
check('P03', 'Group line by series, color by region (constant within each series)', () => summary(line().encodeColor({ field: 'region' })));
check('P04', 'Constant line stroke width through encodeStrokeWidth', () => summary(line().encodeStrokeWidth({ value: 4 })));
check('P05', 'Field line stroke width through encodeStrokeWidth', () => summary(line().encodeStrokeWidth({ field: 'size' })));
check('P06', 'Constant line opacity through encodeOpacity', () => summary(line().encodeOpacity({ value: 0.5 })));
check('P07', 'Constant line opacity through editLineMark', () => summary(line().editLineMark({ opacity: 0.5 })));
for (const kind of ['Point', 'Bar', 'Area', 'Arc', 'Rect']) {
  check(`P08-${kind}`, `Creation-time ${kind} stroke:false`, () => summary(base()[`create${kind}Mark`]({ stroke: false })));
}
check('P09', 'Numeric color string shorthand', () => summary(base().createScatterPlot({ x: 'x', y: 'y', color: 'size', guides: false })));
check('P10', 'Grouped bar to stacked layout edit', () => summary(base().createBarPlot({ x: 'category', y: 'y', color: 'series', guides: false }).encodeColor({ field: 'series', layout: 'stack' })));
check('P11', 'Bar width authored before positions', () => summary(base().createBarMark().encodeBarWidth({ band: 0.5 })));
check('P12', 'Cartesian axis title:false on create', () => summary(point().createXAxis({ title: false })));
check('P13', 'Polar axis title:false on create', () => summary(polar().createThetaAxis({ title: false })));
check('P14', 'Restore disabled Polar title using public editor', () => summary(polar().createThetaAxis({ title: false }).editThetaAxisTitle({ text: 'Angle' })));
check('P15', 'Remove Polar title through axis editor', () => summary(polar().createThetaAxis().editThetaAxis({ title: false })));
check('P16', 'Hide text-colored area using general fill edit', () => summary(band().editAreaMark({ fill: 'black' })));
check('P17', 'Override field-colored error band using owner fill edit', () => {
  const p = band().editErrorBand({ fill: 'black' });
  return { ...summary(p), graphic: p.graphicSpec.objects.band };
});
check('P18', 'createDerivedData filter produces values', () => {
  const p = base().createDerivedData({ id: 'derived', source: 'data', transform: [{ type: 'filter', field: 'x', predicate: { op: 'gt', value: 1 } }] });
  return { dataset: p.semanticSpec.datasets.find(d => d.id === 'derived') };
});
check('P19', 'Use directly declared derived dataset for chart', () => summary(base().createDerivedData({ id: 'derived', source: 'data', transform: [{ type: 'filter', field: 'x', predicate: { op: 'gt', value: 1 } }] }).createScatterPlot({ data: 'derived', x: 'x', y: 'y', guides: false })));
check('P20', 'Second filterMarks call', () => summary(point().filterMarks({ field: 'x', op: 'gte', value: 1 }).filterMarks({ field: 'y', op: 'gte', value: 3 })));
check('P21', 'Zero-match filterMarks', () => summary(point().filterMarks({ field: 'x', op: 'gt', value: 100 })));
check('P22', 'Date values 1000 and 2000 in temporal position', () => {
  const p = chart().createCanvas().createData({ values: [{ t: 1000, v: 1 }, { t: 2000, v: 2 }] }).createScatterPlot({ x: { field: 't', fieldType: 'temporal' }, y: 'v', guides: false });
  return { scales: p.resolvedScales };
});
check('P23', 'Box plot guides omission', () => summary(base().createBoxPlot({ x: { field: 'category', fieldType: 'nominal' }, y: { field: 'y', fieldType: 'quantitative' } })));
check('P24', 'Violin plot guides omission', () => summary(base().createViolinPlot({ x: 'category', y: 'y' })));
check('P25', 'Violin density orientation edit', () => summary(base().createViolinPlot({ x: 'category', y: 'y', guides: false }).editDensity({ densityChannel: 'y' })));
check('P26', 'Constant point radius nested in scatter facade', () => summary(base().createScatterPlot({ x: 'x', y: 'y', point: { radius: 5 }, guides: false })));
check('P27', 'Default guides on a categorical count pie', () => summary(base().createArcMark().encodeTheta({ field: 'category', aggregate: 'count' }).encodeColor({ field: 'category' }).createGuides()));
check('P28', 'Standalone size legend at left', () => summary(point().encodeSize({ field: 'size' }).createLegend({ channels: ['size'], position: 'left' })));
check('P29', 'Partial removal of color from combined color/shape legend', () => summary(point().encodeColor({ field: 'category' }).encodeShape({ field: 'category' }).createLegend().removeLegend({ channels: ['color'] })));
for (const zero of [undefined, true]) {
  check(zero ? 'P31' : 'P30', 'Positive radial sectors with ' + (zero ? 'explicit zero' : 'default radial domain'), () => {
    const p = chart().createCanvas().createData({ values: [{ category: 'A', value: 2 }, { category: 'B', value: 3 }, { category: 'C', value: 4 }] }).createArcMark().encodeTheta({ field: 'category', fieldType: 'nominal' }).encodeR({ field: 'value', ...(zero ? { scale: { zero: true } } : {}) });
    return { scale: p.resolvedScales.radius, itemCount: p.graphicSpec.objects.arc.items.length };
  });
}
check('P32', 'Default bar aggregation with repeated category', () => summary(base().createBarPlot({ x: 'category', y: 'y', guides: false })));
check('P33', 'Cartesian axis label rotation', () => summary(point().createXAxis().editXAxisLabels({ rotation: 0.5 })));
check('P34', 'Percentage text format', () => summary(point().createTextMark().encodeText({ field: 'size', format: '.1%' })));
check('P35', 'Shortest horizontal bar facade', () => summary(base().createBarPlot({ x: 'y', y: 'category', guides: false })));
check('P36', 'Horizontal bar facade with explicit aggregate', () => summary(base().createBarPlot({ x: { field: 'y', aggregate: 'mean' }, y: 'category', guides: false })));
check('P37', 'Quantitative bar y before categorical x, omitted aggregate', () => summary(base().createBarMark().encodeY({ field: 'y' }).encodeX({ field: 'category', fieldType: 'nominal' })));
check('P38', 'Horizontal temporal-category bar at runtime', () => summary(chart().createCanvas().createData({ values: [{ when: '2025-01-01', amount: 3 }, { when: '2025-02-01', amount: 5 }] }).createBarPlot({ x: { field: 'amount', aggregate: 'sum' }, y: { field: 'when', fieldType: 'temporal' }, guides: false })));
check('P39', 'CI upper aggregate versus default interval upper on the same three rows', () => {
  const p = chart().createCanvas().createData({ values: [{ c: 'A', v: 1 }, { c: 'A', v: 2 }, { c: 'A', v: 3 }] });
  const bar = p.createBarPlot({ x: 'c', y: { field: 'v', aggregate: 'ciUpper' }, guides: false });
  const interval = p.createIntervalData({ id: 'interval', field: 'v', as: { center: 'center', lower: 'lower', upper: 'upper' } });
  const labeled = bar.createTextMark({ id: 'ciLabel' }).encodeText({ field: 'v', format: '.12f' });
  return { ciUpperLabels: labeled.graphicSpec.objects.ciLabel.items.map(i => i.properties.text), interval: interval.semanticSpec.datasets.find(d => d.id === 'interval').values };
});
for (const query of ['pie chart', 'density plot', 'rose chart', 'radial bar chart', 'radar chart', 'area chart', 'strip plot']) {
  check(`MCP-${query}`, 'Current chart-intent resolution', () => searchGgaction(query));
}

fs.writeFileSync(new URL('probe-results.json', auditOutput), JSON.stringify(results, null, 2) + '\n');
for (const r of results) {
  console.log(r.id, r.outcome, r.error ?? (r.id.startsWith('MCP-') ? JSON.stringify({ calls: r.details.exactCalls, unresolved: r.details.unresolved }) : JSON.stringify(r.details).slice(0, 850)));
}
