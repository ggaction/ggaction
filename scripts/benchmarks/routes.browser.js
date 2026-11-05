import { chart, render, prepareImageRendering } from 'ggaction';
import { renderToSVG } from 'ggaction/svg';
import { createGraphRouteExecutor, prepareGraphEdgeRoutes } from 'ggaction/graph';
import { createInteractionSession } from 'ggaction/interaction';
const workerText = await (await fetch('./worker.js')).text();
const workerUrl = URL.createObjectURL(new Blob([workerText], { type: 'text/javascript' }));
const counters = { workers: 0, workerListeners: 0, listeners: 0, timers: 0, captures: 0, callbacksAfterDestroy: 0, observers: 0, assetLeases: 0, bitmaps: 0 };
const pendingTimers = new Set(), pendingIntervals = new Set(), pendingFrames = new Set(), captures = new Map();
const timeout = window.setTimeout.bind(window), clearTimeout = window.clearTimeout.bind(window);
const interval = window.setInterval.bind(window), clearInterval = window.clearInterval.bind(window);
const countTimers = () => { counters.timers = pendingTimers.size + pendingIntervals.size + pendingFrames.size; };
const recordLateCallback = cycle => { if (cycle?.destroyed) counters.callbacksAfterDestroy++; };
window.setTimeout = (callback, delay, ...args) => {
  const cycle = activeCycle;
  const id = timeout(() => { pendingTimers.delete(id); countTimers(); recordLateCallback(cycle); callback(...args); }, delay);
  pendingTimers.add(id); countTimers(); return id;
};
window.clearTimeout = id => { pendingTimers.delete(id); pendingIntervals.delete(id); countTimers(); clearTimeout(id); };
window.setInterval = (callback, delay, ...args) => {
  const cycle = activeCycle;
  const id = interval(() => { recordLateCallback(cycle); callback(...args); }, delay);
  pendingIntervals.add(id); countTimers(); return id;
};
window.clearInterval = id => { pendingTimers.delete(id); pendingIntervals.delete(id); countTimers(); clearInterval(id); };
const raf = window.requestAnimationFrame.bind(window), cancelRaf = window.cancelAnimationFrame.bind(window);
window.requestAnimationFrame = callback => {
  const cycle = activeCycle; if (cycle) cycle.witness.rafRequests++;
  const id = raf(time => { pendingFrames.delete(id); countTimers(); recordLateCallback(cycle); callback(time); });
  pendingFrames.add(id); countTimers(); return id;
};
window.cancelAnimationFrame = id => { pendingFrames.delete(id); countTimers(); cancelRaf(id); };
const setCapture = Element.prototype.setPointerCapture, releaseCapture = Element.prototype.releasePointerCapture;
Element.prototype.setPointerCapture = function(id) { setCapture.call(this, id); if (!captures.has(this)) captures.set(this, new Set()); captures.get(this).add(id); counters.captures = [...captures.values()].reduce((sum, set) => sum + set.size, 0); };
Element.prototype.releasePointerCapture = function(id) { releaseCapture.call(this, id); const set = captures.get(this); set?.delete(id); if (set?.size === 0) captures.delete(this); counters.captures = [...captures.values()].reduce((sum, value) => sum + value.size, 0); };
function executor(metrics, posted) {
  return createGraphRouteExecutor({ createWorker() {
    const worker = new Worker(workerUrl, { type: 'module' }), listeners = new Map(), cycle = activeCycle;
    counters.workers++; let terminated = false;
    return {
      postMessage(value) { worker.postMessage(value); posted?.(); },
      addEventListener(type, listener) {
        const adapted = type === 'message' ? event => {
          recordLateCallback(cycle);
          const envelope = event.data; metrics.computeMs = envelope.computeMs;
          if (envelope.failure) {
            const error = new Error(envelope.failure.message); error.name = envelope.failure.name;
            for (const entry of listeners.values()) if (entry.type === 'error') entry.listener({ error });
          } else listener({ data: envelope.result });
        } : listener;
        listeners.set(listener, { type, adapted, listener }); counters.workerListeners++;
        worker.addEventListener(type, adapted);
      },
      removeEventListener(type, listener) { const entry = listeners.get(listener); if (entry) { worker.removeEventListener(type, entry.adapted); listeners.delete(listener); counters.workerListeners--; } },
      terminate() { if (!terminated) { terminated = true; worker.terminate(); counters.workers--; } }
    };
  } });
}
function fixture(edgeCount, method) {
  const count = method === 'hierarchical' ? Math.min(edgeCount, 9999) : edgeCount;
  const nodes = Array.from({ length: count }, (_, id) => ({ id }));
  const edges = Array.from({ length: edgeCount }, (_, id) => ({ id, source: id % count, target: (id + Math.floor(count / 3)) % count }));
  let p = chart().createCanvas({ width: 400, height: 400, margin: 0, background: 'white' }), positions, options;
  if (method === 'hierarchical') {
    p = p.createData({ id: 'tree', values: [{ key: 'root', parent: null, value: 0 }, ...nodes.map(({ id }) => ({ key: id, parent: 'root', value: 1 }))] })
      .createHierarchyData({ id: 'hierarchy', data: 'tree', key: 'key', parent: 'parent', value: 'value' })
      .layoutHierarchy({ id: 'tree-layout', method: 'tree', options: { nodeSize: [1, 1], siblingGap: 1, depthGap: 100, orientation: 'vertical' } });
    const hierarchy = p.semanticSpec.resources.find(r => r.kind === 'hierarchy');
    const anchors = new Map(p.semanticSpec.resources.find(r => r.kind === 'layout').result.nodes.map(node => [node.key, node]));
    positions = hierarchy.result.nodes.filter(node => node.depth === 1).map(node => ({ key: nodes[node.sourceRows[0] - 1].id, x: anchors.get(node.key).x, y: anchors.get(node.key).y }));
    options = { hierarchy: 'hierarchy', hierarchyLayout: 'tree-layout', mapping: nodes.map(({ id }) => ({ nodeKey: id, hierarchyKey: id })) };
  } else positions = nodes.map(({ id }) => ({ key: id, x: 200 + 150 * Math.cos(2 * Math.PI * id / count), y: 200 + 150 * Math.sin(2 * Math.PI * id / count) }));
  p = p.createData({ id: 'nodes', values: nodes, keyField: 'id' }).createData({ id: 'edges', values: edges, keyField: 'id' })
    .createGraphData({ id: 'graph', nodes: 'nodes', edges: 'edges', nodeKey: 'id', edgeKey: 'id', source: 'source', target: 'target' })
    .layoutGraph({ id: 'layout', method: 'fixed', options: { positions } });
  return { program: p, request: { kind: 'create', id: 'routes', graph: 'graph', layout: 'layout', method, ...(options ? { options } : {}) }, nodes: count };
}
const percentile = values => values.slice().sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];
async function iteration(input, ratio) {
  const metrics = {}, e = executor(metrics), started = performance.now();
  try {
    const prepared = await prepareGraphEdgeRoutes(input.program, input.request, { requestToken: 'benchmark', executor: e });
    metrics.prepareComputeValidateMs = performance.now() - started;
    let now = performance.now();
    const routed = input.program.bundleGraphEdges({ prepared, requestToken: 'benchmark' });
    metrics.applyMs = performance.now() - now;
    metrics.bundlingMs = metrics.prepareComputeValidateMs + metrics.applyMs;
    now = performance.now();
    const plotted = routed.createGraphPlot({ id: 'network', layout: 'layout', routes: 'routes', nodes: { radius: 2 }, edges: { arrows: false, stroke: '#2563eb' },
      // The plot admits node bodies and labels plus edge bodies and arrows; above 10k it states that capacity explicitly.
      ...(2 * (input.nodes + input.requestedEdges) > 10_000 ? { maxItems: 2 * (input.nodes + input.requestedEdges) } : {}) });
    metrics.materializeMs = performance.now() - now;
    const canvas = document.querySelector('canvas'); now = performance.now();
    render(plotted, canvas.getContext('2d'), { pixelRatio: ratio }); metrics.canvasRenderMs = performance.now() - now;
    now = performance.now(); document.querySelector('#svg').innerHTML = renderToSVG(plotted); metrics.svgSerializeDomMs = performance.now() - now;
    const result = routed.semanticSpec.resources.find(r => r.kind === 'edge-route').result;
    if (result.routes.length !== input.requestedEdges) throw new Error('Route membership changed');
    return { status: 'complete', metrics, diagnostics: result.diagnostics, routeCount: result.routes.length };
  } catch (error) { return { status: 'error', elapsedMs: performance.now() - started, metrics, name: error.name, message: error.message }; }
  finally { e.dispose(); document.querySelector('#svg').replaceChildren(); }
}
async function benchmarkCase(edgeCount, method, ratio, measured = 30, warmups = 5) {
  const start = performance.now(), input = fixture(edgeCount, method); input.requestedEdges = edgeCount;
  const sourcePreparationMs = performance.now() - start, first = await iteration(input, ratio);
  console.log('ROUTE_PROGRESS '+JSON.stringify({ratio,phase:'first',status:first.status,metrics:first.metrics}));
  if (first.status !== 'complete' && !/Route (?:work|candidate pairs|active samples) must not exceed/.test(first.message)) throw new Error(JSON.stringify(first));
  if (first.status !== 'complete') return { edgeCount, nodes: input.nodes, method, ratio, status: 'explicit-error', sourcePreparationMs, first, warmups: 0, measured: 0, successSLO: 'not-measured', counters: { ...counters } };
  for (let i = 0; i < warmups; i++) { const result = await iteration(input, ratio); if (result.status !== 'complete') throw new Error(JSON.stringify(result)); console.log('ROUTE_PROGRESS '+JSON.stringify({ratio,phase:'warmup',iteration:i+1})); }
  const samples = [];
  for (let i = 0; i < measured; i++) { const result = await iteration(input, ratio); if (result.status !== 'complete') throw new Error(JSON.stringify(result)); samples.push(result.metrics); if ((i+1)%5===0) console.log('ROUTE_PROGRESS '+JSON.stringify({ratio,phase:'measure',iteration:i+1})); }
  const p95 = Object.fromEntries(Object.keys(samples[0]).map(key => [key, percentile(samples.map(value => value[key]))]));
  const thresholdMs = edgeCount === 100 ? 500 : edgeCount === 1000 ? 5000 : 30000;
  return { edgeCount, nodes: input.nodes, method, ratio, status: 'measured', sourcePreparationMs, warmups, measured, samples, p95, thresholdMs, successSLO: p95.bundlingMs <= thresholdMs ? 'passed-this-fixture' : 'failed-this-fixture', diagnostics: first.diagnostics, counters: { ...counters } };
}
// Combined lifecycle measurements are driven by trusted Playwright input. No
// synthetic PointerEvent is used to manufacture native capture success.
let lifecycleBase, lifecycleOriginal, activeCycle;
const nativeAdd = EventTarget.prototype.addEventListener, nativeRemove = EventTarget.prototype.removeEventListener;
const trackedTargets = new Set(), listenerRecords = new Map();
EventTarget.prototype.addEventListener = function(type, listener, options) {
  nativeAdd.call(this, type, listener, options);
  if (!listener || (!trackedTargets.has(this) && !(activeCycle && this instanceof AbortSignal))) return;
  const capture = typeof options === 'boolean' ? options : options?.capture === true;
  const records = listenerRecords.get(this) ?? [];
  if (!records.some(r => r.type === type && r.listener === listener && r.capture === capture)) {
    records.push({ type, listener, capture }); listenerRecords.set(this, records); counters.listeners++;
  }
};
EventTarget.prototype.removeEventListener = function(type, listener, options) {
  nativeRemove.call(this, type, listener, options);
  const capture = typeof options === 'boolean' ? options : options?.capture === true, records = listenerRecords.get(this);
  const index = records?.findIndex(r => r.type === type && r.listener === listener && r.capture === capture) ?? -1;
  if (index >= 0) { records.splice(index, 1); counters.listeners--; if (!records.length) listenerRecords.delete(this); }
};
const NativeResizeObserver = window.ResizeObserver;
window.ResizeObserver = class {
  constructor(callback) {
    this.live = false; const cycle = activeCycle;
    this.native = new NativeResizeObserver(entries => {
      if (cycle) { cycle.witness.observerCallbacks++; recordLateCallback(cycle); }
      callback(entries);
    });
  }
  observe(...args) { this.native.observe(...args); if (!this.live) { this.live = true; counters.observers++; } }
  unobserve(...args) { this.native.unobserve(...args); }
  disconnect() { this.native.disconnect(); if (this.live) { this.live = false; counters.observers--; } }
};
const check = (value, message) => { if (!value) throw new Error(`Lifecycle assertion: ${message}`); };
const hostTurn = () => new Promise(resolve => raf(() => raf(resolve)));
async function until(predicate, label) {
  const start = performance.now();
  while (!predicate()) {
    if (performance.now() - start > 10000) throw new Error(`Lifecycle timeout: ${label}`);
    await new Promise(resolve => timeout(resolve, 5));
  }
}
async function resetLifecycle() {
  lifecycleBase = fixture(20, 'edge-path');
  let p = lifecycleBase.program.createGraphPlot({ id: 'network', layout: 'layout', origin: [0, 0], nodes: { radius: 6 }, edges: { arrows: false } });
  const image = document.createElement('canvas'); image.width = image.height = 2;
  const context = image.getContext('2d'); context.fillStyle = '#008000'; context.fillRect(0, 0, 2, 2);
  const encoded = image.toDataURL('image/png').split(',')[1], bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const contentHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');
  const payload = { contentHash, mimeType: 'image/png', byteLength: bytes.length, width: 2, height: 2, payload: { encoding: 'base64', data: encoded } };
  p = p.createGraphics({ id: 'lifecycle-image', type: 'image', parent: 'plot-main' });
  for (const [property, value] of Object.entries({ image: payload, x: 10, y: 10, width: 20, height: 20 })) p = p.editGraphics({ target: 'lifecycle-image', property, value });
  lifecycleBase.program = p; lifecycleOriginal = JSON.stringify(p);
  return { imageHash: contentHash, imageBytes: bytes.length, nodes: 20, edges: 20 };
}
async function beginLifecycle(index, ratio) {
  check(!activeCycle, 'previous cycle was not released');
  check(Object.values(counters).every(x => x === 0), 'initial counters are not zero');
  const host = document.createElement('div'), canvas = document.createElement('canvas');
  host.style.cssText = 'position:fixed;left:20px;top:20px;width:400px;height:400px;z-index:1000;touch-action:none';
  canvas.setAttribute('aria-label', 'Combined lifecycle graph and decoded image'); host.append(canvas); document.body.append(host);
  const cycle = activeCycle = { host, canvas, ratio, cancel: index % 2 === 1, destroyed: false, holdAssets: false,
    held: [], assetTasks: new Set(), decodeTasks: new Set(), releases: [], errors: [], resizeSizes: [], witness: {
      trustedDown: 0, trustedMove: 0, trustedUp: 0, gotCapture: 0, captureObserved: 0,
      observerCallbacks: 0, resizePolicies: 0, decoded: 0, closed: 0, leasesCreated: 0, leasesDisposed: 0,
      lateAssetDeliveries: 0, rafRequests: 0, gesturePreview: 0, gestureCommit: 0, gestureCancel: 0, workerPosts: 0, renders: 0
    } };
  for (const target of [host, window, document]) trackedTargets.add(target);
  const probe = (type, handler) => { host.addEventListener(type, handler); cycle.releases.push(() => host.removeEventListener(type, handler)); };
  probe('pointerdown', event => { if (event.isTrusted) cycle.witness.trustedDown++; cycle.pointerId = event.pointerId; });
  probe('pointermove', event => { if (event.isTrusted && event.buttons) cycle.witness.trustedMove++; });
  probe('pointerup', event => { if (event.isTrusted) cycle.witness.trustedUp++; });
  probe('gotpointercapture', event => { if (event.isTrusted) cycle.witness.gotCapture++; });
  probe('lostpointercapture', event => {
    const set = captures.get(host); set?.delete(event.pointerId); if (set?.size === 0) captures.delete(host);
    counters.captures = [...captures.values()].reduce((n, value) => n + value.size, 0);
  });
  const prepareAssets = async ({ program, frame, signal }) => {
    const bitmaps = [], close = () => {
      for (const bitmap of bitmaps.splice(0)) { bitmap.close(); check(bitmap.width === 0 && bitmap.height === 0, 'ImageBitmap did not close'); counters.bitmaps--; cycle.witness.closed++; }
    };
    try {
      const images = await prepareImageRendering(frame ?? program, { signal, decode({ bytes, mimeType }) {
        const task = (async () => {
          const bitmap = await createImageBitmap(new Blob([bytes], { type: mimeType }));
          counters.bitmaps++; cycle.witness.decoded++; bitmaps.push(bitmap);
          check(bitmap.width === 2 && bitmap.height === 2, 'decoded PNG dimensions changed');
          // createImageBitmap itself cannot be aborted. The host owns a result
          // that arrives after cancellation, even if the public stage rejected early.
          if (signal.aborted) { close(); throw new DOMException('Late bitmap decode cancelled', 'AbortError'); }
          return { image: bitmap, width: bitmap.width, height: bitmap.height, originClean: true };
        })();
        cycle.decodeTasks.add(task); task.then(() => cycle.decodeTasks.delete(task), () => cycle.decodeTasks.delete(task));
        return task;
      } });
      check(images.imageCount === 1, 'asset preparation must decode an actual image');
      let disposed = false; counters.assetLeases++; cycle.witness.leasesCreated++;
      const lease = { images, dispose() { if (!disposed) { disposed = true; counters.assetLeases--; cycle.witness.leasesDisposed++; close(); } } };
      // Delay delivery only after real bytes have decoded and a real prepared
      // handle exists. Returning it after abort tests the session's stale lease disposal.
      if (cycle.holdAssets) await new Promise(resolve => cycle.held.push(resolve));
      if (cycle.destroyed) cycle.witness.lateAssetDeliveries++;
      return lease;
    } catch (error) { close(); throw error; }
  };
  const session = cycle.session = createInteractionSession({ program: lifecycleBase.program,
    bindings: [{ type: 'moveNode', target: 'network' }], assetResolver(request) {
      const pending = prepareAssets(request); cycle.assetTasks.add(pending);
      pending.then(() => cycle.assetTasks.delete(pending), () => cycle.assetTasks.delete(pending)); return pending;
    } });
  cycle.unsubscribe = session.subscribe(event => {
    if (cycle.destroyed) { counters.callbacksAfterDestroy++; return; }
    if (event.type === 'moveNode' && event.phase) {
      if (event.phase === 'commit') cycle.witness.gestureCommit++;
      if (event.phase === 'cancel') cycle.witness.gestureCancel++;
      if (event.phase === 'preview') cycle.witness.gesturePreview++;
      if (event.phase === 'error') cycle.errors.push(event.diagnostics);
    }
    if (event.type === 'resize') {
      cycle.resizeSizes.push(event.size);
      const { width, height } = event.size;
      if (width !== 400 || height !== 400) {
        cycle.witness.resizePolicies++;
        session.updateProgram(request => Promise.resolve(request.program.editCanvas({ width, height })));
      }
    }
    if (event.type === 'assets' && event.status === 'error') cycle.errors.push(event.diagnostics);
    const state = session.getState(), picture = state.previewProgram ?? state.program, assets = state.previewProgram ? state.previewAssets : state.assets;
    if (assets) {
      render(picture, canvas.getContext('2d'), { ...assets, pixelRatio: ratio }); cycle.witness.renders++;
      const rgba = canvas.getContext('2d').getImageData(15 * ratio, 15 * ratio, 1, 1).data;
      check(rgba[0] === 0 && rgba[1] === 128 && rgba[2] === 0 && rgba[3] === 255, 'decoded image did not render');
    }
  });
  session.mount(host, { observeResize: true }); await session.whenSettled();
  await until(() => cycle.resizeSizes.length > 0, 'initial native ResizeObserver delivery');
  check(cycle.witness.decoded === 1, 'initial asset decode missing');
  cycle.holdAssets = cycle.cancel;
  const circle = session.getState().scene.nodes.find(node => node.type === 'circle');
  check(circle, 'native graph node missing'); const rect = host.getBoundingClientRect();
  return { start: { x: rect.left + circle.properties.x, y: rect.top + circle.properties.y },
    end: { x: rect.left + circle.properties.x - 25, y: rect.top + circle.properties.y + 20 }, cancel: cycle.cancel };
}
async function inspectLifecycleGesture() {
  const cycle = activeCycle;
  await until(() => cycle.witness.decoded >= 2 && (cycle.cancel ? cycle.held.length > 0 : cycle.witness.gesturePreview > 0), 'real gesture asset preparation');
  check(cycle.host.hasPointerCapture(cycle.pointerId), 'native pointer capture was not acquired');
  check(cycle.witness.gotCapture > 0 && cycle.witness.trustedDown > 0 && cycle.witness.trustedMove > 0, 'trusted input/capture witness missing');
  cycle.witness.captureObserved++;
  return { captured: true };
}
async function lifecycleWorkAndDestroy() {
  const cycle = activeCycle, { session } = cycle;
  if (!cycle.cancel) { await session.whenSettled(); check(cycle.witness.gestureCommit === 1, 'complete drag must commit once'); }
  const controller = new AbortController(), metrics = {}; let abortStart;
  const e = executor(metrics, () => {
    cycle.witness.workerPosts++;
    if (cycle.cancel) { abortStart = performance.now(); controller.abort(); }
  });
  let status, abortAcknowledgementMs = null;
  const work = prepareGraphEdgeRoutes(session.getState().program, lifecycleBase.request,
    { requestToken: 'lifecycle', executor: e, signal: controller.signal }).then(prepared => {
      // Worker completion has its exact immutable receiver, independently of the
      // concurrent host resize. Never apply this stale route to the resized view.
      const routed = cycle.workerBase.bundleGraphEdges({ prepared, requestToken: 'lifecycle' });
      check(routed.semanticSpec.resources.find(r => r.kind === 'edge-route').result.routes.length === 20, 'worker result lost routes');
      status = 'completed';
    }, error => { if (error.name !== 'AbortError') throw error; status = 'aborted'; abortAcknowledgementMs = performance.now() - abortStart; });
  cycle.workerBase = session.getState().program;
  await until(() => cycle.witness.workerPosts === 1, 'real worker post');
  cycle.host.style.width = '420px'; cycle.host.style.height = '380px';
  await until(() => cycle.resizeSizes.some(size => size.width === 420 && size.height === 380), 'native resize callback');
  if (cycle.cancel) await until(() => cycle.held.length >= 2, 'pending resize image lease');
  else { await session.whenSettled(); check(session.getState().program.graphicSpec.objects.canvas.properties.width === 420, 'native resize candidate was not committed'); }
  await work;
  session.destroy(); cycle.destroyed = true; e.dispose(); cycle.unsubscribe();
  cycle.status = status; cycle.abortAcknowledgementMs = abortAcknowledgementMs;
  for (const release of cycle.releases.splice(0)) release();
  const pending = [...cycle.assetTasks]; for (const release of cycle.held.splice(0)) release();
  await Promise.allSettled([...pending, ...cycle.decodeTasks]); await hostTurn();
  cycle.host.style.width = '440px'; cycle.host.style.height = '360px';
  // Keep the detached session's host alive for the real late pointerup/move and
  // a native resize opportunity. No synthetic event substitutes for that probe.
  return { status, destroyed: session.getState().destroyed };
}
async function finishLifecycle() {
  const cycle = activeCycle; await hostTurn();
  check(cycle.destroyed, 'cycle was not destroyed');
  check(cycle.witness.gestureCommit === (cycle.cancel ? 0 : 1) && cycle.witness.gestureCancel === (cycle.cancel ? 1 : 0), 'gesture terminal count changed');
  check(cycle.witness.decoded === cycle.witness.closed, `decoded bitmap was retained ${JSON.stringify(cycle.witness)}`);
  check(cycle.witness.leasesCreated === cycle.witness.leasesDisposed, 'asset lease was retained');
  check(!cycle.host.hasPointerCapture(cycle.pointerId), 'native capture remains after teardown');
  check(!cycle.errors.length, JSON.stringify(cycle.errors));
  check(JSON.stringify(lifecycleBase.program) === lifecycleOriginal, 'immutable source changed');
  check(Object.values(counters).every(x => x === 0), JSON.stringify(counters));
  cycle.host.remove(); for (const target of [cycle.host, window, document]) trackedTargets.delete(target);
  const harnessRetained = { timeoutIds: pendingTimers.size, intervalIds: pendingIntervals.size, frameIds: pendingFrames.size,
    captureTargets: captures.size, listenerTargets: listenerRecords.size, trackedTargets: trackedTargets.size,
    heldAssets: cycle.held.length, assetRequests: cycle.assetTasks.size, decodeRequests: cycle.decodeTasks.size,
    probeReleases: cycle.releases.length };
  check(Object.values(harnessRetained).every(value => value === 0), JSON.stringify(harnessRetained));
  // Only scalar witness data crosses to Playwright; sessions, programs, hosts,
  // observers, prepared handles and bitmaps are not retained in the result log.
  const result = { status: cycle.status, abortAcknowledgementMs: cycle.abortAcknowledgementMs,
    witness: { ...cycle.witness }, resizeSizes: cycle.resizeSizes.map(({width,height}) => ({width,height})),
    counters: { ...counters }, harnessRetained };
  activeCycle = null; return result;
}
function lifecycleSnapshot() { return { witness: activeCycle?.witness, status: activeCycle?.status, errors: activeCycle?.errors, counters: { ...counters } }; }
globalThis.nativeBenchmark = { lifecycleSnapshot, benchmarkCase, resetLifecycle, beginLifecycle, inspectLifecycleGesture, lifecycleWorkAndDestroy, finishLifecycle, counters };
document.querySelector('#status').textContent = 'Ready';
