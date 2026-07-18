import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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

function layer(file) {
  return path.relative(root, file).split(path.sep)[0];
}

const allowed = Object.freeze({
  actions: new Set([
    "actions", "core", "grammar", "layout", "materialization", "selectors", "theme"
  ]),
  core: new Set(["core"]),
  grammar: new Set(["core", "grammar"]),
  layout: new Set(["core", "layout"]),
  materialization: new Set([
    "core", "grammar", "layout", "materialization", "selectors", "theme"
  ]),
  renderers: new Set(["grammar", "renderers"]),
  selectors: new Set(["selectors"]),
  theme: new Set(["theme"])
});

test("keeps source imports inside their architectural boundaries", () => {
  for (const file of sourceFiles()) {
    const owner = layer(file);
    if (!(owner in allowed)) continue;
    for (const dependency of localImports(file)) {
      assert.equal(
        allowed[owner].has(layer(dependency)),
        true,
        `${path.relative(root, file)} must not import ${path.relative(root, dependency)}`
      );
    }
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
    if (!source.includes("._clone(")) continue;
    assert.equal(
      path.relative(actionRoot, file).split(path.sep)[0],
      "primitives",
      `${path.relative(root, file)} must compose primitive removal actions`
    );
  }
});

test("routes exact named semantic resource lookup through selectors", () => {
  const selectorRoot = path.join(root, "selectors");
  const directLookup = /semanticSpec\.(layers|datasets|scales|coordinates)\.find\s*\(/u;
  const directIdentityProbe = /semanticSpec\.(layers|datasets|scales|coordinates)\.some\s*\([^)]*\.id\s*===/su;

  for (const file of sourceFiles()) {
    if (file.startsWith(`${selectorRoot}${path.sep}`)) continue;
    const source = readFileSync(file, "utf8");
    assert.equal(
      directLookup.test(source),
      false,
      `${path.relative(root, file)} must use a named resource selector`
    );
    assert.equal(
      directIdentityProbe.test(source),
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
  for (const mark of ["point", "line", "area", "arc", "bar", "rule", "text"]) {
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
