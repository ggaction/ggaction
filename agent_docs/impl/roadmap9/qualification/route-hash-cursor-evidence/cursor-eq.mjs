const [NEW, OLD] = process.argv.slice(2);
const n = await import(NEW + "/src/core/encodedValueCursor.js"), o = await import(OLD + "/src/core/encodedValueCursor.js");
const ni = await import(NEW + "/src/core/immutable.js"), oi = await import(OLD + "/src/core/immutable.js");
let seed = 99; const r = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const strs = ["", "a", "x\"y", "\\", "é한🙂", "\ud800", "\udfff\ud800", "\u0001\n\t", "long".repeat(40), "key"];
function gen(d) {
  const k = r();
  if (d > 4 || k < 0.45) {
    const c = Math.floor(r() * 12);
    return [null, true, false, undefined, 0, -0, NaN, Infinity, r() * 1e6 - 5e5, 12345678901234567n, strs[Math.floor(r() * strs.length)], -2.2250738585072014e-308][c];
  }
  if (k < 0.75) { const a = Array.from({ length: Math.floor(r() * 8) }, () => gen(d + 1)); if (r() < 0.1) a.length += 2; return a; }
  const o = {}; for (let i = 0, m = Math.floor(r() * 6); i < m; i++) o[r() < 0.2 ? String(i * 7) : strs[Math.floor(r() * strs.length)] + i] = gen(d + 1); return o;
}
function drain(m, value, limits, budget) {
  const c = m.createEncodedValueCursor(value, limits), parts = []; let p;
  try { do { p = m.advanceEncodedValueCursor(c, budget); parts.push(Buffer.from(p.bytes)); } while (!p.done); return { bytes: Buffer.concat(parts).toString("hex"), stats: p.stats }; }
  catch (e) { return { error: e.constructor.name + ":" + e.message + ":" + JSON.stringify(e.optionPath ?? null) }; }
  finally { m.clearEncodedValueCursor(c); }
}
let cases = 0;
for (let i = 0; i < 3000; i++) {
  const raw = gen(0), a = ni.cloneAndFreeze(raw), b = oi.cloneAndFreeze(raw);
  const full = drain(o, b, { maxBytes: 1e7, maxDepth: 128, maxSteps: 1e7 }, { maxBytes: 65536, maxSteps: 4096 });
  const total = full.bytes ? full.bytes.length / 2 : 10;
  for (const limits of [{ maxBytes: 1e7, maxDepth: 128, maxSteps: 1e7 }, { maxBytes: Math.max(1, total - 1 - (i % 5)), maxDepth: 128, maxSteps: 1e7 }, { maxBytes: 1e7, maxDepth: 2, maxSteps: 1e7 }, { maxBytes: 1e7, maxDepth: 128, maxSteps: 1 + (i % 40) }])
    for (const budget of [{ maxBytes: 65536, maxSteps: 4096 }, { maxBytes: 7, maxSteps: 3 }]) {
      const x = JSON.stringify(drain(n, a, limits, budget)), y = JSON.stringify(drain(o, b, limits, budget)); cases++;
      if (x !== y) { console.log("DIFF", JSON.stringify(limits), JSON.stringify(budget), x.slice(0, 300), y.slice(0, 300)); process.exit(1); }
    }
}
// cycles and class instances keep their messages and paths
for (const m of [[n, ni], [o, oi]]) {
  const cyc = { a: [1, { b: null }] }; cyc.a[1].b = cyc; m[1].freezeOwned(cyc.a[1]); m[1].freezeOwned(cyc.a); m[1].freezeOwned(cyc);
  console.log(drain(m[0], cyc, { maxBytes: 1e6, maxDepth: 128, maxSteps: 1e6 }, { maxBytes: 64, maxSteps: 64 }).error);
  const cls = m[1].freezeOwned({ a: m[1].freezeOwned([0, m[1].freezeOwned(new Date(0))]) });
  console.log(drain(m[0], cls, { maxBytes: 1e6, maxDepth: 128, maxSteps: 1e6 }, { maxBytes: 64, maxSteps: 64 }).error);
  console.log(drain(m[0], m[1].freezeOwned({ "k.1": m[1].freezeOwned([m[1].freezeOwned([Symbol.iterator])]) }), { maxBytes: 1e6, maxDepth: 128, maxSteps: 1e6 }, { maxBytes: 64, maxSteps: 64 }).error);
}
console.log("equal", cases);
