import { freezeOwned, isOwned } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { interpolateNumber } from "../numeric.js";
import { buildRingPathCommands } from "../pathCommands.js";
import { preparePartitionBendMapping, partitionBendSegments } from "./partitionAdapter.js";
import { admitPartitionBendGap } from "./partitionBend.js";
import { validatePartitionInterval, validatePartitionIntervalRange } from "./partitionMapping.js";

// The shared cell builder consumes normalized intervals and current CSS gaps.
// Native private frames and public transition frames use the same tessellation.
// One frame admission serves every cell; each cell interval is still checked.
export function preparePartitionBendCells(frame, bend, segmentCount) {
  ownRecord(frame, "Partition cell frame");
  rejectUnknownProperties(frame, ["origin", "angle", "handedness", "kernel", "gap"], "partition cell frame");
  const segments = segmentCount === undefined ? partitionBendSegments({ compatible: true, kernel: frame.kernel }, bend) : segmentCount;
  if (!Number.isSafeInteger(segments) || segments < 1 || segments > 4096) throw new RangeError("Partition cell segment count must lie from 1 through 4096.");
  const { gap: inputGap, ...basis } = frame;
  const mapping = preparePartitionBendMapping(basis, { u: .5, v: .5, bend });
  mapping.map({ u: .5, v: .5, bend });
  // Cell ranges precede the gap; the gap is admitted once, after the first cell.
  let gap;
  const build = cell => {
    validatePartitionIntervalRange(cell);
    gap ??= admitPartitionBendGap(inputGap);
    const interval = mapping.insetLiteral(cell, gap);
    if (!interval.visible) return null;
    const count = Math.max(1, Math.ceil((interval.u1 - interval.u0) * segments)), ring = [];
    const at = (i, v) => { const point = mapping.mapLiteral({ u: interpolateNumber(interval.u0, interval.u1, i / count), v, bend }); ring.push([point.x, point.y]); };
    for (let i = 0; i <= count; i++) at(i, interval.v0);
    for (let i = count; i >= 0; i--) at(i, interval.v1);
    const anchor = mapping.mapLiteral({ u: (interval.u0 + interval.u1) / 2, v: interval.anchorV, bend });
    return freezeOwned({ commands: buildRingPathCommands([ring], true), anchor: freezeOwned(anchor), interval: freezeOwned(interval) });
  };
  // `cell` admits a caller interval record. `node` reads the four bounds of an
  // owned node, whose frozen data fields need no accessor or extra-key check.
  return {
    cell: cell => { validatePartitionInterval(cell); return build(cell); },
    node: node => isOwned(node) ? build({ u0: node.u0, u1: node.u1, v0: node.v0, v1: node.v1 })
      : (validatePartitionInterval(node = { u0: node.u0, u1: node.u1, v0: node.v0, v1: node.v1 }), build(node))
  };
}
export function partitionBendCellGeometry(cell, frame, bend, segmentCount) {
  return preparePartitionBendCells(frame, bend, segmentCount).cell(cell);
}
