import { parse } from "acorn";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DEFAULT_ACTION_METHODS } from "../../src/core/vocabulary.js";
import { BUILTIN_ACTION_DESCRIPTOR_RECORDS } from "../../src/inspectionDescriptors.js";

import {
  moduleSpecifiers,
  resolveLocalModule
} from "../support/module-imports.js";

const root = fileURLToPath(new URL("../../src", import.meta.url));

function sourceFiles(directory = root) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return entry.name.endsWith(".js") ? [target] : [];
  });
}

function localImports(file) {
  const source = readFileSync(file, "utf8");
  return moduleSpecifiers(source)
    .filter(entry => entry.specifier?.startsWith("."))
    .map(entry => resolveLocalModule(file, entry.specifier));
}

function memberName(node) {
  if (node?.type === "ChainExpression") return memberName(node.expression);
  if (node?.type !== "MemberExpression") return undefined;
  return node.computed ? node.property.value : node.property.name;
}
function walkSyntax(node, visit) {
  if (!node || typeof node.type !== "string") return;
  visit(node);
  for (const child of Object.values(node)) {
    if (Array.isArray(child)) child.forEach(value => walkSyntax(value, visit));
    else if (child && typeof child === "object") walkSyntax(child, visit);
  }
}
function hasCall(source, predicate) {
  const file = parse(source, { ecmaVersion: "latest", sourceType: "module" });
  let found = false;
  walkSyntax(file, node => { if (node.type === "CallExpression" && predicate(node)) found = true; });
  return found;
}
function directSemanticLookup(source) {
  return hasCall(source, call => {
    const method = memberName(call.callee);
    const collection = call.callee.object;
    if (!["find", "some"].includes(method) || !collection ||
        !["layers", "datasets", "scales", "coordinates"].includes(memberName(collection)) ||
        memberName(collection.object) !== "semanticSpec") return false;
    if (method === "find") return true;
    let identity = false;
    for (const argument of call.arguments) walkSyntax(argument, node => {
      if (node.type === "BinaryExpression" && node.operator === "===" &&
          (memberName(node.left) === "id" || memberName(node.right) === "id")) identity = true;
    });
    return identity;
  });
}

function layer(file) {
  return path.relative(root, file).split(path.sep)[0];
}

const allowed = Object.freeze({
  actions: new Set([
    "actions", "core", "grammar", "layout", "materialization", "selectors", "theme"
  ]),
  animation: new Set(["animation", "core", "grammar", "materialization", "persistence"]),
  interaction: new Set(["interaction", "core", "grammar", "materialization", "selectors"]),
  core: new Set(["core"]),
  persistence: new Set(["persistence", "core", "grammar", "selectors"]),
  grammar: new Set(["core", "grammar"]),
  layout: new Set(["core", "layout"]),
  materialization: new Set([
    "core", "grammar", "layout", "materialization", "selectors", "theme"
  ]),
  renderers: new Set(["grammar", "renderers"]),
  resources: new Set(["resources", "core", "grammar", "materialization", "selectors"]),
  selectors: new Set(["selectors"]),
  theme: new Set(["theme"])
});

