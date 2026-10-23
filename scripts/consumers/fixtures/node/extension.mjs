import { fileURLToPath as consumerPath } from "node:url";
import assert from "node:assert/strict";
import { chart, hconcat, render, vconcat } from "ggaction";
import { chart as basicChart, render as basicRender } from "ggaction/basic";
import { action, ChartProgram, registerExtension } from "ggaction/extension";
import { renderToPDF, renderToPDFBuffer } from "ggaction/pdf";
import { renderToPNG, renderToPNGBuffer } from "ggaction/png";
import { renderToSVG } from "ggaction/svg";
import { createTransitionScene } from "ggaction/scene";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { exportAccessibleData } from "ggaction/accessibility";
import { comparePrograms, describeAction, getDatasetSchema, inspectProgram } from "ggaction/inspection";
import {createFacetSharedTopLaneProgram} from "./facet-lane-public.js";
import {createPlotUnderlayProgram} from "./plot-underlay-public.js";

export const cases = [
  { id: "extension/passthrough", async run() {
const passthrough = action(
      { op: "passthrough", description: "Return one extension program." },
      function () { return this; }
    );
const finish = action(
      { op: "finish", description: "Chain a second extension action." },
      function () { return this; }
    );
registerExtension({
      name: "ggaction-package-consumer-extension",
      actions: { passthrough, finish }
    });
const extensionResult = chart().passthrough().finish();
assert.equal(extensionResult instanceof ChartProgram, true);
assert.deepEqual(
      extensionResult.trace.children.map(node => node.op),
      ["passthrough", "finish"]
    );
assert.deepEqual(extensionResult.actionStack, []);

assert.equal(basicChart().passthrough, undefined);

  } }
];
