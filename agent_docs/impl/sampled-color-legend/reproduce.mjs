// 현재 public API의 한계만 재현한다. 새 API를 구현하거나 차트 이미지를 검사하지 않는다.
import assert from 'node:assert/strict';
import { chart } from '../../../src/index.js';

const program = chart()
  .createCanvas({ width: 600, height: 400, margin: 100 })
  .createData({ values: [{ x: 1, y: 2, value: 1 }, { x: 2, y: 1, value: 9 }] })
  .createPointMark({ id: 'points' })
  .encodeX({ field: 'x' }).encodeY({ field: 'y' })
  .encodeColor({ field: 'value', fieldType: 'quantitative' });
const snapshot = JSON.stringify(program), probes = [];
for (const args of [
  { channels: ['color'] },
  { channels: ['color'], values: [2, 4, 6, 8] },
  { representation: 'symbols', values: [2, 4, 6, 8] }
]) {
  try {
    const result = program.createLegend(args);
    probes.push({ args, status: 'supported', kinds: Object.keys(result.guideConfigs.legend) });
  } catch (error) {
    probes.push({ args, status: 'unsupported', error: error.message });
  }
  assert.equal(JSON.stringify(program), snapshot);
}
assert.equal(probes[0].status, 'supported');
assert.deepEqual(probes[0].kinds, ['gradient']);
assert.equal(probes[1].status, 'unsupported');
assert.match(probes[1].error, /do not support exact sample values/);
assert.equal(probes[2].status, 'unsupported');
console.log(JSON.stringify({ kind: 'pre-implementation-api-gap', probes,
  previousProgramUnchanged: true, chartPixelsInspected: false, paidCalls: 0 }, null, 2));
