import assert from 'node:assert/strict';

// The browser cannot manufacture native pointer capture. Drive this sequence
// from Playwright and retain the browser's trusted-event/capture witnesses.
export async function runLifecycleCycle(page, index, ratio) {
  const input = await page.evaluate(args => nativeBenchmark.beginLifecycle(args.index, args.ratio), { index, ratio });
  await page.mouse.move(input.start.x, input.start.y);
  await page.mouse.down();
  await page.mouse.move(input.end.x, input.end.y, { steps: 4 });
  await page.evaluate(() => nativeBenchmark.inspectLifecycleGesture());
  if (!input.cancel) await page.mouse.up();
  const terminal = await page.evaluate(() => nativeBenchmark.lifecycleWorkAndDestroy());
  assert.equal(terminal.destroyed, true);
  if (input.cancel) await page.mouse.up();
  await page.mouse.move(input.end.x + 2, input.end.y + 2);
  const result = await page.evaluate(() => nativeBenchmark.finishLifecycle());
  assertLifecycleResult(result, input.cancel);
  return result;
}

export function assertLifecycleResult(result, cancelled) {
  assert.deepEqual(Object.keys(result).sort(), ['status','abortAcknowledgementMs','witness','resizeSizes','counters','harnessRetained'].sort());
  assert.equal(result.status, cancelled ? 'aborted' : 'completed');
  const required = ['listeners', 'workerListeners', 'workers', 'timers', 'captures', 'observers', 'assetLeases', 'bitmaps', 'callbacksAfterDestroy'];
  assert.deepEqual(Object.keys(result.counters).sort(), required.sort());
  for (const name of required) assert.equal(result.counters[name], 0, name);
  const retained = ['timeoutIds','intervalIds','frameIds','captureTargets','listenerTargets','trackedTargets','heldAssets','assetRequests','decodeRequests','probeReleases'];
  assert.deepEqual(Object.keys(result.harnessRetained).sort(), retained.sort());
  for (const name of retained) assert.equal(result.harnessRetained[name], 0, name);
  const w = result.witness;
  for (const value of Object.values(w)) assert.ok(Number.isSafeInteger(value) && value >= 0);
  for (const size of result.resizeSizes) { assert.deepEqual(Object.keys(size).sort(), ['height','width']); assert.ok(Number.isFinite(size.width) && Number.isFinite(size.height)); }
  for (const name of ['trustedDown', 'trustedMove', 'gotCapture', 'captureObserved', 'decoded', 'closed', 'leasesCreated', 'leasesDisposed', 'observerCallbacks', 'resizePolicies', 'workerPosts', 'renders', 'rafRequests']) assert.ok(w[name] > 0, name);
  assert.equal(w.decoded, w.closed); assert.equal(w.leasesCreated, w.leasesDisposed);
  assert.equal(w.gestureCommit, cancelled ? 0 : 1); assert.equal(w.gestureCancel, cancelled ? 1 : 0);
  if (cancelled) { assert.ok(w.lateAssetDeliveries > 0); assert.ok(Number.isFinite(result.abortAcknowledgementMs) && result.abortAcknowledgementMs >= 0); }
  else { assert.ok(w.trustedUp > 0); assert.ok(w.gesturePreview > 0); }
  assert.ok(result.resizeSizes.some(size => size.width === 400 && size.height === 400));
  assert.ok(result.resizeSizes.some(size => size.width === 420 && size.height === 380));
  assert.ok(!result.resizeSizes.some(size => size.width === 440 && size.height === 360));
}

export function lifecycleBalance(results) {
  assert.ok(results.length > 0 && results.length % 2 === 0, 'lifecycle must contain an equal complete/cancel pair');
  const completed = results.filter(result => result.status === 'completed').length;
  const cancelled = results.filter(result => result.status === 'aborted').length;
  assert.equal(completed, results.length / 2); assert.equal(cancelled, completed);
  return { completed, cancelled };
}

export function lifecycleAbortTiming(results, diagnostic = false) {
  const values = results.filter(result => result.status === 'aborted').map(result => result.abortAcknowledgementMs);
  assert.ok(values.length > 0, 'abort timing requires actual cancellation samples');
  assert.ok(values.every(value => Number.isFinite(value) && value >= 0), 'abort timing requires finite nonnegative samples');
  values.sort((a, b) => a - b);
  const p95 = values[Math.ceil(values.length * .95) - 1];
  return { abortAcknowledgementP95Ms: p95, abortThresholdMs: 100,
    abortStatus: diagnostic ? 'not-qualified-diagnostic' : p95 <= 100 ? 'passed-this-fixture' : 'failed-this-fixture' };
}
