import { chart } from "../../../src/index.js";
import { assetHash, assetSVG, imageClip } from "./fixture.js";
import { frame, viewport, assetURI } from './fixture.js';

// Independent native primitive retained as an output oracle.
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

const payload = Object.freeze({ contentHash: assetHash, mimeType: "image/svg+xml", byteLength: new TextEncoder().encode(assetSVG).length,
  width: 200, height: 100, payload: { encoding: "base64", data: btoa(assetSVG) } });
export function createImagePrimitive(fixture) {
  const [x, y, width, height] = fixture.rect;
  return chart().createCanvas({ width: frame.width, height: frame.height, margin: 0 })
    .createGraphics({ id: "label", type: "text", parent: "plot-main" })
    .editGraphics({ target: "label", property: "x", value: 12 })
    .editGraphics({ target: "label", property: "y", value: 25 })
    .editGraphics({ target: "label", property: "text", value: fixture.title })
    .editGraphics({ target: "label", property: "fontSize", value: 14 })
    .editGraphics({ target: "label", property: "fontFamily", value: "Arial" })
    .editGraphics({ target: "label", property: "fontWeight", value: "normal" })
    .editGraphics({ target: "label", property: "textAlign", value: "left" })
    .editGraphics({ target: "label", property: "textBaseline", value: "alphabetic" })
    .editGraphics({ target: "label", property: "fill", value: "#243447" })
    .createGraphics({ id: "backdrop", type: "rect", parent: "plot-main" })
    .editGraphics({ target: "backdrop", property: "x", value: 50 })
    .editGraphics({ target: "backdrop", property: "y", value: 60 })
    .editGraphics({ target: "backdrop", property: "width", value: 100 })
    .editGraphics({ target: "backdrop", property: "height", value: 100 })
    .editGraphics({ target: "backdrop", property: "fill", value: "#e2e8f0" })
    .editGraphics({ target: "backdrop", property: "stroke", value: "none" })
    .editGraphics({ target: "backdrop", property: "strokeWidth", value: 0 })
    .createGraphics({ id: "image-image-clip", type: "collection", parent: "plot-main" })
    .createGraphics({ id: "image", type: "image", length: 0, parent: "image-image-clip" })
    .editGraphics({ target: "image-image-clip", property: "clip", value: fixture.circleClip ? imageClip : false })
    .editGraphics({ target: "image", property: "clip", value: viewport })
    .editGraphics({ target: "image", property: "items", value: [{ type: "image", properties: {
      image: payload, x, y, width, height, opacity: fixture.opacity ?? 1
    } }] });
}
