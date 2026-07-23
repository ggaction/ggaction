import assert from "node:assert/strict";
import test from "node:test";

import { renderToSVG } from "../../../src/renderers/svg.js";

function completeGraphicSpec() {
  return {
    objects: {
      canvas: {
        type: "canvas",
        properties: {
          width: 160,
          height: 120,
          background: "white"
        },
        children: ["plot"]
      },
      plot: {
        type: "collection",
        items: [
          {
            id: "plot:rect",
            type: "rect",
            properties: {
              x: 10,
              y: 12,
              width: 60,
              height: 36,
              fill: {
                type: "linear-gradient",
                from: { x: 0, y: 0.5 },
                to: { x: 1, y: 0.5 },
                stops: [
                  { offset: 0, color: "rgba(10, 20, 30, 0)" },
                  { offset: 1, color: "#123456" }
                ]
              },
              stroke: "#222222",
              strokeWidth: 1,
              opacity: 0.75
            }
          },
          {
            id: "plot:circle",
            type: "circle",
            properties: {
              x: 30,
              y: 40,
              radius: 5,
              fill: "orange",
              stroke: "black",
              strokeWidth: 2
            }
          },
          {
            id: "plot:line",
            type: "line",
            properties: {
              x1: 5,
              y1: 70,
              x2: 90,
              y2: 70,
              stroke: "purple",
              strokeWidth: 3,
              strokeDash: [4, 2]
            }
          },
          {
            id: "plot:path",
            type: "path",
            properties: {
              commands: [
                { op: "M", x: 80, y: 20 },
                { op: "C", x1: 90, y1: 10, x2: 100, y2: 30, x: 110, y: 20 },
                { op: "L", x: 110, y: 50 },
                { op: "Z" }
              ],
              fill: "#abcdef",
              stroke: "#123456",
              strokeWidth: 1
            }
          },
          {
            id: "plot:text",
            type: "text",
            properties: {
              x: 80,
              y: 90,
              text: "A < B & C",
              fill: "#111111",
              fontFamily: "Arial",
              fontSize: 12,
              fontWeight: 600,
              textAlign: "center",
              textBaseline: "middle",
              rotation: Math.PI / 4
            }
          }
        ]
      }
    },
    order: ["canvas"]
  };
}

test("serializes the complete concrete primitive surface deterministically", () => {
  const program = { graphicSpec: completeGraphicSpec() };
  const options = {
    title: "A < chart",
    description: "One & two"
  };
  const first = renderToSVG(program, options);
  const second = renderToSVG(program, options);

  assert.equal(second, first);
  assert.match(
    first,
    /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="160" height="120" viewBox="0 0 160 120">/
  );
  assert.match(first, /<title>A &lt; chart<\/title><desc>One &amp; two<\/desc>/);
  assert.match(
    first,
    /<linearGradient id="ggaction-gradient-1" gradientUnits="userSpaceOnUse" x1="10" y1="30" x2="70" y2="30">/
  );
  assert.match(first, /<rect x="10" y="12" width="60" height="36"/);
  assert.match(first, /<circle cx="30" cy="40" r="5"/);
  assert.match(first, /stroke-dasharray="4 2"/);
  assert.match(first, /d="M80 20 C90 10 100 30 110 20 L110 50 Z"/);
  assert.match(first, /font-weight="600"/);
  assert.match(first, /transform="rotate\(45 80 90\)"/);
  assert.match(first, />A &lt; B &amp; C<\/text>/);

  const rectIndex = first.indexOf("<rect x=\"10\"");
  const circleIndex = first.indexOf("<circle");
  const lineIndex = first.indexOf("<line x1=");
  const pathIndex = first.indexOf("<path");
  const textIndex = first.indexOf("<text");
  assert.equal(
    rectIndex < circleIndex &&
    circleIndex < lineIndex &&
    lineIndex < pathIndex &&
    pathIndex < textIndex,
    true
  );
});

test("normalizes numeric font weights consistently with Canvas-compatible targets", () => {
  const graphicSpec = completeGraphicSpec();
  graphicSpec.objects.plot.items.find(
    item => item.id === "plot:text"
  ).properties.fontWeight = 650;

  const svg = renderToSVG({ graphicSpec });

  assert.match(svg, /font-weight="700"/);
  assert.doesNotMatch(svg, /font-weight="650"/);
});

test("serializes nested Canvas translation, clipping, and local background", () => {
  const graphicSpec = {
    objects: {
      canvas: {
        type: "canvas",
        properties: { width: 200, height: 140 },
        children: ["panel"]
      },
      panel: {
        type: "canvas",
        properties: {
          x: 20,
          y: 30,
          width: 80,
          height: 60,
          background: "#f8fafc"
        },
        children: ["point"]
      },
      point: {
        type: "circle",
        properties: { x: 10, y: 12, radius: 4, fill: "red" }
      }
    },
    order: ["canvas"]
  };

  const svg = renderToSVG({ graphicSpec });

  assert.match(
    svg,
    /<clipPath id="ggaction-clip-1"><rect x="0" y="0" width="80" height="60"\/><\/clipPath>/
  );
  assert.match(
    svg,
    /<g transform="translate\(20 30\)" clip-path="url\(#ggaction-clip-1\)">/
  );
  assert.match(
    svg,
    /<rect x="0" y="0" width="80" height="60" fill="#f8fafc"\/><circle/
  );
  assert.match(svg, /<\/circle>|<circle[^>]*\/>/);
  assert.match(svg, /<\/g><\/svg>$/);
});

test("does not read semantic, context, or trace state", () => {
  const graphicSpec = completeGraphicSpec();
  const throwingState = new Proxy({}, {
    get() {
      throw new Error("SVG renderer read forbidden program state.");
    }
  });
  const program = {
    graphicSpec,
    semanticSpec: throwingState,
    context: throwingState,
    trace: throwingState
  };

  assert.doesNotThrow(() => renderToSVG(program));
});

test("rejects invalid options and incomplete concrete graphics", () => {
  assert.throws(
    () => renderToSVG({ graphicSpec: completeGraphicSpec() }, null),
    /options must be a plain object/
  );
  assert.throws(
    () => renderToSVG(
      { graphicSpec: completeGraphicSpec() },
      { title: "" }
    ),
    /title must be a non-empty string/
  );
  assert.throws(
    () => renderToSVG(
      { graphicSpec: completeGraphicSpec() },
      { pixelRatio: 2 }
    ),
    /does not support option "pixelRatio"/
  );
  assert.throws(
    () => renderToSVG({}),
    /requires a program with a graphicSpec/
  );

  const unsupported = completeGraphicSpec();
  unsupported.objects.plot.items.push({
    id: "plot:image",
    type: "image",
    properties: {}
  });
  assert.throws(
    () => renderToSVG({ graphicSpec: unsupported }),
    /does not support "image" yet/
  );
});
