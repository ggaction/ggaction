import type { ChartProgram } from "./program.js";

export interface PDFMetadata {
  readonly title?: string;
  readonly author?: string;
  readonly subject?: string;
  readonly keywords?: readonly string[];
}

export interface PDFRenderOptions {
  readonly output: string;
  readonly metadata?: PDFMetadata;
}

export interface PDFRenderResult {
  readonly output: string;
  readonly width: number;
  readonly height: number;
  readonly pages: 1;
  readonly bytes: number;
}

export function renderToPDF(
  program: Pick<ChartProgram, "graphicSpec">,
  options: PDFRenderOptions
): Promise<PDFRenderResult>;
