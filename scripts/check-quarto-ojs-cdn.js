import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const expectedVersion = "0.0.7";
const cdnUrl =
  `https://cdn.jsdelivr.net/npm/ggaction@${expectedVersion}/+esm`;
const exampleUrl = new URL(
  "../examples/quarto-ojs/ggaction-ojs.js",
  import.meta.url
);

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30_000);

let response;
let packageSource;
try {
  response = await fetch(cdnUrl, {
    headers: {
      "user-agent": "ggaction-quarto-cdn-check/1.0"
    },
    redirect: "follow",
    signal: controller.signal
  });
  assert.equal(response.ok, true, `CDN request failed: ${response.status}`);
  assert.equal(response.url, cdnUrl, "CDN request redirected unexpectedly.");
  assert.match(
    response.headers.get("content-type") ?? "",
    /(?:java|ecma)script/i,
    "CDN response is not JavaScript."
  );
  assert.equal(
    response.headers.get("x-jsd-version"),
    expectedVersion,
    "CDN served an unexpected ggaction version."
  );

  packageSource = await response.text();
  assert.equal(
    packageSource.length > 100_000,
    true,
    "CDN response is unexpectedly small."
  );
} finally {
  clearTimeout(timeout);
}

const packageUrl =
  `data:text/javascript;base64,${Buffer.from(packageSource).toString("base64")}`;
const exampleSource = await readFile(exampleUrl, "utf8");
const liveExampleSource = exampleSource.replace(cdnUrl, packageUrl);
assert.notEqual(
  liveExampleSource,
  exampleSource,
  "Example does not import the expected CDN URL."
);

const exampleModuleUrl =
  `data:text/javascript;base64,${Buffer.from(liveExampleSource).toString("base64")}`;
const example = await import(exampleModuleUrl);

assert.equal(example.GGActionVersion, expectedVersion);
assert.equal(example.cars.length, 10);

const wide = example.buildProgram(640);
assert.equal(Object.isFrozen(wide), true);
assert.deepEqual(
  wide.trace.children.map(node => node.op),
  [
    "createCanvas",
    "createData",
    "createScatterPlot",
    "createGuides",
    "createTitle"
  ]
);
assert.equal(wide.semanticSpec.datasets.length, 1);
assert.equal(Object.keys(wide.graphicSpec.objects).length, 17);
assert.equal(example.flattenTrace(wide.trace).length - 1, 256);

const narrow = example.buildProgram(240);
assert.equal(narrow.graphicSpec.objects.canvas.properties.width, 280);

console.log(JSON.stringify({
  url: cdnUrl,
  version: expectedVersion,
  bytes: Buffer.byteLength(packageSource),
  authoredActions: wide.trace.children.length,
  traceNodes: example.flattenTrace(wide.trace).length - 1,
  graphics: Object.keys(wide.graphicSpec.objects).length,
  narrowWidth: narrow.graphicSpec.objects.canvas.properties.width
}, null, 2));
