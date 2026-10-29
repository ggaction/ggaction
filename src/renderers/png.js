import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { renderCanvasProgram } from "./canvas/index.js";
import { validateRendererOptions } from "./options.js";
import { loadNativeBackend, nativeFontResolver, prepareNativeImages, prepareNativeFonts, prepareNativeShadows } from "./nativeBackend.js";

const PNG_OPTIONS = new Set(["output", "pixelRatio"]);
const BUFFER_OPTIONS = new Set(["pixelRatio"]);

export async function renderToPNGBuffer(program, options = {}) {
  validateRendererOptions(options, BUFFER_OPTIONS, "renderToPNGBuffer options");
  const { pixelRatio = 1 } = options;
  const { createCanvas, GlobalFonts, loadImage } = await loadNativeBackend();
  const images = await prepareNativeImages(program, loadImage);
  const fonts = await prepareNativeFonts(program, GlobalFonts);
  const canvas = createCanvas(1, 1);
  let shadows;
  try {
    shadows = await prepareNativeShadows(program, { createCanvas, loadImage, fonts, pixelRatio });
    renderCanvasProgram(program, canvas.getContext("2d"), { pixelRatio, images, fonts, shadows }, createCanvas,
      { resolveFontFamily: nativeFontResolver(GlobalFonts) });
  } finally { shadows?.dispose(); fonts.dispose(); }
  // Canvas drawing is synchronous; encoding uses the native async worker.
  const buffer = await canvas.encode("png");
  return Object.freeze({
    buffer, width: canvas.width, height: canvas.height, pixelRatio, bytes: buffer.length
  });
}

export async function renderToPNG(program, options = {}) {
  validateRendererOptions(options, PNG_OPTIONS, "renderToPNG options");
  const { output, pixelRatio } = options;
  if (typeof output !== "string" || output.length === 0) {
    throw new TypeError("renderToPNG requires a non-empty output path.");
  }
  const { buffer, ...result } = await renderToPNGBuffer(program, { pixelRatio });
  const path = resolve(output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);
  return Object.freeze({ output: path, ...result });
}
