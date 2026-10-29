import { getWrappedActionMetadata } from "../../core/action.js";
import { restoreProgramContextKeys } from "../../core/programState.js";
import { normalizeActionTargets } from "../../grammar/actionTargets.js";
import { compositionLegends } from "../../materialization/compositionLegends.js";
import { legendBlockChannels } from "../../grammar/legendBlocks.js";
import { assertGuideCollisionBlocks } from "../../layout/guideCollisions.js";
import { resolveGuideCollisionBlocks } from "../../materialization/guides/resources.js";

function collectedLegends(program, path = [], result = new Map()) {
  if (!program.compositionSpec || program.compositionSpec.facet) return result;
  const legends = compositionLegends(program, program.children);
  for (const legend of legends) for (const target of legend.targets) {
    const child = atPath(program, target.childPath), key = JSON.stringify([...path, ...target.childPath]);
    const kinds = result.get(key) ?? new Set();
    for (const [kind, config] of Object.entries(child.guideConfigs.legend ?? {})) {
      if ((target.id === undefined || config.target === target.id) && legendBlockChannels(kind, config).some(channel => legend.channels.includes(channel))) kinds.add(kind);
    }
    result.set(key, kinds);
  }
  for (const [id, child] of Object.entries(program.children)) collectedLegends(child, [...path,id], result);
  return result;
}

function visibleGuideConfigs(program, hidden) {
  return { ...program.guideConfigs, legend: Object.fromEntries(Object.entries(program.guideConfigs.legend ?? {})
    .filter(([kind]) => !hidden?.has(kind))) };
}

// Internal planning frame: callers still replay one public scoped action on
// the composition. The collected copies are not visible in this local frame.
export function compositionTargetProgram(program, path) {
  const selected = atPath(program, path), hidden = collectedLegends(program).get(JSON.stringify(path));
  return hidden ? selected._withContext({ compositionCollectedLegends: [...hidden] }) : selected;
}

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
  if (getWrappedActionMetadata(wrappedAction).op === "applyTextMetrics" && Object.hasOwn(args, "prepared")) {
    throw new TypeError("Prepared text metrics cannot use a scoped target; apply them to their exact receiver.");
  }
  const targets = normalizeActionTargets(args.target);
  for (const target of targets) {
    const selected = atPath(program, target.childPath);
    if (target.facetSource && selected.compositionSpec?.type !== "facet") throw new Error("facetSource requires a facet view.");
    if (selected.compositionSpec?.type === "facet" && target.id !== undefined && !target.facetSource) {
      throw new Error("Target a facet source through editFacetSource, or identify an explicit childPath.");
    }
  }
  const { target: _target, ...options } = args;
  const collected = collectedLegends(program);
  let next = program;
  for (const target of targets) next = changePath(next, target.childPath, selected => {
    const hidden = collected.get(JSON.stringify(target.childPath));
    const candidate = hidden ? selected._withContext({ compositionCollectedLegends: [...hidden] }) : selected;
    const nativeOptions = { ...options, ...(target.id === undefined ? {} : { target: target.id }) };
    const result = target.facetSource
      ? candidate.editFacetSource({ action: { method: getWrappedActionMetadata(wrappedAction).op, options: nativeOptions } })
      : wrappedAction.call(candidate, nativeOptions);
    if (!hidden) return result;
    return restoreProgramContextKeys(result, selected, ["compositionCollectedLegends"]);
  });
  const revised = refreshAncestors(program, next);
  // The parent layout checks the collected graphic against retained content.
  // Releasing sharing must also validate the newly visible local guides.
  if (collected.size) {
    const remaining = collectedLegends(revised);
    for (const key of collected.keys()) {
      const child = JSON.parse(key).reduce((node,id)=>node?.children?.[id],revised);
      if (!child) continue;
      assertGuideCollisionBlocks(resolveGuideCollisionBlocks(child.graphicSpec,
        visibleGuideConfigs(child, remaining.get(key)), child.titleConfig, child.materializationConfigs.textMetrics));
    }
  }
  return revised;
}
