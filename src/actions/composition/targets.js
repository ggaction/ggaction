import { normalizeActionTargets } from "../../grammar/actionTargets.js";

function atPath(program, path) {
  for (const id of path) {
    if (program.compositionSpec?.type === "facet") throw new Error("Facet cells follow their source; use editFacetSource for persistent edits.");
    if (!Object.hasOwn(program.children, id)) throw new Error(`Unknown target child "${id}".`);
    program = program.children[id];
  }
  return program;
}

function changePath(program, path, transform) {
  if (!path.length) return transform(program);
  const [id, ...rest] = path;
  return program._withCompositionState({ compositionSpec: program.compositionSpec,
    children: { ...program.children, [id]: changePath(program.children[id], rest, transform) } });
}

function refreshAncestors(original, revised) {
  if (!revised.compositionSpec || original === revised) return revised;
  let children = revised.children;
  const changed = [];
  for (const [id, child] of Object.entries(children)) {
    if (child === original.children[id]) continue;
    children = { ...children, [id]: original.children[id] ? refreshAncestors(original.children[id], child) : child };
    changed.push(id);
  }
  if (!changed.length) return revised;
  let next = revised._withCompositionState({ compositionSpec: revised.compositionSpec, children });
  for (const id of changed) next = next.useProgram({ id });
  return next.materializeComposition();
}

// Explicit public dispatch only. Edits run on immutable candidates, then shared
// domains and all changed ancestor snapshots are materialized once from the
// complete final state. This avoids intermediate mixed-palette/domain failures.
export function dispatchActionTargets(program, wrappedAction, args) {
  const targets = normalizeActionTargets(args.target);
  for (const target of targets) {
    const selected = atPath(program, target.childPath);
    if (selected.compositionSpec?.type === "facet" && target.id !== undefined) {
      throw new Error("Target a facet source through editFacetSource, or identify an explicit childPath.");
    }
  }
  const { target: _target, ...options } = args;
  let next = program;
  for (const target of targets) next = changePath(next, target.childPath, selected =>
    wrappedAction.call(selected, { ...options, ...(target.id === undefined ? {} : { target: target.id }) }));
  return refreshAncestors(program, next);
}
