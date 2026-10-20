import {chart} from '../../../src/index.js';
const rows = [
  {group: 'known', x: 0, y: 2}, {group: 'known', x: 1, y: 2},
  {group: 'other', x: 0, y: 1}, {group: 'other', x: 1, y: 1}
];
const base = () => chart()
  .createCanvas({plot: {width: 200, height: 120},
    margin: {left: 20, right: 100, top: 20, bottom: 30}, plotBorder: false})
  .createData({values: rows})
  .createLinePlot({x: 'x', y: 'y', guides: false});
const results = [];
for (const [route, build] of [
  ['default-strict', () => base().encodeStrokeDash({field: 'group', scale: {
    domain: ['known'], range: [[4, 2]]
  }})],
  ['explicit-fallback', () => base().encodeStrokeDash({field: 'group', scale: {
    domain: ['known'], range: [[4, 2]], unknown: []
  }})],
  ['generic-scale-edit', () => base()
    .encodeStrokeDash({field: 'group', scale: {range: [[4, 2]]}})
    .editScale({id: 'strokeDash', domain: ['known'], unknown: []})]
]) {
  try {
    const program = build();
    results.push({route, status: 'built', rawRows: program.semanticSpec.datasets[0].values,
      scale: program.semanticSpec.scales.find(scale => scale.id === 'strokeDash'),
      paths: program.graphicSpec.objects.linePlot.items.map(item => item.properties)});
  } catch (error) {
    results.push({route, status: 'rejected', error: error.message});
  }
}
process.stdout.write(JSON.stringify({results}, null, 2) + '\n');
