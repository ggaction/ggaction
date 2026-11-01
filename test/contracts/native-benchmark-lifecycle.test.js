import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLifecycleResult, lifecycleBalance } from '../../scripts/benchmarks/lifecycle.js';

function observed(cancelled = false) {
  return { status: cancelled ? 'aborted' : 'completed', abortAcknowledgementMs: cancelled ? 1.2 : null,
    counters: { workers:0, workerListeners:0, listeners:0, timers:0, captures:0, observers:0, assetLeases:0, bitmaps:0, callbacksAfterDestroy:0 },
    harnessRetained: {timeoutIds:0,intervalIds:0,frameIds:0,captureTargets:0,listenerTargets:0,trackedTargets:0,heldAssets:0,assetRequests:0,decodeRequests:0,probeReleases:0},
    witness: {trustedDown:1,trustedMove:4,trustedUp:cancelled?0:1,gotCapture:1,captureObserved:1,
      decoded:3,closed:3,leasesCreated:3,leasesDisposed:3,observerCallbacks:2,resizePolicies:1,workerPosts:1,renders:2,rafRequests:1,
      gesturePreview:cancelled?0:1,gestureCommit:cancelled?0:1,gestureCancel:cancelled?1:0,lateAssetDeliveries:cancelled?2:0},
    resizeSizes:[{width:400,height:400},{width:420,height:380}] };
}
test('combined lifecycle verdict requires actual input, decode, observer and worker witnesses beyond zero counters', () => {
  for (const cancelled of [false,true]) {
    assertLifecycleResult(observed(cancelled),cancelled);
    for (const name of ['trustedDown','trustedMove','gotCapture','captureObserved','decoded','closed','leasesCreated','leasesDisposed','observerCallbacks','resizePolicies','workerPosts','renders','rafRequests']) {
      const missing=observed(cancelled);missing.witness[name]=0;assert.throws(()=>assertLifecycleResult(missing,cancelled));
    }
  }
  const late=observed(true);late.witness.lateAssetDeliveries=0;assert.throws(()=>assertLifecycleResult(late,true));
});
test('combined lifecycle verdict rejects leaks, post-destroy callbacks, duplicate commits and missing counters', () => {
  for (const name of Object.keys(observed().counters)) {
    const leaked=observed();leaked.counters[name]=1;assert.throws(()=>assertLifecycleResult(leaked,false));
    const missing=observed();delete missing.counters[name];assert.throws(()=>assertLifecycleResult(missing,false));
  }
  for (const name of Object.keys(observed().harnessRetained)) {
    const retained=observed();retained.harnessRetained[name]=1;assert.throws(()=>assertLifecycleResult(retained,false));
  }
  const escaped=observed();escaped.session={};assert.throws(()=>assertLifecycleResult(escaped,false));
  const terminal=observed(true);terminal.witness.gestureCommit=1;assert.throws(()=>assertLifecycleResult(terminal,true));
  const bitmap=observed();bitmap.witness.closed--;assert.throws(()=>assertLifecycleResult(bitmap,false));
  const resize=observed();resize.resizeSizes.push({width:440,height:360});assert.throws(()=>assertLifecycleResult(resize,false));
});
test('lifecycle denominator preserves equal completion and cancellation at diagnostic and qualification sizes', () => {
  for (const count of [4,100]) assert.deepEqual(lifecycleBalance(Array.from({length:count},(_,i)=>observed(i%2===1))),{completed:count/2,cancelled:count/2});
  for(const results of [[],[observed()],[observed(),observed()],[observed(true),observed(true)]]) assert.throws(()=>lifecycleBalance(results));
});
