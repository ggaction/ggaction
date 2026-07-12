import { cloneAndFreeze } from "./immutable.js";

export function niceTicks(domain, count) {
  if (!Number.isInteger(count) || count <= 0) throw new RangeError("Tick count must be a positive integer.");
  const low = Math.min(...domain);
  const high = Math.max(...domain);
  if (low === high) return cloneAndFreeze([low]);
  const rough = (high - low) / count;
  const power = 10 ** Math.floor(Math.log10(rough));
  const error = rough / power;
  const factor = error >= 5 ? 10 : error >= 2 ? 5 : error >= 1 ? 2 : 1;
  const step = factor * power;
  const start = Math.ceil(low / step) * step;
  const end = Math.floor(high / step) * step;
  const values = [];
  for (let value = start; value <= end + step * 1e-10; value += step) values.push(+value.toPrecision(12));
  return cloneAndFreeze(values);
}
