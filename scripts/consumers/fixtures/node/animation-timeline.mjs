import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chart, render } from 'ggaction';
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation, createAnimationPlayer } from 'ggaction/animation';
import { createInteractionSession } from 'ggaction/interaction';
import { getMarkItems } from 'ggaction/inspection';
import { renderToSVG } from 'ggaction/svg';
import { renderToPNGBuffer } from 'ggaction/png';
import { renderToPDFBuffer } from 'ggaction/pdf';
import { createCanvas } from '@napi-rs/canvas';

const options = { durationMs: 100, easing: 'linear' };
const markers = [{ id: 'start', timeMs: 0 }, { id: 'middle', timeMs: 50 }, { id: 'end', timeMs: 100 }];
const hash = value => createHash('sha256').update(value).digest('hex');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} differs from ${expected}`);
const circle = frame => frame.scene.nodes.find(node => node.type === 'circle');
// At owner progress 1/4 the raw value is 25.75, then the native log scale maps it.
const middleX = 300 * Math.log10(25.75) / 3;

function endpoints() {
  const from = chart().createCanvas({ plot: { width: 300, height: 120 }, margin: 0, plotBorder: false, background: 'white' })
    .createData({ id: 'rows', keyField: 'id', values: [{ id: 'a', x: 1, y: 5 }] })
    .createPointMark({ id: 'points', fill: 'black', stroke: 'none', strokeWidth: 0 }).encodeRadius({ value: 12 })
    .encodeX({ field: 'x', scale: { type: 'log', domain: [1, 1000], nice: false } })
    .encodeY({ field: 'y', scale: { domain: [0, 10], nice: false } })
    .selectMarks({ id: 'picked', target: 'points', items: [], empty: 'none' });
  const to = from.reviseData({ source: 'rows', id: 'next', values: [{ id: 'a', x: 100, y: 5 }] }).editPointMark({ fill: 'white' });
  const ordinary = planTransition({ from, to, options });
  const { ownerKey, itemKey } = sampleTransition(ordinary, 50).decisions.find(decision => decision.itemKey !== undefined);
  const plan = planTransition({ from, to, options: { ...options, markers, tracks: [
    { target: { ownerKey }, property: 'geometry', kernel: 'native-progress',
      keyframes: [{ timeMs: 0, value: 0 }, { timeMs: 50, value: .25 }, { timeMs: 100, value: 1 }] },
    { target: { itemKey }, property: 'fill', kernel: 'color',
      keyframes: [{ timeMs: 0, value: 'black' }, { timeMs: 50, value: 'red' }, { timeMs: 100, value: 'white' }] }
  ] } });
  return { from, to, plan, itemKey };
}

function virtualClock() {
  let time = 0, sequence = 0;
  const callbacks = new Map();
  return {
    now: () => time,
    requestFrame(callback) { callbacks.set(++sequence, callback); return sequence; },
    cancelFrame(id) { callbacks.delete(id); },
    set(next) { time = next; },
    tick(next) { time = next; const pending = [...callbacks.values()]; callbacks.clear(); for (const callback of pending) callback(); },
    pending: () => callbacks.size
  };
}

export const cases = [
  { id: 'animation-timeline/nonlinear-offline-four-renderers', async run() {
    const { from, to, plan } = endpoints(), frame = sampleTransition(plan, 50), canvas = createCanvas(1, 1);
    close(circle(frame).properties.x, middleX);
    assert.ok(Math.abs(circle(frame).properties.x - 50) > 80, 'A raw-value log mapping must differ from a quarter pixel lerp');
    assert.equal(sampleTransition(plan, 0).graphicSpec, from.graphicSpec);
    assert.equal(sampleTransition(plan, 100).graphicSpec, to.graphicSpec);
    render(frame, canvas.getContext('2d'));
    assert.deepEqual([...canvas.getContext('2d').getImageData(Math.floor(middleX), 60, 1, 1).data], [255, 0, 0, 255]);
    assert.deepEqual([...canvas.getContext('2d').getImageData(50, 60, 1, 1).data], [255, 255, 255, 255]);
    const png = await renderToPNGBuffer(frame), pdf = await renderToPDFBuffer(frame), svg = renderToSVG(frame), canvasPNG = await canvas.encode('png');
    assert.deepEqual(png.buffer, canvasPNG);
    assert.match(svg, /<circle/);
    assert.equal(pdf.buffer.subarray(0, 4).toString(), '%PDF');
    assert.doesNotMatch(pdf.buffer.toString('latin1'), /\/Subtype\s*\/Image\b/);
    const expected = { scene: hash(JSON.stringify(frame.scene)), svg: hash(svg), png: hash(png.buffer), canvas: hash(canvasPNG), pdf: '%PDF', network: 0 };
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import http from 'node:http'; import https from 'node:https'; import net from 'node:net'; import tls from 'node:tls'; import {syncBuiltinESMExports} from 'node:module';
      let network=0; const deny=()=>{network++;throw Error('offline');}; globalThis.fetch=deny;
      for(const value of [http,https]){value.get=deny;value.request=deny;} net.connect=deny;net.createConnection=deny;net.Socket.prototype.connect=deny;tls.connect=deny;syncBuiltinESMExports();
      const {createHash}=await import('node:crypto'),{render}=await import('ggaction'),{createCanvas}=await import('@napi-rs/canvas');
      const {deserializeAnimation,sampleTransition}=await import('ggaction/animation'),{renderToSVG}=await import('ggaction/svg'),{renderToPNGBuffer}=await import('ggaction/png'),{renderToPDFBuffer}=await import('ggaction/pdf');
      let saved='';for await(const chunk of process.stdin)saved+=chunk;
      const frame=sampleTransition(deserializeAnimation(saved).plan,50),hash=value=>createHash('sha256').update(value).digest('hex'),canvas=createCanvas(1,1);render(frame,canvas.getContext('2d'));
      const png=await renderToPNGBuffer(frame),pdf=await renderToPDFBuffer(frame);
      if(/\\/Subtype\\s*\\/Image\\b/.test(pdf.buffer.toString('latin1')))throw Error('Vector frame became an image');
      console.log(JSON.stringify({scene:hash(JSON.stringify(frame.scene)),svg:hash(renderToSVG(frame)),png:hash(png.buffer),canvas:hash(await canvas.encode('png')),pdf:pdf.buffer.subarray(0,4).toString(),network}));
    `], { input: serializeAnimation(plan), encoding: 'utf8', timeout: 30000 });
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), expected);
  } },
  { id: 'animation-timeline/player-marker-lifetimes', async run() {
    const { from, plan } = endpoints(), clock = virtualClock(), events = [], commits = [];
    let player;
    player = createAnimationPlayer({ plan, clock, repeat: 1, render() {}, commit: frame => commits.push(frame),
      onMarker(event) { assert.equal(event.frame, player.getFrame()); events.push([event.id, event.iteration]); } });
    try {
      player.play(); clock.tick(150);
      assert.deepEqual(events, [['start', 0], ['middle', 0], ['end', 0], ['start', 1], ['middle', 1]]);
      clock.tick(200);
      assert.equal((await player.finished).reason, 'completed'); assert.equal(commits.length, 1);
      player.seek(75, { emit: true });
      assert.equal(events.length, 6, 'A backward seek from a terminal frame must be silent');
      player.seek(0).play(); clock.set(260);
      const captured = player.getFrame(), previousRun = player.finished;
      assert.throws(() => player.interrupt({ to: from, options: { durationMs: 100,
        markers: [{ id: 'duplicate', timeMs: 0 }, { id: 'duplicate', timeMs: 50 }] } }), /unique/);
      assert.equal(player.getFrame(), captured); assert.equal(player.finished, previousRun); assert.equal(clock.pending(), 1);
      player.interrupt({ to: from, options: { ...options, markers: [{ id: 'next-start', timeMs: 0 }, { id: 'next-middle', timeMs: 50 }, { id: 'next-end', timeMs: 100 }] } });
      assert.equal((await previousRun).reason, 'interrupted');
      assert.deepEqual(events.slice(-2), [['middle', 0], ['next-start', 0]]);
      clock.tick(310); clock.tick(360);
      assert.deepEqual(events.slice(-3), [['next-start', 0], ['next-middle', 0], ['next-end', 0]]);
      assert.equal((await player.finished).reason, 'completed'); assert.equal(commits.length, 2); assert.equal(clock.pending(), 0);
    } finally { player.dispose(); }
    const resumedClock = virtualClock(), resumedEvents = [], resumed = createAnimationPlayer({ plan, clock: resumedClock, render() {}, onMarker: event => resumedEvents.push(event.id) });
    try {
      resumed.seek(75).play().pause().seek(0).play().pause().play();
      assert.deepEqual(resumedEvents, ['start'], 'First playback from zero emits its marker exactly once');
      resumedClock.tick(100);
      assert.deepEqual(resumedEvents, ['start', 'middle', 'end']);
      assert.equal((await resumed.finished).reason, 'completed');
    } finally { resumed.dispose(); }
  } },
  { id: 'animation-timeline/current-hit-selection-rebase', async run() {
    const { from, to, plan, itemKey } = endpoints(), frame = sampleTransition(plan, 50);
    const session = createInteractionSession({ program: from, bindings: [{ type: 'keyboard', targets: [{ target: 'points', activation: { type: 'select', selection: 'picked' } }] }] });
    const player = createAnimationPlayer({ plan, clock: { now: () => 0, requestFrame() { throw Error('Paused player scheduled work'); }, cancelFrame() {} }, render() {} });
    try {
      assert.equal(getMarkItems(from, { target: 'points' })[0].key, itemKey);
      session.dispatch({ type: 'frame', frame, version: 1, generation: session.getState().generation });
      session.dispatch({ type: 'inspect', point: { x: middleX, y: 60 }, slop: 0 });
      assert.equal(session.getState().hit.target.itemKey, itemKey);
      session.dispatch({ type: 'focus', move: 'first' });
      close(session.getState().focus.screenPoint.x, middleX); close(session.getState().focus.screenPoint.y, 60);
      session.dispatch({ type: 'activate' });
      assert.equal(session.getState().history.undoCount, 1);
      assert.deepEqual(session.getState().program.semanticSpec.resources.find(resource => resource.id === 'picked').options.itemKeys, [itemKey]);
      session.dispatch({ type: 'undo' });
      assert.equal(session.getState().program, from);
      player.seek(50);
      for (let index = 0; index < 32; index++) {
        const captured = player.getFrame(), previous = player.finished;
        player.interrupt({ to: index % 2 ? from : to, options });
        assert.equal(player.getFrame(), captured); assert.equal((await previous).reason, 'interrupted');
        player.seek(30);
        assert.equal(player.getFrame().scene.nodes.length, 2);
        assert.equal(circle(player.getFrame()).type, 'circle');
      }
      const current = player.getFrame(), rebased = planTransition({ from: current, to, options });
      const restored = deserializeAnimation(serializeAnimation(rebased)).plan;
      assert.equal(sampleTransition(rebased, 0), current);
      for (const timeMs of [0, 25, 50, 100]) assert.deepEqual(sampleTransition(restored, timeMs), sampleTransition(rebased, timeMs));
      const before = player.getState(); assert.throws(() => player.interrupt({ to: structuredClone(current), options }), /ChartProgram/);
      assert.deepEqual(player.getState(), before); assert.equal(player.getFrame(), current);
    } finally { player.dispose(); session.destroy(); }
  } }
];
