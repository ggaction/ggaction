import { createHash } from "node:crypto";

function stableRank(seed, index) {
  return createHash("sha256")
    .update(seed)
    .update("\0")
    .update(String(index))
    .digest("hex");
}

function referenceWitnessIndices(rows, fields, dimensions) {
  const indices = new Set([0, rows.length - 1]);
  for (const field of fields) {
    const finite = rows
      .map((row, index) => ({ index, value: row[field] }))
      .filter(entry => Number.isFinite(entry.value));
    if (finite.length === 0) continue;
    finite.sort((left, right) =>
      left.value - right.value || left.index - right.index
    );
    indices.add(finite[0].index);
    indices.add(finite.at(-1).index);
  }
  for (const field of dimensions) {
    const firstByValue = new Map();
    for (const [index, row] of rows.entries()) {
      const value = row[field];
      if (value !== null && !firstByValue.has(value)) {
        firstByValue.set(value, index);
      }
    }
    for (const index of firstByValue.values()) indices.add(index);
  }
  return indices;
}

export function referenceStableSelectionIndices(rows, selection) {
  if (selection.mode === "all" || rows.length <= selection.count) {
    return rows.map((_, index) => index);
  }
  const selected = referenceWitnessIndices(
    rows,
    selection.witnessFields,
    selection.witnessDimensions ?? []
  );
  const candidates = rows
    .map((_, index) => index)
    .filter(index => !selected.has(index))
    .map(index => ({ index, rank: stableRank(selection.seed, index) }))
    .sort((left, right) =>
      left.rank.localeCompare(right.rank) || left.index - right.index
    );
  for (const { index } of candidates) {
    if (selected.size >= selection.count) break;
    selected.add(index);
  }
  return [...selected].sort((left, right) => left - right);
}

export function stableSelectionIndexDigest(indexes) {
  return createHash("sha256").update(indexes.join(",")).digest("hex");
}
