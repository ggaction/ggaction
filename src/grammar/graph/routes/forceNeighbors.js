import { forceCompatibility } from "./compatibility.js";

const CHUNK_PAIRS = 32_768;

// Only the solver's already budgeted, ordered active edges enter this owner.
// The byte bound is derived from that same candidate count, not a new policy.
export function buildForceNeighbors(metrics, active, directed, threshold, check, chunkPairs = CHUNK_PAIRS) {
  check();
  const count = metrics.length, candidates = active.length * (active.length - 1) / 2;
  const headerBytes = 4 * (count + 1) + 4 * count, maximumBytes = headerBytes + 13 * candidates;
  if (![count, candidates, chunkPairs].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff) ||
      chunkPairs === 0 || !Number.isSafeInteger(maximumBytes)) throw new RangeError("Force neighbor buffer sizes must be bounded integers.");
  const table = { offsets: undefined, degrees: undefined, chunks: [], pairs: 0, bytes: 0, chunkPairs };
  const reserve = bytes => {
    check();
    const next = table.bytes + bytes;
    if (!Number.isSafeInteger(next) || next > maximumBytes) throw new RangeError("Force neighbor buffers exceed their candidate bound.");
    table.bytes = next;
  };
  try {
    reserve(headerBytes);
    table.offsets = new Uint32Array(count + 1);
    table.degrees = new Uint32Array(count);
    let cursor = 0;
    for (let i = 0; i < active.length; i++) {
      const edge = active[i];
      while (cursor <= edge) table.offsets[cursor++] = table.pairs;
      check();
      for (let j = i + 1; j < active.length; j++) {
        check();
        const other = active[j], pair = forceCompatibility(metrics[edge], metrics[other], directed);
        if (!(pair.compatibility > 0 && pair.compatibility >= threshold)) continue;
        const slot = table.pairs % chunkPairs;
        if (slot === 0) {
          const capacity = Math.min(chunkPairs, candidates - table.pairs);
          // Reserve the entire group before allocating its first array. Keeping
          // chunks avoids a second full neighbor buffer during consolidation.
          reserve(13 * capacity);
          table.chunks.push({ targets: new Uint32Array(capacity), weights: new Float64Array(capacity), reverse: new Uint8Array(capacity) });
        }
        const chunk = table.chunks.at(-1);
        chunk.targets[slot] = other; chunk.weights[slot] = pair.compatibility; chunk.reverse[slot] = Number(pair.reverse);
        table.degrees[edge]++; table.degrees[other]++; table.pairs++;
      }
    }
    while (cursor <= count) table.offsets[cursor++] = table.pairs;
    return table;
  } catch (error) {
    disposeForceNeighbors(table);
    throw error;
  }
}

export function forEachForceNeighbor(table, visit) {
  for (let edge = 0; edge < table.degrees.length; edge++) {
    for (let pair = table.offsets[edge]; pair < table.offsets[edge + 1]; pair++) {
      const chunk = table.chunks[Math.floor(pair / table.chunkPairs)], slot = pair % table.chunkPairs;
      visit(edge, chunk.targets[slot], chunk.weights[slot], chunk.reverse[slot] === 1);
    }
  }
}

export function disposeForceNeighbors(table) {
  table.chunks.length = 0;
  table.offsets = table.degrees = undefined;
  table.pairs = table.bytes = 0;
}
