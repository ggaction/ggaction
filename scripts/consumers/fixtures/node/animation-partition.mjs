import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chart, render } from 'ggaction';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, createAnimationPlayer } from 'ggaction/animation';
import { renderToSVG } from 'ggaction/svg';
import { renderToPNGBuffer } from 'ggaction/png';
import { renderToPDFBuffer } from 'ggaction/pdf';
import { createCanvas } from '@napi-rs/canvas';

const options = { durationMs: 100, easing: 'linear' };
const hash = value => createHash('sha256').update(value).digest('hex');
function endpoints() {
  const from = chart().createCanvas({ plot: { width: 300, height: 100 }, margin: { left: 90, right: 90, top: 180, bottom: 80 }, plotBorder: false })
    .createData({ id: 'rows', keyField: 'key', values: [{ key: 'root', parent: null, value: 10 }, { key: 'a', parent: 'root', value: 6 }, { key: 'b', parent: 'root', value: 4 }] })
    .createHierarchyData({ id: 'hierarchy', key: 'key', parent: 'parent', value: 'value' })
    .layoutHierarchy({ id: 'layout', method: 'partition' })
    .createPartitionPlot({ id: 'partition', labels: false, cells: { fill: 'red', strokeWidth: 0 } });
  const to = from.createCoordinate({ id: 'polar', type: 'polar' })
    .editCoordinate({ target: 'polar', polarFrame: { center: { x: .5, y: .5 }, radius: { unit: 'px', value: 100 }, overflow: 'allow' } })
    .editPartitionPlot({ coordinate: 'polar', innerRadius: 20, outerRadius: 100, direction: 'counterclockwise' });
  return { from, to };
}
export const cases = [
  { id: 'animation-partition/offline-four-renderers', async run() {
    const { from, to } = endpoints(), plan = planTransition({ from, to, options }), frame = sampleTransition(plan, 50);
    assert.equal(frame.decisions.filter(d => d.kernel === 'partition').length, 3);
    const canvas = createCanvas(1, 1); render(frame, canvas.getContext('2d'));
    assert.deepEqual([...canvas.getContext('2d').getImageData(240, 230, 1, 1).data], [255, 0, 0, 255]);
    const png = await renderToPNGBuffer(frame), pdf = await renderToPDFBuffer(frame);
    assert.deepEqual(png.buffer, await canvas.encode('png'));
    assert.doesNotMatch(pdf.buffer.toString('latin1'), /\/Subtype\s*\/Image\b/);
    const expected = { scene: hash(JSON.stringify(frame.scene)), svg: hash(renderToSVG(frame)), png: hash(png.buffer), canvas: hash(await canvas.encode('png')), pdf: Buffer.from(pdf.buffer).subarray(0, 4).toString(), network: 0 };
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import http from 'node:http'; import https from 'node:https'; import net from 'node:net'; import tls from 'node:tls'; import {syncBuiltinESMExports} from 'node:module';
      let network=0; const deny=()=>{network++;throw Error('offline');};globalThis.fetch=deny;
      for(const value of [http,https]){value.get=deny;value.request=deny;}net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;tls.connect=deny;syncBuiltinESMExports();
      const {createHash}=await import('node:crypto'),{render}=await import('ggaction'),{createCanvas}=await import('@napi-rs/canvas');
      const {deserializeAnimation,sampleTransition}=await import('ggaction/animation'),{renderToSVG}=await import('ggaction/svg'),{renderToPNGBuffer}=await import('ggaction/png'),{renderToPDFBuffer}=await import('ggaction/pdf');
      let saved='';for await(const chunk of process.stdin)saved+=chunk;
      const frame=sampleTransition(deserializeAnimation(saved).plan,50),hash=value=>createHash('sha256').update(value).digest('hex'),canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));
      const png=await renderToPNGBuffer(frame),pdf=await renderToPDFBuffer(frame);
      console.log(JSON.stringify({scene:hash(JSON.stringify(frame.scene)),svg:hash(renderToSVG(frame)),png:hash(png.buffer),canvas:hash(await canvas.encode('png')),pdf:Buffer.from(pdf.buffer).subarray(0,4).toString(),network}));
    `], { input: serializeAnimation(plan), encoding: 'utf8', timeout: 30000 });
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), expected);
  } },
  { id: 'animation-partition/current-frame-interruption', async run() {
    const { from, to } = endpoints(), plan = planTransition({ from, to, options });
    const player = createAnimationPlayer({ plan, clock: { now: () => 0, requestFrame() { throw Error('Paused player scheduled a callback'); }, cancelFrame() {} }, render() {} });
    player.seek(50);
    for (let i = 0; i < 32; i++) {
      const captured = player.getFrame(), finished = player.finished;
      player.interrupt({ to: i % 2 ? from : to, options });
      assert.equal(player.getFrame(), captured);
      assert.equal((await finished).reason, 'interrupted');
      player.seek(50);
      assert.equal(player.getFrame().decisions.filter(d => d.kernel === 'partition').length, 3);
    }
    const captured = player.getFrame(), rebased = planTransition({ from: captured, to, options });
    assert.equal(sampleTransition(rebased, 0), captured);
    assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(rebased)).plan, 50), sampleTransition(rebased, 50));
    player.dispose();
  } },
  { id: 'animation-partition/fallback-and-immutable-failure', run() {
    const { from, to } = endpoints(), saved = JSON.stringify(from);
    const plan = planTransition({ from, to: to.editPartitionPlot({ direction: 'clockwise' }), options });
    assert.ok(plan.tracks.every(track => track.reason === 'handedness'));
    const frame = sampleTransition(plan, 50);
    assert.deepEqual(sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan, 50), frame);
    assert.throws(() => planTransition({ from: structuredClone(frame), to, options }), /ChartProgram/);
    const broken = JSON.parse(serializeAnimation(plan)); broken.digest = '0'.repeat(64);
    assert.throws(() => deserializeAnimation(JSON.stringify(broken)), /digest/);
    assert.equal(JSON.stringify(from), saved);
  } }
];
