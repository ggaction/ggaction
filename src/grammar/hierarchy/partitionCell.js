import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { interpolateNumber } from "../numeric.js";
import { mapPartitionBendPoint, partitionBendSegments } from "./partitionAdapter.js";
import { insetPartitionBendCell } from "./partitionBend.js";

// The shared cell builder consumes normalized intervals and current CSS gaps.
// Native private frames and public transition frames use the same tessellation.
export function partitionBendCellGeometry(cell, frame, bend, segmentCount) {
  ownRecord(frame, "Partition cell frame");
  rejectUnknownProperties(frame, ["origin", "angle", "handedness", "kernel", "gap"], "partition cell frame");
  const segments = segmentCount === undefined ? partitionBendSegments({ compatible: true, kernel: frame.kernel }, bend) : segmentCount;
  if (!Number.isSafeInteger(segments) || segments < 1 || segments > 4096) throw new RangeError("Partition cell segment count must lie from 1 through 4096.");
  const { gap, ...basis } = frame;
  mapPartitionBendPoint(basis, { u: .5, v: .5, bend });
  const interval = insetPartitionBendCell(cell, basis.kernel, bend, gap);
  if (!interval.visible) return null;
  const count = Math.max(1, Math.ceil((interval.u1 - interval.u0) * segments)), points = [];
  for (let i = 0; i <= count; i++) points.push(mapPartitionBendPoint(basis, { u: interpolateNumber(interval.u0, interval.u1, i / count), v: interval.v0, bend }));
  for (let i = count; i >= 0; i--) points.push(mapPartitionBendPoint(basis, { u: interpolateNumber(interval.u0, interval.u1, i / count), v: interval.v1, bend }));
  const anchor = mapPartitionBendPoint(basis, { u: (interval.u0 + interval.u1) / 2, v: interval.anchorV, bend });
  return cloneAndFreeze({ commands: points.map((point, index) => ({ op: index ? "L" : "M", ...point })).concat({ op: "Z" }), anchor, interval });
}
