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

function nestedGraphicSpec() {
  return {
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
}

function resourceGraphicSpec() {
  return {
    objects: {
      canvas: {
        type: "canvas",
        properties: { width: 10, height: 10 }
      },
      rect: {
        type: "rect",
        properties: {
          x: 0,
          y: 0,
          width: 10,
          height: 10,
          fill: {
            type: "linear-gradient",
            from: { x: 0, y: 0 },
            to: { x: 1, y: 0 },
            stops: [
              { offset: 0, color: "red" },
              { offset: 1, color: "blue" }
            ]
          },
          stroke: "none",
          strokeWidth: 0
        }
      }
    },
    order: ["canvas", "rect"]
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
    /<linearGradient id="ggaction-gradient-[a-z0-9]+-1" gradientUnits="userSpaceOnUse" x1="10" y1="30" x2="70" y2="30">/
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
  const graphicSpec = nestedGraphicSpec();

  const svg = renderToSVG({ graphicSpec });

  assert.match(
    svg,
    /<clipPath id="ggaction-clip-[a-z0-9]+-1"><rect x="0" y="0" width="80" height="60"\/><\/clipPath>/
  );
  assert.match(
    svg,
    /<g transform="translate\(20 30\)" clip-path="url\(#ggaction-clip-[a-z0-9]+-1\)">/
  );
  assert.match(
    svg,
    /<rect x="0" y="0" width="80" height="60" fill="#f8fafc"\/><circle/
  );
  assert.match(svg, /<\/circle>|<circle[^>]*\/>/);
  assert.match(svg, /<\/g><\/svg>$/);
});

test("namespaces resource ids across distinct inline SVG documents", () => {
  const firstGradient = completeGraphicSpec();
  const secondGradient = completeGraphicSpec();
  secondGradient.objects.plot.items[0].properties.fill.stops[1].color = "#abcdef";
  const firstGradientSVG = renderToSVG({ graphicSpec: firstGradient });
  const secondGradientSVG = renderToSVG({ graphicSpec: secondGradient });
  const firstGradientId = /<linearGradient id="([^"]+)"/u.exec(
    firstGradientSVG
  )[1];
  const secondGradientId = /<linearGradient id="([^"]+)"/u.exec(
    secondGradientSVG
  )[1];

  assert.notEqual(firstGradientId, secondGradientId);
  assert.ok(firstGradientSVG.includes(`fill="url(#${firstGradientId})"`));
  assert.ok(secondGradientSVG.includes(`fill="url(#${secondGradientId})"`));

  const firstClip = nestedGraphicSpec();
  const secondClip = nestedGraphicSpec();
  secondClip.objects.panel.properties.width = 90;
  const firstClipSVG = renderToSVG({ graphicSpec: firstClip });
  const secondClipSVG = renderToSVG({ graphicSpec: secondClip });
  const firstClipId = /<clipPath id="([^"]+)"/u.exec(firstClipSVG)[1];
  const secondClipId = /<clipPath id="([^"]+)"/u.exec(secondClipSVG)[1];

  assert.notEqual(firstClipId, secondClipId);
  assert.ok(firstClipSVG.includes(`clip-path="url(#${firstClipId})"`));
  assert.ok(secondClipSVG.includes(`clip-path="url(#${secondClipId})"`));
});

test("accepts explicit resource namespaces without changing the default hash", () => {
  const graphicSpec = resourceGraphicSpec();
  const defaultSVG = renderToSVG({ graphicSpec });
  const first = renderToSVG(
    { graphicSpec },
    { resourceNamespace: "Chart_A-1" }
  );
  const second = renderToSVG(
    { graphicSpec },
    { resourceNamespace: "Chart_B-2" }
  );

  assert.ok(defaultSVG.includes("ggaction-gradient-2a52g6v0sz4a4-1"));
  assert.ok(first.includes('id="ggaction-gradient-Chart_A-1-1"'));
  assert.ok(first.includes('fill="url(#ggaction-gradient-Chart_A-1-1)"'));
  assert.ok(second.includes('id="ggaction-gradient-Chart_B-2-1"'));
  assert.ok(second.includes('fill="url(#ggaction-gradient-Chart_B-2-1)"'));

  const clip = renderToSVG(
    { graphicSpec: nestedGraphicSpec() },
    { resourceNamespace: "Nested_1" }
  );
  assert.ok(clip.includes('id="ggaction-clip-Nested_1-1"'));
  assert.ok(clip.includes('clip-path="url(#ggaction-clip-Nested_1-1)"'));
});

