// The index orders exact compiled footprints without changing their math.
// Bounded polygons permit conservative pruning. Circles and extreme values
// retain scalar traversal; the padding weakens bounds, never hit tolerance.
const states = new WeakMap();
const SAFE = 2 ** 20, PAD = 2 ** -10, LEAF = 8;

export function lowerBound(bounds, point) {
  if (![point.x, point.y, ...bounds].every(value => Number.isFinite(value) && Math.abs(value) <= SAFE)) return 0;
  return Math.max(0, bounds[0] - point.x - PAD, point.x - bounds[2] - PAD,
    bounds[1] - point.y - PAD, point.y - bounds[3] - PAD);
}
function spread(value) {
  value &= 65535;
  value = (value | (value << 8)) & 0x00ff00ff;
  value = (value | (value << 4)) & 0x0f0f0f0f;
  value = (value | (value << 2)) & 0x33333333;
  return (value | (value << 1)) & 0x55555555;
}

/** Bounded stable radix ordering and balanced eight-part leaves. */
export function buildPartIndex(parts, limit = 16_000_000) {
  let work = 0;
  const spend = count => {
    work += count;
    if (work > limit) throw new RangeError("Hit path index exceeds its preparation work budget.");
  };
  const length = parts.length;
  if (!Number.isSafeInteger(length) || length > 400_000) throw new RangeError("Hit path index exceeds its part budget.");
  const leaves = Math.ceil(length / LEAF), nodes = Math.max(0, 2 * leaves - 1);
  // Every loop has an exact size: scan + key + four radix passes + leaves/nodes.
  // Reserve before allocation, then retain the actual visit charges below.
  const requiredWork = 15 * length + nodes + 2048;
  const peakBytes = nodes * 48 + length * 12 + 1024;
  if (!Number.isSafeInteger(requiredWork) || !Number.isSafeInteger(peakBytes) || requiredWork > limit) {
    throw new RangeError("Hit path index exceeds its preparation work budget.");
  }
  const bounds = new Float64Array(nodes * 4), metadata = new Uint32Array(nodes * 4);
  const keys = new Uint32Array(length), order = new Uint32Array(length), scratch = new Uint32Array(length);
  const buckets = new Uint32Array(256);
  let safe = true, xmin = Infinity, ymin = Infinity, xmax = -Infinity, ymax = -Infinity;
  for (let index = 0; index < length; index++) {
    spend(1);
    const box = parts[index].bounds;
    safe &&= !parts[index].circle && box != null && Object.values(box).every(value => Number.isFinite(value) && Math.abs(value) <= SAFE);
    if (box) {
      xmin = Math.min(xmin, box.left); ymin = Math.min(ymin, box.top);
      xmax = Math.max(xmax, box.right); ymax = Math.max(ymax, box.bottom);
    }
  }
  const quantize = (value, low, high) => low === high ? 0 : Math.max(0, Math.min(65535, Math.floor((value - low) / (high - low) * 65535)));
  for (let index = 0; index < length; index++) {
    spend(1); order[index] = index;
    const box = parts[index].bounds;
    keys[index] = !box || !safe ? 0 : (spread(quantize(box.left / 2 + box.right / 2, xmin, xmax)) |
      (spread(quantize(box.top / 2 + box.bottom / 2, ymin, ymax)) << 1)) >>> 0;
  }
  for (let shift = 0; shift < 32; shift += 8) {
    buckets.fill(0); spend(256);
    for (let index = 0; index < length; index++) { spend(1); buckets[(keys[order[index]] >>> shift) & 255]++; }
    let sum = 0;
    for (let index = 0; index < 256; index++) { spend(1); const size = buckets[index]; buckets[index] = sum; sum += size; }
    for (let index = 0; index < length; index++) {
      spend(1); const ordinal = order[index]; scratch[buckets[(keys[ordinal] >>> shift) & 255]++] = ordinal;
    }
    order.set(scratch); spend(length);
  }
  let cursor = 0;
  function build(first, last) {
    spend(1);
    const node = cursor++, offset = node * 4, box = [Infinity, Infinity, -Infinity, -Infinity];
    let ordinal = length;
    const union = value => {
      box[0] = Math.min(box[0], value[0]); box[1] = Math.min(box[1], value[1]);
      box[2] = Math.max(box[2], value[2]); box[3] = Math.max(box[3], value[3]);
    };
    if (last - first === 1) {
      metadata[offset] = 1; metadata[offset + 1] = first * LEAF; metadata[offset + 2] = Math.min(length, last * LEAF);
      for (let index = metadata[offset + 1]; index < metadata[offset + 2]; index++) {
        spend(1); const value = order[index], part = parts[value].bounds;
        ordinal = Math.min(ordinal, value);
        if (part) union([part.left, part.top, part.right, part.bottom]);
      }
    } else {
      const middle = first + Math.floor((last - first) / 2), left = build(first, middle), right = build(middle, last);
      metadata[offset + 1] = left; metadata[offset + 2] = right;
      union(bounds.subarray(left * 4, left * 4 + 4)); union(bounds.subarray(right * 4, right * 4 + 4));
      ordinal = Math.min(metadata[left * 4 + 3], metadata[right * 4 + 3]);
    }
    bounds.set(box, offset); metadata[offset + 3] = ordinal;
    return node;
  }
  if (leaves) build(0, leaves);
  // Build scratch arrays are not retained. Opaque identity conveys no program authority.
  const result = Object.freeze({ work });
  states.set(result, { bounds, metadata, order, safe, parts });
  return result;
}

export function indexedDistance(index, point, visit, spend = () => {}) {
  const state = states.get(index);
  if (!state) throw new TypeError("Hit parts require their prepared index.");
  const { bounds, metadata, order, parts } = state;
  let best = Infinity;
  if (!state.safe || ![point.x, point.y].every(value => Number.isFinite(value) && Math.abs(value) <= SAFE)) {
    for (let ordinal = 0; ordinal < parts.length; ordinal++) { spend(1); best = Math.min(best, visit(parts[ordinal], ordinal)); }
    return best;
  }
  const pending = order.length ? [0] : [];
  while (pending.length) {
    const node = pending.pop(), offset = node * 4;
    spend(1);
    if (lowerBound(bounds.subarray(offset, offset + 4), point) > best) continue;
    if (metadata[offset]) {
      for (let item = metadata[offset + 1]; item < metadata[offset + 2]; item++) {
        spend(1); const ordinal = order[item]; best = Math.min(best, visit(parts[ordinal], ordinal));
      }
    } else {
      const left = metadata[offset + 1], right = metadata[offset + 2];
      const dl = lowerBound(bounds.subarray(left * 4, left * 4 + 4), point), dr = lowerBound(bounds.subarray(right * 4, right * 4 + 4), point);
      if (dl < dr || dl === dr && metadata[left * 4 + 3] < metadata[right * 4 + 3]) pending.push(right, left);
      else pending.push(left, right);
    }
  }
  return best;
}
