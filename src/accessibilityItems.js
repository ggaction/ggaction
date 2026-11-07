import { validateGeneratedItemLimit, validateWorkLimit } from "./core/validation.js";
import { namespaceItemKey } from "./grammar/schemas/graphicIdentity.js";
import { findLayer } from "./selectors/layers.js";
import { ownedChildren, ownership } from "./selectors/markOwners.js";
import { resolveMarkItems } from "./materialization/selection/policies/index.js";
import { resolveRegisteredSelection } from "./materialization/selection/expression.js";

// Bound the complete export, including repeated child programs and components.
const MAX_ACCESSIBLE_ITEMS = 100_000;

export function accessibleItemViews(program, target) {
  let work = 0, count = 0;
  const spend = amount => validateWorkLimit(work += amount, "Accessible item work");
  const views = [], pending = [{ program, path: [], namespaces: [] }];
  while (pending.length > 0) {
    spend(1);
    const { program: current, path, namespaces } = pending.pop();
    const spec = current.compositionSpec;
    if (spec !== undefined) {
      if (target !== undefined) throw new Error("Composition targets are ambiguous; export an explicit child program instead.");
      spend(spec.children.length * (path.length + namespaces.length + 1));
      for (let index = spec.children.length - 1; index >= 0; index -= 1) {
        const id = spec.children[index];
        pending.push({ program: current.children[id], path: [...path, id], namespaces: [...namespaces, `${spec.id}-${id}`] });
      }
      continue;
    }
    const layers = current.semanticSpec.layers;
    // The shared ownership owner scans semantic layers; preflight that cost.
    spend(layers.length * layers.length);
    const owners = ownership(current);
    let roots = layers.filter(layer => !owners.has(layer.id));
    if (target !== undefined) {
      const layer = findLayer(current, target);
      if (layer === undefined) throw new Error(`Unknown mark target "${target}".`);
      if (owners.has(target)) throw new Error(`Mark "${target}" is owned by "${owners.get(target)}"; export its stable owner.`);
      roots = [layer];
    }
    const scope = key => {
      spend(namespaces.length + 1);
      return namespaces.reduceRight((value, namespace) => namespaceItemKey(value, namespace), key);
    };
    const components = new Map(), localViews = [];
    for (const root of roots) {
      const stack = [root], visited = new Set(), ids = [];
      while (stack.length > 0) {
        spend(layers.length + 1);
        const layer = stack.pop();
        if (visited.has(layer.id)) throw new Error("Accessible items require acyclic mark ownership.");
        visited.add(layer.id); ids.push(layer.id);
        if (current.graphicSpec.objects[layer.id] === undefined) throw new Error(`Cannot export accessible items for mark "${layer.id}": the owner is not materialized.`);
        const items = resolveMarkItems(current, layer.id);
        spend(items.length);
        count += items.length;
        validateGeneratedItemLimit(count, "Accessible item count", MAX_ACCESSIBLE_ITEMS);
        components.set(layer.id, items);
        const children = ownedChildren(current, layer.id).filter(id => owners.get(id) === layer.id);
        for (let index = children.length - 1; index >= 0; index -= 1) stack.push(findLayer(current, children[index]));
      }
      localViews.push({ kind: "items", ownerId: root.id, markType: root.mark.type, childPath: path,
        items: [], componentIds: ids });
    }
    const selected = new Map();
    for (const [id, definition] of Object.entries(current.materializationConfigs.selections ?? {})) {
      spend(1);
      if (!components.has(definition.target)) continue;
      spend(components.get(definition.target).length);
      const resolved = resolveRegisteredSelection(current, id);
      const author = definition.sourceSelection ?? id;
      let byKey = selected.get(definition.target);
      if (byKey === undefined) selected.set(definition.target, byKey = new Map());
      for (const key of resolved.keys) {
        spend(1);
        const ids = byKey.get(key) ?? new Set();
        ids.add(author);
        byKey.set(key, ids);
      }
    }
    for (const view of localViews) {
      for (const id of view.componentIds) {
        for (const item of components.get(id)) {
          view.items.push({ key: scope(item.key), component: id, markType: item.markType,
            ...(item.role === undefined ? {} : { role: item.role }),
            fields: item.fields, channels: item.channels, visible: item.visible !== false,
            selectedBy: [...(selected.get(id)?.get(item.key) ?? [])],
            ...(item.representationKeys === undefined ? {} : { representationKeys: item.representationKeys.map(scope) }),
            ...(item.navigation === undefined ? {} : { navigation: item.navigation }) });
        }
      }
      delete view.componentIds;
      views.push(view);
    }
  }
  return { title: program.semanticSpec.title.text ?? null, views };
}
