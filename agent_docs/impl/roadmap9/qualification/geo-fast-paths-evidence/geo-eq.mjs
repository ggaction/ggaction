const [R, B] = process.argv.slice(2);
const neu = await import(R + '/src/grammar/geo/stream.js'), old = await import(B + '/src/grammar/geo/stream.js');
const { sphericalMidpoint } = await import(R + '/src/grammar/geo/projectionMath.js');
const { geoInterpolate } = await import(R + '/node_modules/geographic-math/src/index.js');
let seed = 3; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const same = (a, b) => JSON.stringify(a, (k, v) => typeof v === 'number' && Object.is(v, -0) ? '-0' : v) === JSON.stringify(b, (k, v) => typeof v === 'number' && Object.is(v, -0) ? '-0' : v);
for (let i = 0; i < 200000; i++) { const a = [rnd() * 720 - 360, rnd() * 180 - 90], b = rnd() < .05 ? [...a] : [rnd() * 720 - 360, rnd() * 180 - 90];
  const x = sphericalMidpoint(a, b), y = geoInterpolate(a, b)(0.5); if (!(Object.is(x[0], y[0]) && Object.is(x[1], y[1]))) { console.log('midpoint mismatch', a, b, x, y); process.exit(1); } }
const names = ['mercator', 'equirectangular', 'equal-earth', 'natural-earth', 'orthographic', 'stereographic', 'gnomonic', 'azimuthal-equal-area', 'azimuthal-equidistant', 'conic-equal-area', 'conic-conformal', 'conic-equidistant', 'transverse-mercator', 'albers-usa'];
const types = names.flatMap(type => [{ type, scalePx: 80 + rnd() * 300, translatePx: [200, 180] }, { type, scalePx: 150, translatePx: [210, 190], precisionPx: rnd() < .5 ? 0.25 : 3 }]);
let n = 0, errs = 0;
const run = (m, g, o, s) => { try { return { ok: m.projectGeometry(g, o, s) }; } catch (e) { return { err: e.message } } };
for (let i = 0; i < 3000; i++) {
  const len = 2 + Math.floor(rnd() * 40), cx = rnd() * 360 - 180, cy = rnd() * 160 - 80, spread = rnd() < .3 ? 120 : rnd() * 20;
  const coords = Array.from({ length: len }, () => [cx + (rnd() - .5) * spread, Math.max(-90, Math.min(90, cy + (rnd() - .5) * spread))]);
  const kind = rnd(), g = kind < .5 ? { type: 'LineString', coordinates: coords } : kind < .8 ? { type: 'Polygon', coordinates: [[...coords, coords[0]]] } : { type: 'MultiLineString', coordinates: [coords, coords.slice().reverse()] };
  const o = types[Math.floor(rnd() * types.length)];
  for (const interp of ['source-segment', 'great-circle']) {
    const settings = { coordinateKind: 'geographic', interpolation: interp, maxPoints: 200000, ...(interp === 'great-circle' && rnd() < .5 ? { routeHint: [0, 10] } : {}) };
    const a = run(old, g, o, settings), b = run(neu, g, o, settings);
    if (!same(a, b)) { console.log('MISMATCH', o.type, interp, JSON.stringify(g).slice(0, 200)); console.log(JSON.stringify(a).slice(0, 300)); console.log(JSON.stringify(b).slice(0, 300)); process.exit(1); }
    if (a.err) errs++; n++;
  }
}
console.log('ok midpoints 200000, geometries', n, 'errors', errs, 'types', types.length);
