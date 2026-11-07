import { getMarkItems } from "../../src/inspection.js";
import { targets } from "./fixture.js";

// An explicit host recipe: inspect one bin, then select its source rows in each panel.
export function highlightMarginalBin(program, axis, lower) {
  if (axis !== "x" && axis !== "y") throw new Error("Marginal axis must be x or y.");
  const panelItems = targets.map(target => getMarkItems(program, { target }));
  const refs = new Map(panelItems[1].flatMap(item => item.rows).map(row =>
    [JSON.stringify([row.data, row.logicalDataId, row.revision]), row]));
  if (refs.size !== 1) throw new Error("Marginal panels require one current observation source.");
  const [source] = refs.values();
  const sameSource = row => row.data === source.data && row.logicalDataId === source.logicalDataId && row.revision === source.revision;
  if (!panelItems.every(items => items.some(item => item.rows.some(sameSource)))) {
    throw new Error("Revise all marginal panels before linking their rows.");
  }
  const target = targets[axis === "x" ? 0 : 2];
  const item = getMarkItems(program, { target }).find(item => item.channels[axis] === lower);
  if (!item) throw new Error("The requested marginal bin has no visible item.");
  const sourceRows = item.rows.filter(sameSource);
  const indices = [...new Set(sourceRows.map(row => row.index))];
  return targets.reduce((next, target) => next.highlightMarks({ target,
    id: "linked-bin", select: { rows: { data: source.data, indices } },
    fill: "#f97316", dimOthers: { opacity: 0.3 }
  }), program);
}
