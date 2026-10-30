// One private weak association for prepared frame metrics, source identity and
// placements. Readers do not import the native graphic/guide preparation graph.
const sources = new WeakMap();
export function registerHitFrameSource(frame, source) { sources.set(frame, source); }
export function hitFrameSource(frame) { return sources.get(frame); }
export function frameGeographicSource(frame, program, key) {
  const source = sources.get(frame);
  return source?.nativeOwners?.has(program) ? source.geographicSources.get(key) : undefined;
}
