import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { PDFDocument } from "@napi-rs/canvas";

import {
  drawResolvedGraphicSpec,
  requireProgramGraphicSpec,
  resolveGraphicRenderTarget
} from "./canvas/index.js";

const PDF_OPTIONS = new Set(["output", "metadata"]);
const PDF_METADATA = new Set([
  "title",
  "author",
  "subject",
  "keywords"
]);

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  return value;
}

function requireClosedKeys(value, allowed, label) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new TypeError(`${label} does not support option "${key}".`);
    }
  }
}

function requireMetadata(metadata) {
  if (metadata === undefined) return undefined;
  requirePlainObject(metadata, "renderToPDF metadata");
  requireClosedKeys(metadata, PDF_METADATA, "renderToPDF metadata");

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

function requirePDFOptions(options) {
  requirePlainObject(options, "renderToPDF options");
  requireClosedKeys(options, PDF_OPTIONS, "renderToPDF");
  if (typeof options.output !== "string" || options.output.length === 0) {
    throw new TypeError("renderToPDF requires a non-empty output path.");
  }
  return {
    output: resolve(options.output),
    metadata: requireMetadata(options.metadata)
  };
}

function renderPDFBuffer(target, metadata) {
  const document = new PDFDocument(metadata);
  const context = document.beginPage(target.width, target.height);
  drawResolvedGraphicSpec(target, context);
  document.endPage();
  return document.close();
}

export async function renderToPDF(program, options = {}) {
  const { output, metadata } = requirePDFOptions(options);
  const graphicSpec = requireProgramGraphicSpec(program);
  const target = resolveGraphicRenderTarget(graphicSpec);
  const buffer = renderPDFBuffer(target, metadata);

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, buffer);

  return Object.freeze({
    output,
    width: target.width,
    height: target.height,
    pages: 1,
    bytes: buffer.length
  });
}
