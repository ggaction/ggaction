import { frame, viewport, assetURI } from './fixture.js';

// Explicit native image primitive; no public ChartProgram image action is installed.
export function drawImagePrimitive(context, fixture, decodedImage) {
  context.save();
  context.fillStyle = 'white'; context.fillRect(0, 0, frame.width, frame.height);
  context.fillStyle = '#243447'; context.font = '14px Arial'; context.fillText(fixture.title, 12, 25);
  context.fillStyle = '#e2e8f0'; context.fillRect(viewport.x, viewport.y, viewport.width, viewport.height);
  context.beginPath(); context.rect(viewport.x, viewport.y, viewport.width, viewport.height); context.clip();
  if (fixture.circleClip) { context.beginPath(); context.arc(100, 110, 45, 0, Math.PI * 2); context.clip(); }
  context.globalAlpha = fixture.opacity ?? 1;
  context.drawImage(decodedImage, ...fixture.rect);
  context.restore();
}

export function imagePrimitiveSVG(fixture) {
  const [x, y, width, height] = fixture.rect;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}"><defs><clipPath id="viewport"><rect x="50" y="60" width="100" height="100"/></clipPath><clipPath id="circle"><circle cx="100" cy="110" r="45"/></clipPath></defs><rect width="200" height="210" fill="white"/><text x="12" y="25" font-family="Arial" font-size="14" fill="#243447">${fixture.title}</text><rect x="50" y="60" width="100" height="100" fill="#e2e8f0"/><g clip-path="url(#viewport)"><g${fixture.circleClip ? ' clip-path="url(#circle)"' : ''}><image href="${assetURI}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none" opacity="${fixture.opacity ?? 1}"/></g></g></svg>`;
}
