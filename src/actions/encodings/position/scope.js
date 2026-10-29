// An aggregate already owns these final resource identities. Bind them to its
// exact native-constructor arguments without extending public options or state.
const scopes = new WeakMap();
export function withPositionScaleBindings(args, bindings, apply) {
  const previous = scopes.get(args);
  scopes.set(args, bindings);
  try { return apply(args); }
  finally {
    if (previous === undefined) scopes.delete(args);
    else scopes.set(args, previous);
  }
}
export function positionScaleBindings(args) { return scopes.get(args) ?? {}; }
