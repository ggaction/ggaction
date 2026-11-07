import { normalizeGestureBindings, matchingGestureBindings } from "./gestures.js";
import { prepareSelectionCapture } from "./pointerCapture.js";

// Domain candidates are read-only probes. Begin is called only for the winner;
// all later effects stay bound to that same adapter and transaction.
export function pointerBindingChooser(entries) {
  const policies = normalizeGestureBindings(entries.map(entry => entry.policy));
  const owners = new Map(entries.map(entry => [entry.policy.id, entry]));
  return (point, pointerType, flags) => {
    for (const policy of matchingGestureBindings(policies, flags)) {
      const entry = owners.get(policy.id), context = entry.candidate(point, pointerType);
      if (context !== null) return { entry, context };
    }
    return null;
  };
}

export function prepareEditingCapture(element, entries) {
  const choose = pointerBindingChooser(entries), shared = entries[0];
  return prepareSelectionCapture(element, {
    requireCapture: entries.some(entry => entry.drag !== undefined),
    current: shared.current, perform: shared.perform, point: shared.point,
    blockClick: shared.blockClick,
    begin(point, pointerType, flags) {
      const selected = choose(point, pointerType, flags);
      if (selected === null) return null;
      return { entry: selected.entry, token: selected.entry.begin(point, pointerType, selected.context) };
    },
    bindingFor: selected => selected.entry.policy,
    acceptPointer: (selected, point, pointerType) => selected.entry.joinCandidate?.(point, pointerType) !== false,
    canDrag: selected => selected.entry.drag !== undefined,
    sample: (selected, point) => selected.entry.sample?.(selected.token, point),
    join: (selected, pointers) => selected.entry.join?.(selected.token, pointers),
    preview: (selected, pointers) => selected.entry.preview?.(selected.token, pointers),
    drag(selected, point, pointerType, kind, pointers) {
      const {entry, token} = selected;
      if (entry.drag) return entry.drag(token, point, pointerType, kind, pointers);
      return kind === "click" ? entry.select(token, point, pointerType) : entry.cancel(token, "movement");
    },
    cancel: (selected, reason) => selected.entry.cancel(selected.token, reason),
    error: (selected, error) => selected.entry.error(selected.token, error)
  });
}