test("preserves finite logical dimensions without applying raster limits", () => {
  const graphicSpec = completeGraphicSpec();
  graphicSpec.objects.canvas.properties.width = Number.MAX_VALUE;

  const svg = renderToSVG({ graphicSpec });

  assert.ok(svg.includes(`width="${Number.MAX_VALUE}"`));
  assert.ok(svg.includes(`viewBox="0 0 ${Number.MAX_VALUE} 120"`));
});

test("preserves extreme finite gradient and primitive geometry", () => {
  const graphicSpec = resourceGraphicSpec();
  graphicSpec.objects.rect.properties.x = -Number.MAX_VALUE;
  graphicSpec.objects.rect.properties.width = Number.MAX_VALUE;

  const svg = renderToSVG({ graphicSpec });

  assert.ok(svg.includes(`x1="${-Number.MAX_VALUE}"`));
  assert.ok(svg.includes('x2="0"'));
  assert.ok(svg.includes(`x="${-Number.MAX_VALUE}"`));
});

test("rejects XML-forbidden scalars across content and attributes", () => {
  for (const value of ["A\u0000B", "A\ud800B", "A\ufffeB", "A\uffffB"]) {
    const graphicSpec = completeGraphicSpec();
    graphicSpec.objects.plot.items.find(
      item => item.id === "plot:text"
    ).properties.text = value;
    const snapshot = structuredClone(graphicSpec);

    assert.throws(
      () => renderToSVG({ graphicSpec }),
      /XML 1\.0-compatible strings/
    );
    assert.deepEqual(graphicSpec, snapshot);
  }

  for (const options of [
    { title: "invalid\u0001title" },
    { description: "invalid\u0001description" }
  ]) {
    assert.throws(
      () => renderToSVG({ graphicSpec: completeGraphicSpec() }, options),
      /XML 1\.0-compatible strings/
    );
  }
  const attribute = completeGraphicSpec();
  attribute.objects.plot.items.find(
    item => item.id === "plot:text"
  ).properties.fontFamily = "invalid\u0002font";
  assert.throws(
    () => renderToSVG({ graphicSpec: attribute }),
    /XML 1\.0-compatible strings/
  );
});

test("preserves valid emoji, joiners, variation selectors, and RTL text", () => {
  const graphicSpec = completeGraphicSpec();
  const text = "مرحبا 👩🏽‍💻️";
  graphicSpec.objects.plot.items.find(
    item => item.id === "plot:text"
  ).properties.text = text;

  const svg = renderToSVG(
    { graphicSpec },
    { title: `Chart ${text}`, description: `Description ${text}` }
  );

  assert.ok(svg.includes(`>${text}</text>`));
  assert.ok(svg.includes(`<title>Chart ${text}</title>`));
  assert.ok(svg.includes(`<desc>Description ${text}</desc>`));
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
  for (const resourceNamespace of [
    "",
    "1chart",
    "chart space",
    "chart:one",
    "échart"
  ]) {
    assert.throws(
      () => renderToSVG(
        { graphicSpec: completeGraphicSpec() },
        { resourceNamespace }
      ),
      /resourceNamespace must (?:be a non-empty string|start with a letter)/
    );
  }
  assert.throws(
    () => renderToSVG(
      { graphicSpec: completeGraphicSpec() },
      { resourceNamespace: 1 }
    ),
    /resourceNamespace must be a non-empty string/
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
