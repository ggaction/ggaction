import { chart, prepareImageResource } from "../../src/index.js";
import { frame, viewport, fixtures, imageClip, assetSVG, assetHash } from "./data.js";
import { decodeImage } from "./host.js";
const base = chart().createCanvas({ width: frame.width, height: frame.height, margin: 0 });
const requestToken = "example-image";
const prepared = await prepareImageResource(base, {
  kind: "create", id: "logo", uri: "fixture:quadrants", expectedHash: assetHash, mimeType: "image/svg+xml"
}, { requestToken, load: () => ({ bytes: new TextEncoder().encode(assetSVG), mimeType: "image/svg+xml" }),
  decode: async request => { const { width, height, originClean } = await decodeImage(request); return { width, height, originClean }; } });

export function createImageExample(fixture = fixtures[0]) {
  return base.createImageResource({ prepared, requestToken })
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
    .createImageMark({ image: "logo", viewport, fit: fixture.fit, align: fixture.align,
      opacity: fixture.opacity ?? 1, clip: fixture.circleClip ? imageClip : false,
      alt: "Four colored quadrants with a white center" });
}
