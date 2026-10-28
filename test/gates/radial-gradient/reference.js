import { radialOffset } from "../../oracles/radial-gradient.js";
const underlay = [226, 232, 240];
export function expectedColor(fixture, x, y) {
  if (fixture.clip && Math.hypot(x - 130, y - 110) > 60) return [...underlay, 255];
  const offset = radialOffset(fixture.gradient, { x, y });
  if (offset === null) return [...underlay, 255];
  const t = Math.min(1, Math.max(0, offset));
  let left = fixture.stops[0], right = fixture.stops.at(-1);
  for (const stop of fixture.stops) if (stop.offset <= t) left = stop;
  for (const stop of fixture.stops) if (stop.offset > t) { right = stop; break; }
  const ratio = right.offset === left.offset ? 1 : Math.min(1, Math.max(0, (t - left.offset) / (right.offset - left.offset)));
  const alpha = (left.value.alpha + (right.value.alpha - left.value.alpha) * ratio) * fixture.opacity;
  return [...left.value.rgb.map((value, index) => Math.round((value + (right.value.rgb[index] - value) * ratio) * alpha + underlay[index] * (1 - alpha))), 255];
}
export function samplePixels(fixture) {
  const pixels = [[130,110], [95,110], [160,110], [130,65], [130,155], [215,110], [30,110]];
  return pixels.map((pixel, index) => {
    const footprint = [0, 0.5, 1].flatMap(dx => [0, 0.5, 1].map(dy => expectedColor(fixture, pixel[0] + dx, pixel[1] + dy)));
    return { name: index === 6 ? "left-cone-exterior" : `interior-${index}`, pixel,
      expected: expectedColor(fixture, pixel[0] + 0.5, pixel[1] + 0.5),
      footprint: { min: [0,1,2,3].map(channel => Math.min(...footprint.map(color => color[channel]))),
        max: [0,1,2,3].map(channel => Math.max(...footprint.map(color => color[channel]))) } };
  });
}
