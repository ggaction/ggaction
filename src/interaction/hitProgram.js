import { ChartProgram } from "../core/ChartProgram.js";
import { freezeOwned, cloneAndFreeze, isOwned } from "../core/immutable.js";
import { canvasSceneSnapshot } from "../sceneSnapshot.js";
import { namespaceGraphicId } from "../selectors/graphicCapacity.js";
import { validateGraphicIdentity } from "../grammar/schemas/graphicIdentity.js";
import { MAX_HIT_INDEX_ITEMS, MAX_HIT_INDEX_WORK } from "../grammar/hitIndex.js";
import { hitShapeWork } from "../grammar/hitShapes.js";
import { prepareConcreteHitShape } from "./hitConcrete.js";

function requireProgram(program) {
  if (!(program instanceof ChartProgram) || !Object.isFrozen(program)) throw new TypeError("Hit preparation requires an immutable ChartProgram.");
  for (const key of ["graphicSpec", "semanticSpec", "materializationConfigs", "children", "compositionSpec", "actionStack"]) {
    const descriptor = Object.getOwnPropertyDescriptor(program, key);
    if (descriptor === undefined || !Object.hasOwn(descriptor, "value") ||
        !(key === "compositionSpec" && descriptor.value === undefined) && !isOwned(descriptor.value)) {
      throw new TypeError("Hit preparation requires immutable own program state.");
    }
  }
  if (program.actionStack.length !== 0) throw new Error("Hit preparation requires a closed action stack.");
}

function spend(budget, count = 1) {
  budget.work += count;
  if (budget.work > MAX_HIT_INDEX_WORK) throw new RangeError("Hit program exceeds its preparation work budget.");
}
function contexts(program, budget) {
  const result = new Map(), stack = [{ program, childPath: [], namespaces: [] }];
  while (stack.length) {
    const context = stack.pop();
    requireProgram(context.program);
    spend(budget);
    if (context.childPath.length > 1024) throw new RangeError("Hit program exceeds its composition work budget.");
    const qualify = id => {
      spend(budget, id.length + context.namespaces.reduce((size, namespace) => size + 6 * namespace.length + 2, 0));
      return context.namespaces.reduceRight((value, namespace) => namespaceGraphicId(namespace, value), id);
    };
    for (const [id, object] of Object.entries(context.program.graphicSpec.objects)) {
      spend(budget);
      result.set(qualify(id), context);
      for (const item of object.items ?? []) {
        spend(budget);
        result.set(qualify(item.id), context);
      }
    }
    const spec = context.program.compositionSpec;
    for (const id of spec?.children ?? []) stack.push({ program: context.program.children[id],
      childPath: [...context.childPath, id], namespaces: [...context.namespaces, `${spec.id}-${id}`] });
  }
  return result;
}
function metadata(identity, context, budget) {
  spend(budget, identity.key.length);
  validateGraphicIdentity(identity);
  const [namespaces, ownerId, role] = JSON.parse(identity.key);
  if (JSON.stringify(namespaces) !== JSON.stringify(context.namespaces)) throw new TypeError("Hit item namespace does not match its composition owner.");
  const lineage = identity.lineage, resource = lineage.kind === "resource" ? lineage.resource
    : { kind: "data", id: lineage.data, logicalId: lineage.logicalDataId, revision: lineage.revision };
  return cloneAndFreeze({ itemKey: identity.key, ownerId, role, childPath: context.childPath,
    rowKeys: lineage.kind === "resource" ? [] : lineage.rowKeys, resourceRefs: [resource] });
}

/** Bind existing concrete item identities to the exact scene; no rematerialization. */
export function prepareProgramHitFrame(program, version = 0) {
  requireProgram(program);
  if (!Number.isSafeInteger(version) || version < 0) throw new TypeError("Hit frame version must be a non-negative safe integer.");
  const budget = { work: 0 };
  let count = 0;
  for (const object of Object.values(program.graphicSpec.objects)) {
    count += object.items?.length ?? 1;
    if (count > MAX_HIT_INDEX_ITEMS) throw new RangeError("Hit program exceeds its item budget.");
  }
  const owners = contexts(program, budget);
  const snapshot = canvasSceneSnapshot(program);
  if (snapshot.scene.nodes.length > MAX_HIT_INDEX_ITEMS) throw new RangeError("Hit program exceeds its item budget.");
  const identities = new Map();
  for (const object of Object.values(program.graphicSpec.objects)) {
    for (const item of object.items ?? []) if (item.identity !== undefined) identities.set(item.id, item.identity);
  }
  const entries = [];
  for (let i = 0; i < snapshot.scene.nodes.length; i++) {
    const source = snapshot.sources[i], identity = identities.get(source.graphicId);
    if (identity === undefined) continue;
    const context = owners.get(source.graphicId);
    const itemMetadata = metadata(identity, context, budget);
    const shape = prepareConcreteHitShape(snapshot.scene.nodes[i], context.program.materializationConfigs.textMetrics);
    spend(budget, hitShapeWork(shape));
    entries.push(freezeOwned({ nodeKey: source.nodeKey, zIndex: i, metadata: itemMetadata, shape }));
  }
  return freezeOwned({ scene: snapshot.scene, entries: freezeOwned(entries), version });
}
