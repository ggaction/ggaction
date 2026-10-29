import { cloneAndFreeze, freezeOwned } from '../core/immutable.js';
import { ownArray } from '../core/ownData.js';
import { validateGeneratedItemLimit, validateWorkLimit } from '../core/validation.js';
import { findLayer } from '../selectors/layers.js';
import { resolveHierarchyLayerResources } from '../selectors/hierarchy.js';
import { hierarchyInputSources } from '../grammar/hierarchy/input.js';
import { hitShapeAnchor, hitShape } from '../grammar/hitShapes.js';
import { resolveRegisteredMarkItems } from '../materialization/selection/itemResolver.js';
import { interactionOwner, scopeSelectionKeys } from './selection.js';
import { normalizeClickSelection, clickSelectionCommand } from './clickSelection.js';
import { interactionOptions as options } from './input.js';

const targetKey = target => JSON.stringify([target.childPath, target.id]);
const itemId = (target, key) => JSON.stringify([targetKey(target), key]);
const moves = ['next', 'previous', 'first', 'last', 'parent', 'firstChild', 'previousSibling', 'nextSibling', 'root'];
function budget() { let work = 0; return count => validateWorkLimit(work += count, 'Keyboard focus work'); }
function owner(program, target, allowMissing = false) {
  const result = interactionOwner(program, target, allowMissing);
  if (!result) return null;
  if (result.target.facetSource || result.view.compositionSpec) throw new Error('Keyboard focus requires an explicit materialized leaf mark.');
  const layer = findLayer(result.view, result.target.id);
  if (!layer) { if (allowMissing) return null; throw new Error('Unknown keyboard mark target.'); }
  return { ...result, layer };
}

export function normalizeKeyboardBinding(program, input, links) {
  options(input, ['type', 'targets'], [], 'Keyboard binding');
  if (input.type !== 'keyboard' || !Array.isArray(input.targets) || !input.targets.length || input.targets.length > 256) throw new TypeError('Keyboard binding requires 1 to 256 targets.');
  ownArray(input.targets, 'Keyboard targets');
  const seen = new Set();
  return cloneAndFreeze({ type: 'keyboard', targets: input.targets.map(value => {
    const request = options(value, ['target'], ['activation'], 'Keyboard target');
    const resolved = owner(program, request.target), target = resolved.target, key = targetKey(target);
    if (seen.has(key)) throw new TypeError('Keyboard targets must be distinct.');
    seen.add(key);
    let activation;
    if (request.activation !== undefined) {
      const head = options(request.activation, ['type'], ['selection', 'mode'], 'Keyboard activation');
      if (head.type === 'select') {
        const binding = normalizeClickSelection(program, { ...head, target, onMiss: 'ignore', slop: 0 }, links);
        activation = { type: 'select', selection: binding.selection, mode: binding.mode };
      } else {
        options(head, ['type'], [], 'Hierarchy keyboard activation');
        if (head.type !== 'focusHierarchy' || resolved.layer.mark.type !== 'partition' || typeof program.editPartitionPlot !== 'function') throw new TypeError('Hierarchy keyboard activation requires a supported partition owner.');
        activation = { type: 'focusHierarchy' };
      }
    }
    return { target, ...(activation === undefined ? {} : { activation }) };
  }) });
}

