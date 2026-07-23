import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const exampleRoot = path.join(root, "examples", "quarto-ojs");
const cdnUrl = "https://cdn.jsdelivr.net/npm/ggaction@0.0.7/+esm";

function read(relative) {
  return readFileSync(path.join(exampleRoot, relative), "utf8");
}

function actionFlow(source) {
  const start = source.indexOf("return chart()");
  assert.notEqual(start, -1, "Missing direct chart action chain.");
  const chain = source.slice(start);
  const end = chain.indexOf(";\n");
  assert.notEqual(end, -1, "Action chain must end with a semicolon.");
  return [...chain.slice(0, end).matchAll(
    /^\s{4}\.([A-Za-z][A-Za-z0-9]*)\s*\(/gm
  )].map(match => match[1]);
}

test("keeps the Quarto example pinned, responsive, and accessible", () => {
  const module = read("ggaction-ojs.js");
  const document = read("index.qmd");
  const styles = read("styles.css");
  const readme = read("README.md");
  const cdnCheck = readFileSync(
    path.join(root, "scripts", "check-quarto-ojs-cdn.js"),
    "utf8"
  );
  const examplesReadme = readFileSync(
    path.join(root, "examples", "README.md"),
    "utf8"
  );

  assert.equal(module.includes(`from "${cdnUrl}";`), true);
  assert.equal(
    [...module.matchAll(/https:\/\/cdn\.jsdelivr\.net\/npm\/ggaction@/g)]
      .length,
    1
  );
  assert.deepEqual(actionFlow(module), [
    "createCanvas",
    "createData",
    "createScatterPlot",
    "createGuides",
    "createTitle"
  ]);
  assert.doesNotMatch(
    module,
    /\b(compileSpec|parseSpec|chartGrammar|translateSpec)\b/
  );

  for (const marker of [
    'role: "img"',
    '"aria-label": chartDescription',
    "}, chartDescription);",
    'element("th", { scope: "col" }',
    'element("details")',
    'element("summary")',
    "Math.min(globalThis.devicePixelRatio ?? 1, 2)"
  ]) {
    assert.equal(module.includes(marker), true, marker);
  }
  assert.match(module, /element\(\s*"caption"/);

  assert.equal(document.includes("buildProgram(width)"), true);
  assert.equal(document.includes('from "./ggaction-ojs.js"'), true);
  assert.equal(document.match(/```{ojs}/g)?.length, 5);
  assert.equal(document.includes("format:\n  html:"), true);

  for (const marker of [
    "max-width: 100%",
    "height: auto",
    ".ggaction-trace",
    ".ggaction-data-fallback"
  ]) {
    assert.equal(styles.includes(marker), true, marker);
  }

  assert.match(readme, /quarto preview index\.qmd/);
  assert.match(readme, /network access/);
  assert.match(readme, /may\s+return to its collapsed state/);
  assert.match(readme, /can retain arguments and source data/);
  assert.match(readme, /does not[\s\S]*Quarto extension/);
  assert.match(readme, /node scripts\/check-quarto-ojs-cdn\.js/);
  assert.match(readme, /separate networked smoke check/);
  assert.match(cdnCheck, /const expectedVersion = "0\.0\.7"/);
  assert.match(cdnCheck, /cdn\.jsdelivr\.net\/npm\/ggaction@\$\{expectedVersion\}\/\+esm/);
  assert.match(cdnCheck, /x-jsd-version/);
  assert.match(cdnCheck, /await import\(exampleModuleUrl\)/);
  assert.match(cdnCheck, /example\.buildProgram\(640\)/);
  assert.match(examplesReadme, /quarto-ojs\/README\.md/);
  assert.equal(existsSync(path.join(exampleRoot, "_extension.yml")), false);
  assert.equal(existsSync(path.join(exampleRoot, "index.html")), false);
});

test("executes the example program against the package source", async () => {
  const module = read("ggaction-ojs.js");
  const packageEntry = new URL("../../src/index.js", import.meta.url).href;
  const localModule = module.replace(cdnUrl, packageEntry);
  assert.notEqual(localModule, module);

  const encoded = Buffer.from(localModule).toString("base64");
  const example = await import(`data:text/javascript;base64,${encoded}`);

  assert.equal(example.GGActionVersion, "0.0.7");
  assert.equal(example.cars.length, 10);
  assert.equal(Object.isFrozen(example.cars), true);
  assert.equal(example.normalizeChartWidth(1000), 760);
  assert.equal(example.normalizeChartWidth(240), 280);

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
  assert.equal(
    narrow.graphicSpec.objects.canvas.properties.width,
    280
  );
  assert.equal(
    narrow.graphicSpec.objects.canvas.properties.height >= 340,
    true
  );
});
