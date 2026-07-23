import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

import { chart, hconcat, render, vconcat } from "../../src/index.js";
import {
  chart as basicChart,
  render as basicRender
} from "../../src/basic.js";

const PUBLIC_ENTRIES = Object.freeze({
  ".": Object.freeze({
    runtime: "./src/index.js",
    types: "./types/index.d.ts",
    values: Object.freeze(["chart", "hconcat", "render", "vconcat"])
  }),
  "./basic": Object.freeze({
    runtime: "./src/basic.js",
    types: "./types/basic.d.ts",
    values: Object.freeze(["chart", "render"])
  }),
  "./extension": Object.freeze({
    runtime: "./src/extension.js",
    types: "./types/extension.d.ts",
    values: Object.freeze(["ChartProgram", "action"])
  }),
  "./png": Object.freeze({
    runtime: "./src/renderers/png.js",
    types: "./types/png.d.ts",
    values: Object.freeze(["renderToPNG"])
  }),
  "./pdf": Object.freeze({
    runtime: "./src/renderers/pdf.js",
    types: "./types/pdf.d.ts",
    values: Object.freeze(["renderToPDF"])
  }),
  "./svg": Object.freeze({
    runtime: "./src/renderers/svg.js",
    types: "./types/svg.d.ts",
    values: Object.freeze(["renderToSVG"])
  })
});

function declarationValueExports(source) {
  const declarations = [...source.matchAll(
    /\bexport\s+(?:declare\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/g
  )].map(match => match[1]);
  const lists = [...source.matchAll(/\bexport\s*\{([^}]+)\}/g)]
    .flatMap(match => match[1].split(","))
    .map(value => value.trim().replace(/^type\s+/, "").split(/\s+as\s+/).at(-1))
    .filter(Boolean);
  return [...new Set([...declarations, ...lists])].sort();
}

test("exports the public module boundaries", () => {
  assert.equal(typeof chart, "function");
  assert.equal(typeof hconcat, "function");
  assert.equal(typeof render, "function");
  assert.equal(typeof vconcat, "function");
  assert.equal(typeof basicChart, "function");
  assert.equal(typeof basicRender, "function");
});

test("keeps the basic entry focused on common Cartesian charts", () => {
  const program = basicChart();
  for (const method of [
    "createScatterPlot",
    "createLinePlot",
    "createBarPlot",
    "createHistogram",
    "createHeatmap"
  ]) {
    assert.equal(typeof program[method], "function", method);
  }
  for (const method of [
    "createRegression",
    "encodeTheta",
    "facet",
    "selectMarks",
    "createParallelCoordinates"
  ]) {
    assert.equal(program[method], undefined, method);
  }
});

test("maps every public entry point to a declaration file", () => {
  const packageJson = JSON.parse(readFileSync(
    new URL("../../package.json", import.meta.url),
    "utf8"
  ));
  assert.equal(packageJson.types, PUBLIC_ENTRIES["."].types);
  assert.deepEqual(Object.keys(packageJson.exports), Object.keys(PUBLIC_ENTRIES));
  for (const [specifier, expected] of Object.entries(PUBLIC_ENTRIES)) {
    assert.deepEqual(packageJson.exports[specifier], {
      types: expected.types,
      default: expected.runtime
    });
  }
});

test("keeps runtime values and declarations in exact public-entry parity", async () => {
  for (const [specifier, entry] of Object.entries(PUBLIC_ENTRIES)) {
    const runtime = await import(new URL(`../../${entry.runtime.slice(2)}`, import.meta.url));
    const declaration = readFileSync(
      new URL(`../../${entry.types.slice(2)}`, import.meta.url),
      "utf8"
    );
    assert.deepEqual(Object.keys(runtime).sort(), [...entry.values].sort(), specifier);
    assert.deepEqual(
      declarationValueExports(declaration),
      [...entry.values].sort(),
      `${specifier} declaration values`
    );
  }
});

test("keeps the public release identity and legal metadata consistent", () => {
  const packageJson = JSON.parse(readFileSync(
    new URL("../../package.json", import.meta.url),
    "utf8"
  ));
  const lockfile = JSON.parse(readFileSync(
    new URL("../../package-lock.json", import.meta.url),
    "utf8"
  ));
  const license = readFileSync(new URL("../../LICENSE", import.meta.url), "utf8");

  assert.equal(packageJson.name, "ggaction");
  assert.equal(packageJson.version, "0.0.7");
  assert.equal(lockfile.version, packageJson.version);
  assert.equal(lockfile.packages[""].version, packageJson.version);
  assert.equal(packageJson.license, "MIT");
  assert.equal(lockfile.packages[""].license, packageJson.license);
  assert.deepEqual(packageJson.repository, {
    type: "git",
    url: "git+https://github.com/ggaction/ggaction.git"
  });
  assert.equal(packageJson.homepage, "https://ggaction.github.io/ggaction/");
  assert.equal(packageJson.bugs.url, "https://github.com/ggaction/ggaction/issues");
  assert.deepEqual(packageJson.publishConfig, {
    access: "public",
    registry: "https://registry.npmjs.org/",
    tag: "latest"
  });
  assert.match(license, /^MIT License/m);
  assert.match(license, /Copyright \(c\) 2026 Hyeon Jeon/);
});

const TEXT_EXTENSIONS = new Set([
  ".css", ".html", ".js", ".json", ".md", ".scss", ".ts", ".yaml", ".yml"
]);

function sourceFiles(url) {
  const entries = readdirSync(url, { withFileTypes: true });
  return entries.flatMap(entry => {
    const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), url);
    if (entry.isDirectory()) return sourceFiles(child);
    const extension = entry.name.slice(entry.name.lastIndexOf("."));
    return TEXT_EXTENSIONS.has(extension) ? [child] : [];
  });
}

test("keeps library terminology source-neutral", () => {
  const root = new URL("../../", import.meta.url);
  const directories = [
    "src", "types", "docs", "agent_docs", "test", "examples", "scripts"
  ];
  const files = directories.flatMap(directory =>
    sourceFiles(new URL(`${directory}/`, root))
  ).concat([
    new URL("AGENTS.md", root),
    new URL("README.md", root),
    new URL("package.json", root)
  ]);
  const forbiddenBrand = ["ve", "ga"].join("");

  for (const file of files) {
    const source = readFileSync(file, "utf8").toLowerCase();
    assert.equal(source.includes(forbiddenBrand), false, file.pathname);
  }
});
