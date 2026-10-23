import assert from "node:assert/strict";
import test from "node:test";

import {
  assertGraphicIntegrity,
  inspectGraphicIntegrity
} from "../../oracles/graphic-integrity.js";
import { assertSvgIntegrity } from "../../oracles/svg-integrity.js";

function program(objects, order = ["canvas"]) {
  return { graphicSpec: { objects, order } };
}

test("accepts a finite, attached graphic tree and reports literal metrics", () => {
  const value = program({
    canvas: {
      type: "canvas",
      properties: { width: 100, height: 80 },
      children: ["marks"]
    },
    marks: {
      type: "circle",
      items: [{ id: "marks:0", properties: { x: 10, y: 20, radius: 3 } }]
    }
  });
  assert.deepEqual(assertGraphicIntegrity(value), {
    objectCount: 2,
    itemCount: 1,
    numberCount: 5
  });
});

test("independently rejects non-finite geometry, negative sizes, and broken trees", () => {
  const report = inspectGraphicIntegrity(program({
    canvas: {
      type: "canvas",
      properties: { width: 100, height: -1 },
      children: ["marks", "missing"]
    },
    marks: {
      type: "circle",
      items: [{ id: "marks", properties: { x: Number.NaN, y: 20, radius: -3 } }],
      children: ["canvas"]
    },
    orphan: { type: "line", properties: { x1: 0, y1: 0, x2: 1, y2: 1 } }
  }));
  assert.equal(report.issues.some(issue => issue.includes("height is negative")), true);
  assert.equal(report.issues.some(issue => issue.includes("x is not finite")), true);
  assert.equal(report.issues.some(issue => issue.includes("radius is negative")), true);
  assert.equal(report.issues.some(issue => issue.includes("missing child")), true);
  assert.equal(report.issues.some(issue => issue.includes("attachment cycle")), true);
  assert.equal(report.issues.some(issue => issue.includes("unreachable")), true);
  assert.equal(report.issues.some(issue => issue.includes("not globally unique")), true);
});

test("rejects missing primitive geometry, invalid paths, and non-tree attachments", () => {
  const report = inspectGraphicIntegrity(program({
    canvas: {
      type: "canvas",
      properties: { width: 100, height: 80 },
      children: ["marks", "marks", "rootAgain"]
    },
    marks: {
      type: "collection",
      items: [
        { id: "missing-x", type: "circle", properties: { y: 2, radius: 1 } },
        {
          id: "bad-path",
          type: "path",
          properties: { commands: [{ op: "Q", x: 1, y: 2 }], opacity: 2 }
        }
      ]
    },
    rootAgain: {
      type: "canvas",
      properties: { width: 20, height: 20 }
    }
  }, ["canvas", "rootAgain"]));

  assert.equal(report.issues.some(issue => issue.includes("repeats a child")), true);
  assert.equal(report.issues.some(issue => issue.includes("properties.x is required")), true);
  assert.equal(report.issues.some(issue => issue.includes("must start with M")), true);
  assert.equal(report.issues.some(issue => issue.includes("unknown operation")), true);
  assert.equal(report.issues.some(issue => issue.includes("opacity must be between")), true);
  assert.equal(report.issues.some(issue => issue.includes("root \"rootAgain\" is also attached")), true);
});

test("SVG integrity distinguishes legitimate text from invalid attributes", () => {
  assert.doesNotThrow(() => assertSvgIntegrity(
    '<svg id="undefined"><text id="Infinity">NaN Infinity undefined</text></svg>',
    "nominal text"
  ));
  assert.throws(() => assertSvgIntegrity(
    '<svg><circle id="mark" cx="NaN" cy="0" r="1" /></svg>',
    "invalid geometry"
  ));
  assert.throws(() => assertSvgIntegrity(
    '<svg><defs><clipPath id="clip" /></defs><rect id="mark" ' +
      'clip-path="url(#missing)" /></svg>',
    "dangling resource"
  ));
  assert.throws(() => assertSvgIntegrity(
    '<svg><path id="mark" d="M 0 0 L Infinity 1" /></svg>',
    "invalid path"
  ));
  assert.throws(() => assertSvgIntegrity(
    '<svg><use id="mark" href="#missing" /></svg>',
    "dangling href"
  ));
  assert.throws(() => assertSvgIntegrity(
    '<svg><text id="label">not closed</text>',
    "unclosed root"
  ));
});

test("rejects wrong geometry types without crashing on malformed containers", () => {
  for (const x of [null, "broken", false, {}, []]) {
    const value = program({ canvas: {type: "canvas", properties: {width:100,height:100}, children:["point"]},
      point: {type:"circle",properties:{x,y:10,radius:2}} });
    assert.ok(inspectGraphicIntegrity(value).issues.some(issue => issue.includes(".x must be finite")));
  }
  assert.ok(inspectGraphicIntegrity(program({canvas:{type:"canvas",properties:{width:100,height:100},children:42}})).issues.length);
});

test("rejects malformed XML and invalid geometry regardless of quote style", () => {
 for (const svg of ['<svg><g></svg>', '<svg><circle cx="broken" /></svg>', "<svg><circle cx='NaN'/></svg>", '<svg><circle cx="null"/></svg>']) {
  assert.throws(() => assertSvgIntegrity(svg));
 }
 assert.doesNotThrow(() => assertSvgIntegrity('<svg><text>NaN &amp; Infinity</text><circle cx="1e2" cy="2" r="1"/></svg>'));
});
