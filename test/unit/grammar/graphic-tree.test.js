import assert from "node:assert/strict";
import test from "node:test";

import {
  findGraphic,
  findGraphicParent,
  graphicSiblings,
  walkGraphicDrawOrder
} from "../../../src/grammar/schemas/graphicTree.js";
import {
  resolveConcreteGraphicBounds,
  unionConcreteGraphicBounds
} from "../../../src/grammar/schemas/graphicBounds.js";
import { buildAnnularSectorCommands } from
  "../../../src/grammar/polarPaths.js";

function tree() {
  return {
    objects: {
      canvas: { type: "canvas", properties: {}, children: ["plot"] },
      plot: { type: "collection", items: [], children: ["points", "path"] },
      points: {
        type: "circle",
        items: [
          { id: "points:0", properties: { x: 10, y: 20, radius: 3, strokeWidth: 2 } },
          { id: "points:1", properties: { x: 30, y: 40, radius: 4 } }
        ]
      },
      path: {
        type: "path",
        properties: {
          commands: [{ op: "M", x: 0, y: 5 }, { op: "L", x: 50, y: 25 }],
          strokeWidth: 2
        }
      }
    },
    order: ["canvas"]
  };
}

test("finds named graphics, generated items, parents, and siblings globally", () => {
  const spec = tree();
  assert.equal(findGraphic(spec, "path").kind, "object");
  assert.equal(findGraphic(spec, "points:1").ownerId, "points");
  assert.equal(findGraphicParent(spec, "points").id, "plot");
  assert.equal(findGraphicParent(spec, "points:0").id, "points");
  assert.deepEqual(graphicSiblings(spec, "path"), ["points", "path"]);
});

test("walks attached named graphics in deterministic depth-first order", () => {
  const ids = [];
  walkGraphicDrawOrder(tree(), ({ id }) => ids.push(id));
  assert.deepEqual(ids, ["canvas", "plot", "points", "path"]);
});

test("resolves item, path, and subtree bounds through one shared policy", () => {
  const spec = tree();
  assert.deepEqual(resolveConcreteGraphicBounds(spec, "points:0"), {
    left: 6,
    right: 14,
    top: 16,
    bottom: 24
  });
  assert.deepEqual(resolveConcreteGraphicBounds(spec, "path"), {
    left: -1,
    right: 51,
    top: 4,
    bottom: 26
  });
  assert.deepEqual(unionConcreteGraphicBounds(spec, ["points", "path"]), {
    left: -1,
    right: 51,
    top: 4,
    bottom: 44
  });
});

test("includes every nested Canvas translation in concrete bounds", () => {
  const spec = {
    objects: {
      root: { type: "canvas", properties: {}, children: ["panel"] },
      panel: {
        type: "canvas",
        properties: { x: 120, y: 30, width: 100, height: 80 },
        children: ["dot"]
      },
      dot: {
        type: "circle",
        properties: { x: 90, y: 20, radius: 2 }
      }
    },
    order: ["root"]
  };

  assert.deepEqual(resolveConcreteGraphicBounds(spec, "dot"), {
    left: 208,
    right: 212,
    top: 48,
    bottom: 52
  });
  assert.deepEqual(resolveConcreteGraphicBounds(spec, "root"), {
    left: 208,
    right: 212,
    top: 48,
    bottom: 52
  });
});

test("uses exact cubic extrema instead of conservative control-point bounds", () => {
  const spec = {
    objects: {
      curve: {
        type: "path",
        properties: {
          commands: [
            { op: "M", x: 0, y: 0 },
            {
              op: "C",
              x1: 100,
              y1: 100,
              x2: 100,
              y2: -100,
              x: 0,
              y: 0
            }
          ]
        }
      }
    },
    order: ["curve"]
  };
  const bounds = resolveConcreteGraphicBounds(spec, "curve");

  assert.equal(bounds.left, 0);
  assert.equal(bounds.right, 75);
  assert.equal(Math.abs(bounds.top + 28.867513459481287) < 1e-12, true);
  assert.equal(Math.abs(bounds.bottom - 28.867513459481287) < 1e-12, true);
});

test("measures cubic Polar sectors at their actual occupied bounds", () => {
  const spec = {
    objects: {
      sector: {
        type: "path",
        properties: {
          commands: buildAnnularSectorCommands({
            frame: { centerX: 100, centerY: 80, availableRadius: 50 },
            startTheta: 0,
            endTheta: 90,
            outerRadius: 40
          })
        }
      }
    },
    order: ["sector"]
  };
  const bounds = resolveConcreteGraphicBounds(spec, "sector");

  assert.equal(Math.abs(bounds.left - 100) < 1e-12, true);
  assert.equal(Math.abs(bounds.right - 140) < 1e-12, true);
  assert.equal(Math.abs(bounds.top - 40) < 1e-12, true);
  assert.equal(Math.abs(bounds.bottom - 80) < 1e-12, true);
});

test("rejects cycles, duplicate attachment, and orphaned named graphics", () => {
  const cycle = tree();
  cycle.objects.path.children = ["plot"];
  assert.throws(() => walkGraphicDrawOrder(cycle, () => {}), /cycle/);

  const duplicate = tree();
  duplicate.order.push("path");
  assert.throws(() => walkGraphicDrawOrder(duplicate, () => {}), /more than once/);

  const orphan = tree();
  orphan.objects.orphan = { type: "rect", properties: {} };
  assert.throws(() => walkGraphicDrawOrder(orphan, () => {}), /not attached/);
});