test("keeps source imports inside their architectural boundaries", () => {
  for (const file of sourceFiles()) {
    const owner = layer(file);
    if (!(owner in allowed)) continue;
    for (const dependency of localImports(file)) {
      assert.equal(
        allowed[owner].has(layer(dependency)) || (
          (owner === "animation" && ["sceneSnapshot.js", "version.js", path.join("renderers", "canvasScene.js")].includes(path.relative(root, dependency))) ||
          (path.relative(root, file) === path.join("interaction", "hitProgram.js") && path.relative(root, dependency) === "sceneSnapshot.js") ||
          (path.relative(root, file) === path.join("interaction", "sceneFrame.js") && path.relative(root, dependency) === path.join("renderers", "canvasScene.js")) ||
          (["hitGuides.js", "hitLegends.js"].some(name => path.relative(root, file) === path.join("interaction", name)) && [
            "tickValues.js", "polar/resolve.js", "axes/parallel/resolve.js", "legends/blocks.js", "legends/categorical/layout.js",
            "legends/sampling.js", "legends/size.js", "legends/colorSize.js", "legends/continuous/gradient.js"
          ].some(name => path.relative(root, dependency) === path.join("actions", "guides", name))) ||
          (owner === "persistence" && [path.join("actions", "primitives", "semantic.js"), path.join("materialization", "resourceState.js"), path.join("materialization", "expressionInputs.js"), path.join("materialization", "dataSourceState.js"), path.join("materialization", "frameState.js"), path.join("materialization", "imageState.js"), path.join("materialization", "fontState.js")].includes(path.relative(root, dependency))) ||
          ([path.join("actions", "data", "sourceCreate.js"), path.join("actions", "data", "sourceEdit.js")].includes(path.relative(root, file)) &&
            path.relative(root, dependency) === path.join("resources", "dataUpdate.js")) ||
          (path.relative(root, file) === path.join("resources", "dataUpdate.js") &&
            path.relative(root, dependency) === path.join("actions", "primitives", "datasetIdentity.js")) ||
          (path.relative(root, file) === path.join("resources", "dataUpdateFull.js") &&
            path.relative(root, dependency) === path.join("actions", "data", "sourcePlan.js")) ||
          (path.relative(root, file) === path.join("actions", "images", "index.js") && path.relative(root, dependency) === path.join("resources", "imageResource.js")) ||
          (path.relative(root, file) === path.join("actions", "fonts", "index.js") && path.relative(root, dependency) === path.join("resources", "fontResource.js")) ||
          (path.relative(root, file) === path.join("actions", "graphs", "edgeRoutes.js") && path.relative(root, dependency) === path.join("resources", "graphRoutes.js")) ||
          (path.relative(root, file) === path.join("actions", "textMetrics", "index.js") && path.relative(root, dependency) === path.join("resources", "textMetrics.js")) ||
          (path.relative(root, file) === path.join("resources", "textMetricsFull.js") && path.relative(root, dependency) === path.join("actions", "textMetrics", "index.js")) ||
          (owner === "renderers" && path.relative(root, dependency) === path.join("core", "immutable.js")) ||
          (path.relative(root, file) === path.join("selectors", "graphs.js") &&
            path.relative(root, dependency) === path.join("core", "vocabulary.js")) ||
          (["imageRendering.js", "canvasScene.js", "fontRendering.js", "fonts.js", "textGlyphMask.js", "textInkBounds.js"].some(name => path.relative(root, file) === path.join("renderers", name)) &&
            ["assetHost.js", "ownData.js", "contentDigest.js"].some(name => path.relative(root, dependency) === path.join("core", name))) ||
          (["imageRendering.js", "canvasScene.js", "shadowRendering.js", "shadowState.js"].some(name => path.relative(root, file) === path.join("renderers", name)) &&
            ["assetHost.js", "ownData.js", "contentDigest.js", "pngEncoding.js", "validation.js"].some(name => path.relative(root, dependency) === path.join("core", name))) ||
          (["renderers", "theme"].includes(owner) && path.relative(root, dependency) === path.join("core", "font.js")) ||
          (owner === "theme" && path.relative(root, dependency) === path.join("core", "ownData.js")) ||
          (["renderers", "selectors"].includes(owner) && path.relative(root, dependency) === path.join("core", "diagnostics.js"))
        ),
        true,
        `${path.relative(root, file)} must not import ${path.relative(root, dependency)}`
      );
    }
  }
});

test("the compact source-action vocabulary matches public default action metadata", () => {
  assert.deepEqual(DEFAULT_ACTION_METHODS, BUILTIN_ACTION_DESCRIPTOR_RECORDS
    .filter(record => record[4].includes("default")).map(record => record[0]));
  assert.equal(Object.isFrozen(DEFAULT_ACTION_METHODS), true);
});

test("Basic source preparation excludes Full revision and facet orchestration", () => {
  const pending = [path.join(root, "basic.js")], visited = new Set();
  while (pending.length) {
    const file = pending.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    pending.push(...localImports(file));
  }
  assert.ok(visited.has(path.join(root, "resources", "dataUpdate.js")));
  for (const file of ["resources/dataUpdateFull.js", "actions/data/sourceEdit.js", "actions/data/sourcePlan.js", "actions/parameters/edit.js",
    "resources/fontResource.js", "resources/textMetricsFull.js", "actions/fonts/index.js", "resources/graphRoutes.js", "resources/graphRouteExecutor.js", "actions/graphs/edgeRoutes.js"]) {
    assert.equal(visited.has(path.join(root, file)), false, file);
  }
});

