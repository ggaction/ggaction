import { chart, prepareFontResource, prepareTextMetrics } from "ggaction";
import { fonts } from "./fonts/manifest.js";
import { loadFont, decodeFont, measureFont } from "./host.js";

export const frame = Object.freeze({ width: 440, height: 220 });
export const titleText = "한글 글꼴과 긴 이름\ne\u0301 A B";
export const subtitleText = "👩‍🔬 🙂 🇩🇰";
const requestToken = "example-fonts";
let program = chart().createCanvas({ ...frame, margin: { top: 170, right: 40, bottom: 20, left: 40 } })
  .createTitle({ text: titleText, subtitle: subtitleText, align: "left", maxWidth: 180, wrap: "word",
    titleStyle: { fontFamily: fonts[0].family, fontSize: 28, fontWeight: 400, color: "#17324d" },
    subtitleStyle: { fontFamily: fonts[1].family, fontSize: 24, fontWeight: 400, color: "#155e75" } });
for (const font of fonts) {
  const prepared = await prepareFontResource(program, { kind: "create", id: font.file.split(".")[0], uri: new URL(`./fonts/${font.file}`, import.meta.url).href,
    mimeType: font.mimeType, expectedHash: font.sha256, family: font.family, style: "normal", weight: 400,
    metricsProviderVersion: "example-canvas@1", license: "OFL-1.1" },
  { requestToken, load: loadFont, decode: decodeFont });
  program = program.createFontResource({ prepared, requestToken });
}
const prepared = await prepareTextMetrics(program, { id: "example-exact-fonts", fonts: fonts.map(font => font.file.split(".")[0]) },
  { requestToken, decode: decodeFont, measure: measureFont });
program = program.applyTextMetrics({ prepared, requestToken });
export function createFontExample() { return program; }