// One derived read-only model for an exact current frame. Its anchors are admitted
// by the same prepared paint, dash and clip geometry as pointer inspection.
export function prepareKeyboardFrame(program, binding, frame) {
  if (binding === null) return null;
  const spend = budget(), byTarget = new Map(), entries = [], byItem = new Map();
  for (const config of binding.targets) {
    const resolved = owner(program, config.target, true), group = { config, entries: [], resolved, byKey: new Map(), byAlias: new Map() };
    byTarget.set(targetKey(config.target), group);
    if (!resolved) continue;
    const items = resolveRegisteredMarkItems(resolved.view, config.target.id, 'item', { channels: [] });
    spend(items.length); validateGeneratedItemLimit(entries.length + items.length, 'Keyboard item count', 100_000);
    for (const item of items) {
      if (item.visible === false) continue;
      const keys = scopeSelectionKeys(program, config.target, [item.key, ...(item.representationKeys ?? [])], spend);
      const entry = { target: config.target, item, key: keys[0], aliases: new Set(keys.slice(1)), candidate: null, group };
      group.entries.push(entry); entries.push(entry); byItem.set(itemId(config.target, entry.key), entry);
    }
  }
  const tested = new Map();
  for (const entry of frame.entries) {
    spend(1 + entry.metadata.itemKey.length);
    const key = itemId({ id: entry.metadata.ownerId, childPath: entry.metadata.childPath }, entry.metadata.itemKey), item = byItem.get(key);
    if (!item || item.candidate && item.candidate.zIndex >= entry.zIndex) continue;
    let point = tested.get(entry.shape);
    if (point === undefined) { point = hitShapeAnchor(entry.shape, spend); tested.set(entry.shape, point); }
    if (point === null) continue;
    const hit = hitShape(entry.shape, point, { slop: 0 });
    if (!hit.hit) throw new Error('Keyboard anchor must be admitted by its current hit shape.');
    item.candidate = freezeOwned({ ...entry.metadata, screenPoint: point, localPoint: hit.localPoint, distance: 0, zIndex: entry.zIndex });
  }
  const eligible = entries.filter(entry => entry.candidate !== null);
  for (const entry of eligible) {
    entry.group.byKey.set(entry.key, entry);
    for (const key of entry.aliases) { spend(1 + key.length); entry.group.byAlias.set(key, entry.group.byAlias.has(key) ? null : entry); }
  }
  return { program, frame, byTarget, entries: eligible };
}
function entryFor(model, target, key) {
  const group = model.byTarget.get(targetKey(target));
  // A coarse item may expand into several finer items. Never choose the first.
  return group?.byKey.get(key) ?? group?.byAlias.get(key) ?? null;
}
function container(target) { return freezeOwned({ target, itemKey: null, currentItemKey: null, screenPoint: null, role: null }); }
function focusEntry(entry, key = entry.key) {
  return freezeOwned({ target: entry.target, itemKey: key, currentItemKey: entry.key,
    screenPoint: entry.candidate.screenPoint, role: entry.candidate.role });
}
export function reconcileKeyboardFocus(model, focus) {
  if (model === null || focus === null) return null;
  if (focus.itemKey === null) return focus;
  const entry = entryFor(model, focus.target, focus.itemKey);
  return entry ? focusEntry(entry, focus.itemKey) : container(focus.target);
}
export function normalizeFocusCommand(program, binding, command) {
  if (binding === null) throw new Error('Focus requires a keyboard binding.');
  const request = options(command, ['type'], ['target', 'itemKey', 'move'], 'Focus command');
  if (Object.hasOwn(request, 'move')) {
    options(request, ['type', 'move'], [], 'Focus movement');
    if (!moves.includes(request.move)) throw new TypeError('Unsupported keyboard focus movement.');
    return freezeOwned({ type: 'focus', move: request.move });
  }
  options(request, ['type', 'target', 'itemKey'], [], 'Item focus');
  const target = interactionOwner(program, request.target, true)?.target;
  // Removed child owners can still be focused at their already normalized container.
  const config = binding.targets.find(entry => targetKey(entry.target) === targetKey(target ?? request.target));
  if (!config) throw new Error('Focus target must match a configured keyboard target.');
  if (request.itemKey !== null && (typeof request.itemKey !== 'string' || !request.itemKey.length)) throw new TypeError('Focus itemKey requires an opaque item key or null.');
  validateWorkLimit(request.itemKey?.length ?? 0, 'Keyboard focus key');
  return cloneAndFreeze({ type: 'focus', target: config.target, itemKey: request.itemKey });
}
export function moveKeyboardFocus(model, focus, command) {
  if (command.move === undefined) {
    if (command.itemKey === null) return container(command.target);
    const entry = entryFor(model, command.target, command.itemKey);
    if (!entry) throw new Error('Focus item is absent, ambiguous or not painted in the current frame.');
    return focusEntry(entry, command.itemKey);
  }
  const entries = model.entries;
  if (!entries.length) return focus;
  const current = focus?.itemKey === null || focus === null ? null : entryFor(model, focus.target, focus.itemKey);
  const index = current === null ? -1 : entries.indexOf(current);
  if (['first','last','next','previous'].includes(command.move)) {
    const next = command.move === 'first' ? 0 : command.move === 'last' ? entries.length - 1
      : command.move === 'next' ? Math.min(index + 1, entries.length - 1) : index < 0 ? entries.length - 1 : Math.max(index - 1, 0);
    return focusEntry(entries[next]);
  }
  if (!current?.item.navigation) return focus;
  const key = current.item.navigation[command.move];
  const next = current.group.entries.find(entry => entry.candidate !== null && entry.item.navigation?.key === key);
  return next ? focusEntry(next) : focus;
}
export function keyboardActivation(model, focus, parent = false) {
  if (focus === null || focus.itemKey === null) return null;
  const entry = entryFor(model, focus.target, focus.itemKey), activation = entry?.group.config.activation;
  if (!activation) return null;
  if (activation.type === 'select') return parent ? null : clickSelectionCommand(model.program,
    { ...activation, target: entry.target, onMiss: 'ignore' }, { candidates: [entry.candidate] });
  const { view, layer } = entry.group.resolved, { hierarchy, dataset } = resolveHierarchyLayerResources(view, layer);
  const key = parent ? entry.item.navigation.parent : entry.item.navigation.key;
  const sources = hierarchyInputSources(dataset.values, hierarchy.options), source = sources.get(key);
  const native = source ? hierarchy.options.format === 'groups' ? { path: source.path } : { key: source.key } : null;
  return { type: 'focusHierarchy', target: entry.target, payload: { focus: native }, origin: 'user' };
}
export function keyboardKeyCommand(model, focus, key) {
  if (key === 'Enter' || key === ' ') return { type: 'activate' };
  if (key === 'Escape') return { type: 'activate', parent: true };
  const current = focus?.itemKey ? entryFor(model, focus.target, focus.itemKey) : null, tree = current?.item.navigation;
  const move = tree ? ({ ArrowLeft:'parent', ArrowRight:'firstChild', ArrowUp:'previousSibling', ArrowDown:'nextSibling', Home:'root', End:'last' })[key]
    : ({ ArrowLeft:'previous', ArrowUp:'previous', ArrowRight:'next', ArrowDown:'next', Home:'first', End:'last' })[key];
  return move === undefined ? null : { type: 'focus', move };
}
