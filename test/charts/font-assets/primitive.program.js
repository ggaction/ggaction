import { chart } from "../../../src/index.js";
import { fonts } from "../../../examples/font-assets/fonts/manifest.js";
import { loadFont } from "../../../examples/font-assets/host.js";

const values = await Promise.all(fonts.map(async font => {
  const { bytes } = await loadFont({ uri: new URL(`../../../examples/font-assets/fonts/${font.file}`, import.meta.url).href, mimeType: font.mimeType });
  let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
  return { contentHash: font.sha256, mimeType: font.mimeType, family: font.family, style: "normal", weight: 400,
    metricsProviderVersion: "example-canvas@1", byteLength: bytes.length, payload: { encoding: "base64", data: btoa(binary) } };
}));
const korean = { x: 40, fill: "#17324d", fontSize: 28, fontFamily: fonts[0].family, fontWeight: 400,
  textAlign: "left", textBaseline: "middle", rotation: 0, font: values[0] };
export function createFontPrimitive() {
  return chart().createCanvas({ width: 440, height: 220, margin: { top: 170, right: 40, bottom: 20, left: 40 } })
    .createGraphics({ id: "chartTitle", type: "text", parent: "canvas", length: 3 })
    .editGraphics({ target: "chartTitle", property: "items", value: [
      { type: "text", properties: { ...korean, y: 30, text: "한글 글꼴과 긴" } },
      { type: "text", properties: { ...korean, y: 63.6, text: "이름" } },
      { type: "text", properties: { ...korean, y: 97.2, text: "e\u0301 A B" } }
    ] })
    .createGraphics({ id: "chartSubtitle", type: "text", parent: "canvas" })
    .editGraphics({ target: "chartSubtitle", property: "x", value: 40 })
    .editGraphics({ target: "chartSubtitle", property: "y", value: 131.2 })
    .editGraphics({ target: "chartSubtitle", property: "text", value: "👩‍🔬 🙂 🇩🇰" })
    .editGraphics({ target: "chartSubtitle", property: "fill", value: "#155e75" })
    .editGraphics({ target: "chartSubtitle", property: "fontSize", value: 24 })
    .editGraphics({ target: "chartSubtitle", property: "fontFamily", value: fonts[1].family })
    .editGraphics({ target: "chartSubtitle", property: "fontWeight", value: 400 })
    .editGraphics({ target: "chartSubtitle", property: "textAlign", value: "left" })
    .editGraphics({ target: "chartSubtitle", property: "textBaseline", value: "middle" })
    .editGraphics({ target: "chartSubtitle", property: "font", value: values[1] });
}
