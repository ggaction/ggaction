import { frame } from "./fixture.js";

// Native executable primitive. No public ChartProgram radial paint is registered.
export function drawRadialPrimitive(context, fixture, { lowerOpacity = false, clipCone = false } = {}) {
  const { gradient, bounds } = fixture;
  context.save();
  context.fillStyle = "white"; context.fillRect(0, 0, frame.width, frame.height);
  context.fillStyle = "#243447"; context.font = "14px Arial"; context.fillText(fixture.title, 20, 24);
  context.fillStyle = fixture.underlay; context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  context.save();
  if (fixture.clip) { context.beginPath(); context.arc(130, 110, 60, 0, Math.PI * 2); context.clip(); }
  if (clipCone && fixture.style === "edge-focus") {
    context.beginPath(); context.rect(gradient.focal.x, bounds.y, bounds.x + bounds.width - gradient.focal.x, bounds.height); context.clip();
  }
  const paint = context.createRadialGradient(gradient.focal.x, gradient.focal.y, 0, gradient.center.x, gradient.center.y, gradient.radius);
  for (const [index, stop] of gradient.stops.entries()) paint.addColorStop(stop.offset,
    lowerOpacity ? `rgba(${fixture.stops[index].value.rgb.join(",")},${fixture.stops[index].value.alpha * fixture.opacity})` : stop.color);
  context.fillStyle = paint; context.globalAlpha = lowerOpacity ? 1 : fixture.opacity;
  context.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  context.restore(); context.restore();
}

export function radialPrimitiveSVG(fixture) {
  const { gradient, bounds } = fixture;
  const stops = gradient.stops.map(stop => `<stop offset="${stop.offset}" stop-color="${stop.color}"/>`).join("");
  const id = `radial-${fixture.style}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}" viewBox="0 0 ${frame.width} ${frame.height}"><defs><radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${gradient.center.x}" cy="${gradient.center.y}" r="${gradient.radius}" fx="${gradient.focal.x}" fy="${gradient.focal.y}" fr="0" spreadMethod="pad" color-interpolation="sRGB">${stops}</radialGradient><clipPath id="clip-${id}"><circle cx="130" cy="110" r="60"/></clipPath></defs><rect width="260" height="200" fill="white"/><text x="20" y="24" font-family="Arial" font-size="14" fill="#243447">${fixture.title}</text><rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="${fixture.underlay}"/><rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="url(#${id})" fill-opacity="${fixture.opacity}"${fixture.clip ? ` clip-path="url(#clip-${id})"` : ""}/></svg>`;
}