test("parses static, re-exported, and dynamic module references", () => {
  assert.deepEqual(moduleSpecifiers(`
    // import "./ignored-comment.js";
    import value from "./static.js";
    export { other } from "./re-export.js";
    const loaded = import("./dynamic.js");
    const external = import("node:path");
  `), [
    { specifier: "./static.js", dynamic: false },
    { specifier: "./re-export.js", dynamic: false },
    { specifier: "./dynamic.js", dynamic: true },
    { specifier: "node:path", dynamic: true }
  ]);
});

test("resolves extensionless files and directory entry points", () => {
  assert.equal(
    resolveLocalModule(
      path.join(root, "actions", "example.js"),
      "../core/action"
    ),
    path.join(root, "core", "action.js")
  );
  assert.equal(
    resolveLocalModule(
      path.join(root, "actions", "example.js"),
      "../selectors"
    ),
    path.join(root, "selectors", "index.js")
  );
});

test("keeps the local source import graph acyclic", () => {
  const files = sourceFiles();
  const sourceSet = new Set(files);
  const graph = new Map(files.map(file => [
    file,
    localImports(file).filter(dependency => sourceSet.has(dependency))
  ]));
  const visiting = new Set();
  const visited = new Set();

  function visit(file, stack = []) {
    if (visiting.has(file)) {
      const start = stack.indexOf(file);
      assert.fail(
        `Source import cycle: ${[...stack.slice(start), file]
          .map(item => path.relative(root, item))
          .join(" -> ")}`
      );
    }
    if (visited.has(file)) return;
    visiting.add(file);
    for (const dependency of graph.get(file)) visit(dependency, [...stack, file]);
    visiting.delete(file);
    visited.add(file);
  }

  for (const file of files) visit(file);
});

test("keeps semantic and graphic cloning inside primitive actions", () => {
  const actionRoot = path.join(root, "actions");
  for (const file of sourceFiles(actionRoot)) {
    const source = readFileSync(file, "utf8");
    if (!hasCall(source, call => memberName(call.callee) === "_clone")) continue;
    assert.equal(
      path.relative(actionRoot, file).split(path.sep)[0],
      "primitives",
      `${path.relative(root, file)} must compose primitive removal actions`
    );
  }
});

test("routes exact named semantic resource lookup through selectors", () => {
  const selectorRoot = path.join(root, "selectors");

  for (const file of sourceFiles()) {
    if (file.startsWith(`${selectorRoot}${path.sep}`)) continue;
    const source = readFileSync(file, "utf8");
    assert.equal(
      directSemanticLookup(source),
      false,
      `${path.relative(root, file)} must use a named resource selector`
    );

  }
});

test("keeps cross-cutting planners independent from concrete mark names", () => {
  for (const relative of [
    "materialization/dependencies.js",
    "materialization/encodings.js"
  ]) {
    const source = readFileSync(path.join(root, relative), "utf8");
    assert.equal(
      /mark(?:\?)?\.type\s*===\s*["']/u.test(source),
      false,
      `${relative} must delegate mark-specific behavior to the mark policy registry`
    );
  }
});

test("keeps every ordinary mark family behind a stable directory entry", () => {
  for (const mark of [
    "point", "line", "area", "arc", "bar", "rect", "rule", "tick", "text"
  ]) {
    assert.equal(
      existsSync(path.join(root, "actions", "marks", mark, "index.js")),
      true,
      `${mark} must own a directory entry point`
    );
    assert.equal(
      existsSync(path.join(root, "actions", "marks", `${mark}.js`)),
      false,
      `${mark} must not return to a flat mark module`
    );
  }
});

test("architectural syntax checks ignore comments and recognize direct bracket and optional access", () => {
 for (const source of [
  "p.semanticSpec.layers.find(x => x.id === id)",
  "p.semanticSpec.layers?.find(x => x.id === id)",
  'p["semanticSpec"]["layers"]["find"](x => x.id === id)',
  'p.semanticSpec.layers.some(x => x["id"] === id)'
 ]) assert.equal(directSemanticLookup(source), true, source);
 for (const source of [
  "// p.semanticSpec.layers.find(x => x.id === id)",
  '\"p.semanticSpec.layers.find(x => x.id === id)\"',
  "p.semanticSpec.layers.some(x => x.visible)"
 ]) assert.equal(directSemanticLookup(source), false, source);
 // This syntactic rule intentionally does not perform interprocedural alias analysis.
});
