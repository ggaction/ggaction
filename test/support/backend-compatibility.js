export function compatibilityScene(width = 160) {
  return { graphicSpec: { objects: {
    canvas: { type: "canvas", properties: { width, height: 100, background: "white" }, children: ["panel"] },
    panel: { type: "canvas", properties: { x: 20, y: 20, width: 80, height: 40, background: "white" }, children: ["gradient", "label"] },
    gradient: { type: "rect", properties: { x: -10, y: 0, width: 100, height: 40, strokeWidth: 0, stroke: "none", fill: {
      type: "linear-gradient", from: { x: 0, y: 0 }, to: { x: 1, y: 0 },
      stops: [{ offset: 0, color: "red" }, { offset: 1, color: "blue" }]
    } } },
    label: { type: "text", properties: { x: 40, y: 20, text: "Center", fontFamily: "sans-serif", fontSize: 18,
      fontWeight: 400, textAlign: "center", textBaseline: "middle", fill: "black" } }
  }, order: ["canvas"] } };
}

export function compatibilityPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Backend compatibility</title><link rel="icon" href="data:,"></head>
<body><main><h1>Backend compatibility</h1><p id="status" role="status">Loading</p>
<canvas id="chart" aria-label="Clipped gradient with centered text"></canvas>
<div id="svg" role="img" aria-label="Clipped gradient with centered text"></div>
<a id="download" download="compatibility.svg">Download SVG</a></main>
<script type="importmap">{"imports":{"ggaction":"/node_modules/ggaction/src/index.js","ggaction/svg":"/node_modules/ggaction/src/renderers/svg.js","ggaction/persistence":"/node_modules/ggaction/src/persistence.js"}}</script>
<script type="module">
import { render } from "ggaction";
import { renderToSVG } from "ggaction/svg";
import { serializeGraphic, deserializeGraphic } from "ggaction/persistence";
const createScene = ${compatibilityScene.toString()};
function inspect(context, ratio) {
  const at = (x, y) => [...context.getImageData(Math.round(x * ratio), Math.round(y * ratio), 1, 1).data];
  let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity, count = 0;
  const width = context.canvas.width, pixels = context.getImageData(0, 0, width, context.canvas.height).data;
  for (let y = 20 * ratio; y < 60 * ratio; y++) for (let x = 20 * ratio; x < 100 * ratio; x++) {
    const index = (y * width + x) * 4;
    if (pixels[index] < 40 && pixels[index + 1] < 40 && pixels[index + 2] < 40 && pixels[index + 3] > 200) {
      left = Math.min(left, x / ratio); right = Math.max(right, x / ratio);
      top = Math.min(top, y / ratio); bottom = Math.max(bottom, y / ratio); count++;
    }
  }
  return { outsideLeft: at(10, 25), outsideRight: at(110, 25), red: at(25, 25), blue: at(95, 25), text: { left, right, top, bottom, count } };
}
window.drawCompatibility = async width => {
  await document.fonts.ready;
  const program = deserializeGraphic(serializeGraphic(createScene(width)));
  const before = serializeGraphic(program);
  const canvas = document.querySelector("#chart"), context = canvas.getContext("2d");
  render(program, context, { pixelRatio: window.devicePixelRatio });
  const svg = renderToSVG(program, { title: "Compatibility scene", description: "Clipped gradient and centered text." });
  document.querySelector("#svg").innerHTML = svg;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const image = new Image(); image.src = url; await image.decode();
  const raster = document.createElement("canvas"); raster.width = width; raster.height = 100;
  const svgContext = raster.getContext("2d"); svgContext.drawImage(image, 0, 0);
  document.querySelector("#download").href = url;
  window.compatibility = { width, ratio: window.devicePixelRatio, physical: [canvas.width, canvas.height],
    logical: [parseFloat(canvas.style.width), parseFloat(canvas.style.height)],
    canvas: inspect(context, window.devicePixelRatio), svgPixels: inspect(svgContext, 1), svg,
    unchanged: serializeGraphic(program) === before };
  document.querySelector("#status").textContent = "Complete";
};
await window.drawCompatibility(160);
</script></body></html>`;
}
