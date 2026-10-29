import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chart } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { collectReachableModules, moduleSpecifiers, resolveLocalModule } from "../support/module-imports.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const json = file => JSON.parse(readFileSync(path.join(root, file), "utf8"));
const index = json("agent_docs/contract/ACTION_INDEX.json");
const pkg = json("package.json");
const excluded = ["Funnel", "Marginal", "Bullet", "Combo", "KPI", "Gauge", "Venn", "Euler", "UpSet"];

test("native stage naming and recipe exclusions match the actual built-in action surface", () => {
  const full = chart(), minimal = basic();
  for (const name of ["createPyramidPlot", "editPyramidPlot"]) {
    assert.equal(typeof full[name], "function");
    assert.equal(minimal[name], undefined, "Pyramid remains Full-only");
    const action = index.actions.find(entry => entry.name === name);
    assert.equal(action.status, "implemented");
    assert.equal(action.contract.file, "agent_docs/contract/current/PYRAMID.md");
  }
  const names = new Set([...index.actions, ...index.plannedActions].map(entry => entry.name).concat(Object.values(index.internal).flat()));
  const excludedName = /^(?:create|edit)(?:funnel|marginal|bullet|combo|kpi|gauge|venn|euler|upset)(?:plot|mark|data|layout)?$/i;
  assert.deepEqual([...names].filter(name => excludedName.test(name)), []);
  for (const family of excluded) for (const verb of ["create", "edit"]) {
    for (const suffix of ["", "Plot", "Mark", "Data", "Layout"]) {
      const name = `${verb}${family}${suffix}`;
      assert.equal(full[name], undefined, name);
      assert.equal(minimal[name], undefined, name);
      assert.equal(names.has(name), false, name);
    }
  }
});

test("excluded and deferred families cannot be inserted as generic stored resources", () => {
  for (const create of [chart, basic]) {
    const before = create().createCanvas();
    const state = JSON.stringify(before);
    for (const kind of ["kpi", "gauge", "venn", "euler", "upset", "set-intersection"]) {
      assert.throws(() => before.editSemantic({ property: `resource[${kind}:excluded]`, value: {
        kind, id: "excluded", revision: 0, algorithmVersion: "1", ownership: { mode: "authored" },
        options: {}, inputs: [], result: {}, provenance: { origin: "authored" }
      } }), /Unsupported resource kind/);
      assert.equal(JSON.stringify(before), state, kind);
    }
  }
});

test("public runtime entries use local native owners and explicit low-level providers only", () => {
  const entries = [...Object.values(pkg.exports).map(entry => entry.default), ...Object.values(pkg.bin)]
    .map(entry => path.resolve(root, entry));
  const reachable = collectReachableModules(entries);
  assert.ok(reachable.size > 500);
  const expectedProviders = new Set(["geographic-math", "@napi-rs/canvas", "@modelcontextprotocol/sdk"]);
  const observedProviders = new Set();
  const isPackagedModule = file => file.startsWith(path.join(root, "src") + path.sep) ||
    file === path.join(root, "knowledge/task-resolver.js");
  assert.ok(pkg.files.includes("knowledge/task-resolver.js"));
  for (const file of reachable) {
    assert.ok(isPackagedModule(file), file);
    for (const { specifier, dynamic } of moduleSpecifiers(readFileSync(file, "utf8"))) {
      if (specifier === undefined && !dynamic) continue; // import.meta is module metadata.
      assert.equal(typeof specifier, "string", `runtime import requires an explicit target: ${file}`);
      if (specifier.startsWith(".")) {
        assert.ok(isPackagedModule(resolveLocalModule(file, specifier)), file);
      } else if (!specifier.startsWith("node:")) {
        const provider = specifier.startsWith("@modelcontextprotocol/sdk/") ? "@modelcontextprotocol/sdk" : specifier;
        assert.ok(expectedProviders.has(provider), `${file}: ${specifier}`);
        observedProviders.add(provider);
      }
    }
  }
  assert.deepEqual([...observedProviders].sort(), [...expectedProviders].sort());
  assert.deepEqual(Object.keys(pkg.dependencies), ["geographic-math"]);
  assert.deepEqual(Object.keys(pkg.optionalDependencies ?? {}), []);
  assert.deepEqual(Object.keys(pkg.peerDependencies).sort(), ["@modelcontextprotocol/sdk", "@napi-rs/canvas"]);
  assert.ok(Object.keys(pkg.peerDependencies).every(name => pkg.peerDependenciesMeta[name]?.optional === true));
});
