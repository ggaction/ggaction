import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { loadNativeBackend } from "./nativeBackend.js";

import {
  drawResolvedGraphicSpec,
  requireProgramGraphicSpec,
  resolveGraphicRenderTarget
} from "./canvas/index.js";
import { preflightCanvasGraphicSpec } from "./canvas/native.js";
import { validateRendererOptions } from "./options.js";

const PDF_OPTIONS = new Set(["output", "metadata"]);
const BUFFER_OPTIONS = new Set(["metadata"]);
const PDF_METADATA = new Set([
  "title",
  "author",
  "subject",
  "keywords"
]);
const MAX_PDF_DIMENSION = 16_777_216;

function requireMetadata(metadata) {
  if (metadata === undefined) return undefined;
  validateRendererOptions(metadata, PDF_METADATA, "renderToPDF metadata");

  const resolved = {};
  for (const key of ["title", "author", "subject"]) {
    const value = metadata[key];
    if (
      value !== undefined &&
      (typeof value !== "string" || value.length === 0)
    ) {
      throw new TypeError(
        `renderToPDF metadata ${key} must be a non-empty string.`
      );
    }
    if (value !== undefined) resolved[key] = value;
  }

  if (metadata.keywords !== undefined) {
    if (
      !Array.isArray(metadata.keywords) ||
      !metadata.keywords.every(keyword =>
        typeof keyword === "string" && keyword.length > 0
      )
    ) {
      throw new TypeError(
        "renderToPDF metadata keywords must be an array of non-empty strings."
      );
    }
    resolved.keywords = metadata.keywords.join(", ");
  }

  return resolved;
}

function requirePDFPageDimensions(target) {
  if (![target.width, target.height].every(value =>
    Number.isSafeInteger(value) && value > 0 && value <= MAX_PDF_DIMENSION
  )) {
    throw new RangeError(
      `PDF page dimensions must be positive integers no larger than ${MAX_PDF_DIMENSION}.`
    );
  }
}

export async function renderToPDFBuffer(program, options = {}) {
  validateRendererOptions(options, BUFFER_OPTIONS, "renderToPDFBuffer options");
  const metadata = requireMetadata(options.metadata);
  const graphicSpec = requireProgramGraphicSpec(program);
  const target = resolveGraphicRenderTarget(graphicSpec);
  requirePDFPageDimensions(target);
  preflightCanvasGraphicSpec(target);
  const { PDFDocument } = await loadNativeBackend();
  const document = new PDFDocument(metadata);
  const context = document.beginPage(target.width, target.height);
  drawResolvedGraphicSpec(target, context);
  document.endPage();
  const buffer = document.close();
  return Object.freeze({
    buffer, width: target.width, height: target.height, pages: 1, bytes: buffer.length
  });
}

export async function renderToPDF(program, options = {}) {
  validateRendererOptions(options, PDF_OPTIONS, "renderToPDF options");
  if (typeof options.output !== "string" || options.output.length === 0) {
    throw new TypeError("renderToPDF requires a non-empty output path.");
  }
  const { buffer, ...result } = await renderToPDFBuffer(program, { metadata: options.metadata });
  const output = resolve(options.output);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, buffer);
  return Object.freeze({ output, ...result });
}
