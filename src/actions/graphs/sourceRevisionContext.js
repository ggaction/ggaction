import { actionSource } from "../../core/action.js";

// Dataset revisions supply the complete source replacement map to one exact
// graph action receiver. It is private execution context, never stored intent.
const revisions = new WeakMap();
export function withGraphSourceRevisions(program, replacements, operation) {
  const previous = revisions.get(program);
  revisions.set(program, replacements);
  try { return operation(); }
  finally { if (previous === undefined) revisions.delete(program); else revisions.set(program, previous); }
}
export function graphSourceRevisions(program) {
  return revisions.get(actionSource(program));
}
