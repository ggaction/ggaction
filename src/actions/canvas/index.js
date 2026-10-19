import { createBasicCanvas, createCanvas, editCanvas } from "./actions.js";
import { fitCanvas } from "./fitting.js";
import { rematerializePlotBorder } from "./plotBorder.js";
import { rematerializePlotDrawOrder } from "./plotOrder.js";

export function registerCanvasActions(ProgramClass) {
  ProgramClass.prototype.editCanvas = editCanvas;
  ProgramClass.prototype.createCanvas = createCanvas;
  ProgramClass.prototype.fitCanvas = fitCanvas;
  ProgramClass.prototype.rematerializePlotBorder = rematerializePlotBorder;
  ProgramClass.prototype.rematerializePlotDrawOrder = rematerializePlotDrawOrder;
}

export function registerBasicCanvasActions(ProgramClass) {
  ProgramClass.prototype.createCanvas = createBasicCanvas;
  ProgramClass.prototype.rematerializePlotBorder = rematerializePlotBorder;
  ProgramClass.prototype.rematerializePlotDrawOrder = rematerializePlotDrawOrder;
}
