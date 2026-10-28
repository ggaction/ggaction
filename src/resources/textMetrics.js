import { actionSource } from "../core/action.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { assertAssetActive, assetError } from "../core/assetHost.js";

const preparedMetrics = new WeakMap();

export function preparedTextMetricHandle(base, profile, host) {
  const handle = cloneAndFreeze({ kind: "text-metrics", request: { id: profile.id, fonts: profile.fonts.map(binding => binding.resource.id) } });
  preparedMetrics.set(handle, { base, profile, requestToken: host.requestToken, signal: host.signal });
  return handle;
}

export function readPreparedTextMetrics(program, handle, requestToken) {
  const prepared = preparedMetrics.get(handle);
  if (prepared === undefined) throw new TypeError("Expected authentic prepared text metrics.");
  if (prepared.base !== actionSource(program) || prepared.requestToken !== requestToken) {
    throw assetError("stale-result", "Prepared text metrics belong to a different receiver or token.", undefined, "Font");
  }
  assertAssetActive(prepared.signal, "Font");
  return prepared.profile;
}
