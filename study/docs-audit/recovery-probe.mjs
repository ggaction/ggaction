import { chart, render } from '../../ggaction/src/index.js';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const original = chart().createCanvas({ width: 640, height: 400 })
  .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
  .createScatterPlot({ x: 'x', y: 'y' });
let current = original;
// Mirrors docs/errors-and-recovery.md; a null context induces output failure.
function applyRevision(revise) {
  try {
    const candidate = revise(current);
    current = candidate;
    render(current, null);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}
const recovery = applyRevision(program => program.editCanvas({ width: 840, height: 480 }));
let existingCanvas;
try {
  original.createCanvas({ width: 720, height: 460, margin: { top: 40, right: 140, bottom: 70, left: 80 } });
  existingCanvas = { accepted: true };
} catch (error) {
  existingCanvas = { accepted: false, message: error.message };
}
const result = { recovery: { ...recovery, previousProgramRetainedAsCurrent: current === original }, existingCanvas };
const require = createRequire(new URL('../../ggaction/package.json', import.meta.url));
const { createCanvas } = require('@napi-rs/canvas');
const canvas = createCanvas(1, 1);
current = original;
try {
  const candidate = current.editCanvas({ width: 40000, height: 400 });
  current = candidate;
  render(current, canvas.getContext('2d'));
  result.validContextRecovery = { ok: true };
} catch (error) {
  result.validContextRecovery = { ok: false, message: error.message,
    previousProgramRetainedAsCurrent: current === original, canvasWidth: canvas.width };
}
await writeFile(new URL('./evidence/recovery-probe.json', import.meta.url), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
