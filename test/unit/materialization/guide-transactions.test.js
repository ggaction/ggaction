import assert from "node:assert/strict";
import test from "node:test";
import { chart } from "../../../src/index.js";
import { withGuideLayoutTransaction, withPendingRelativeAxisTitle } from "../../../src/materialization/guides/layout.js";
import { hasLegendClipGraphics, resetLegendClipGraphics } from "../../../src/materialization/legendClip.js";

test("guide transactions restore caller scopes and exclude collected legend blocks from local collision checks", () => {
  const p = chart().createCanvas().createData({ values: [{ x: 1, y: 2, group: "one" }] })
    .createScatterPlot({ x: "x", y: "y", color: "group" })
    ._withContext({ pendingRelativeTitleAxis: "outer", deferGuideLayoutValidation: false,
      compositionCollectedLegends: ["color"] });
  const next = withGuideLayoutTransaction(p, candidate => withPendingRelativeAxisTitle(candidate, "inner", current => {
    assert.equal(current.context.pendingRelativeTitleAxis, "inner");
    return current;
  }));
  assert.deepEqual(next.context, p.context);
  assert.equal(p.context.pendingRelativeTitleAxis, "outer");
});

test("data-only revisions do not require a Canvas when no screen resources exist", () => {
  const p = chart().createData({ id: "observations", values: [{ value: 1 }] });
  const next = p.reviseData({ source: "observations", id: "updated", values: [{ value: 2 }] });
  assert.equal(next.semanticSpec.datasets.find(data => data.id === "updated").values[0].value, 2);
  assert.equal(next.graphicSpec.objects.canvas, undefined);
  assert.equal(p.semanticSpec.datasets.length, 1);
});

test("a responsive guide transaction restores clipped samples after an extension's temporary plain-symbol pass", () => {
  const Base = chart().constructor;
  let plain = false, calls = 0;
  class PlainSymbolPass extends Base {
    rematerializeLegend(args) {
      const next = super.rematerializeLegend(args);
      calls++;
      if (!plain) return next;
      plain = false;
      return resetLegendClipGraphics(next);
    }
  }
  const p = new PlainSymbolPass().createCanvas({ width: 800, height: 600, margin: 100, responsive: {} })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
    .createScatterPlot({ x: "x", y: "y", size: "y", guides: false })
    .createLegend({ channels: ["size"], values: [2, 3], clipHeight: 10 });
  assert.equal(hasLegendClipGraphics(p), true);
  plain = true;
  calls = 0;
  const next = p.editCanvas({ width: 900 });
  assert.ok(calls >= 2);
  assert.equal(hasLegendClipGraphics(next), true);
  assert.equal(p.graphicSpec.objects.canvas.properties.width, 800);
});
