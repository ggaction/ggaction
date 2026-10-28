// Exact rational flat squarify oracle. Enumerate every possible row prefix and
// choose the earliest global minimum aspect, rather than the production walk's
// incremental improvement and floating dimension ratios.
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a < 0n ? -a : a; };
const fraction = (n, d = 1n) => { const g = gcd(n, d); return [n / g, d / g]; };
const add = (a, b) => fraction(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const sub = (a, b) => fraction(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const mul = (a, b) => fraction(a[0] * b[0], a[1] * b[1]);
const div = (a, b) => fraction(a[0] * b[1], a[1] * b[0]);
const compare = (a, b) => { const d = a[0] * b[1] - b[0] * a[1]; return d < 0n ? -1 : d > 0n ? 1 : 0; };
const number = a => Number(a[0]) / Number(a[1]);
const integer = n => [BigInt(n), 1n];

export function rationalSquarify(weights, width, height) {
  let pending = weights.map((weight, index) => ({ weight: integer(weight), index })).filter(item => item.weight[0] > 0n);
  pending.sort((a, b) => -compare(a.weight, b.weight) || a.index - b.index);
  const result = Array(weights.length).fill(null);
  let rect = { x0: integer(0), y0: integer(0), x1: integer(width), y1: integer(height) };
  while (pending.length) {
    const w = sub(rect.x1, rect.x0), h = sub(rect.y1, rect.y0), axis = compare(w, h) >= 0 ? "x" : "y";
    const long = axis === "x" ? w : h, short = axis === "x" ? h : w;
    const total = pending.reduce((sum, item) => add(sum, item.weight), integer(0));
    let best, count = 0, rowTotal = integer(0), sum = integer(0);
    for (let length = 1; length <= pending.length; length++) {
      sum = add(sum, pending[length - 1].weight);
      const thickness = mul(long, div(sum, total));
      let worst = integer(1);
      for (const item of pending.slice(0, length)) {
        const side = mul(short, div(item.weight, sum));
        for (const ratio of [div(thickness, side), div(side, thickness)]) if (compare(ratio, worst) > 0) worst = ratio;
      }
      if (best === undefined || compare(worst, best) < 0) { best = worst; count = length; rowTotal = sum; }
    }
    const edge = add(rect[`${axis}0`], mul(long, div(rowTotal, total))), other = axis === "x" ? "y" : "x";
    let cursor = rect[`${other}0`];
    for (const item of pending.slice(0, count)) {
      const end = add(cursor, mul(short, div(item.weight, rowTotal)));
      result[item.index] = Object.fromEntries(Object.entries({ ...rect, [`${axis}1`]: edge, [`${other}0`]: cursor, [`${other}1`]: end }).map(([key, value]) => [key, number(value)]));
      cursor = end;
    }
    rect = { ...rect, [`${axis}0`]: edge };
    pending = pending.slice(count);
  }
  return result;
}
