import { fileURLToPath as consumerPath } from "node:url";
import assert from "node:assert/strict";
import { chart, hconcat, render, vconcat } from "ggaction";
import { chart as basicChart, render as basicRender } from "ggaction/basic";
import { action, ChartProgram, registerExtension } from "ggaction/extension";
import { renderToPDF, renderToPDFBuffer } from "ggaction/pdf";
import { renderToPNG, renderToPNGBuffer } from "ggaction/png";
import { renderToSVG } from "ggaction/svg";
import { createTransitionScene, renderTransitionScene } from "ggaction/scene";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { exportAccessibleData } from "ggaction/accessibility";
import { comparePrograms, describeAction, getDatasetSchema, inspectProgram } from "ggaction/inspection";
import {createFacetSharedTopLaneProgram} from "./facet-lane-public.js";
import {createPlotUnderlayProgram} from "./plot-underlay-public.js";

import { createCompoundPathExample } from "./compound-path/program.js";
import { variants } from "./compound-path/data.js";
import { createCanvas } from "@napi-rs/canvas";

export const cases = [
  { id: "extension/compound-path", async run() {
    for (const variant of variants) {
      const program = createCompoundPathExample(variant);
      const restored = deserializeProgram(serializeProgram(program));
      assert.deepEqual(restored.graphicSpec, program.graphicSpec);
      assert.deepEqual(deserializeGraphic(serializeGraphic(program)).graphicSpec, program.graphicSpec);
      assert.match(renderToSVG(restored), variant.kind === "clip" ? /clip-rule="evenodd"/ : /fill-rule=/);
      const canvas = createCanvas(1, 1), context = canvas.getContext("2d");
      render(restored, context);
      const expected = context.getImageData(0,0,canvas.width,canvas.height).data;
      renderTransitionScene(JSON.parse(JSON.stringify(createTransitionScene(restored,{format:"canvas"}))), context);
      assert.deepEqual(context.getImageData(0,0,canvas.width,canvas.height).data, expected);
      assert.ok((await renderToPNGBuffer(restored)).bytes > 0);
      assert.equal((await renderToPDFBuffer(restored)).pages, 1);
      assert.equal(restored.editGraphics({target:"shape",remove:true}).graphicSpec.objects.shape, undefined);
    }
  } },
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
