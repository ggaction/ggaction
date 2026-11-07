import { freezeOwned } from "../core/immutable.js";

export const INTERACTION_HISTORY_TYPES = Object.freeze(["undo", "redo", "reset"]);

/** Retain bounded immutable session snapshots, never program clones or host leases. */
export function createInteractionHistory(initial, limit = 100) {
  if (!Number.isSafeInteger(limit) || limit < 0 || limit > 10_000) throw new RangeError("Interaction historyLimit requires an integer from 0 to 10000.");
  let baseline = initial;
  const undo = [], redo = [], allOwners = Object.freeze([]);
  const push = (stack, entry) => {
    if (!limit) return;
    if (stack.length === limit) stack.shift();
    stack.push(entry);
  };
  const record = (state, affectedOwners) => { push(undo, { state, affectedOwners }); redo.length = 0; };
  return Object.freeze({
    inspect: () => freezeOwned({ undoCount: undo.length, redoCount: redo.length, limit }),
    target: type => type === "reset" ? { state: baseline, affectedOwners: allOwners } : (type === "undo" ? undo : redo).at(-1),
    record,
    accept(type, previous, affectedOwners) {
      if (type === "reset") record(previous, affectedOwners);
      else {
        (type === "undo" ? undo : redo).pop();
        push(type === "undo" ? redo : undo, { state: previous, affectedOwners });
      }
    },
    clear() { undo.length = 0; redo.length = 0; },
    dispose() { baseline = undefined; undo.length = 0; redo.length = 0; }
  });
}
