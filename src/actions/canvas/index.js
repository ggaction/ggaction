import { createBasicCanvas, createCanvas, editCanvas } from "./actions.js";
import { fitCanvas } from "./fitting.js";

export function registerCanvasActions(ProgramClass) {
  ProgramClass.prototype.editCanvas = editCanvas;
  ProgramClass.prototype.createCanvas = createCanvas;
  ProgramClass.prototype.fitCanvas = fitCanvas;
}

export function registerBasicCanvasActions(ProgramClass) {
  ProgramClass.prototype.createCanvas = createBasicCanvas;
}
