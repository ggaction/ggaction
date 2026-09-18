import { packageVersion } from "../../src/version.js";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  compactPackageJavaScript,
  inspectPackageArtifact,
  isolatedPackEnvironment,
  PACKAGE_LIMITS,
  validatePackageManifest
} from "../../scripts/package-artifact.js";

test("isolates npm pack from the caller's global cache", () => {
  const environment = isolatedPackEnvironment("/tmp/isolated-cache", {
    HOME: "/users/example",
    NPM_CONFIG_CACHE: "/users/example/.npm"
  });

  assert.deepEqual(environment, {
    HOME: "/users/example",
    NPM_CONFIG_CACHE: "/tmp/isolated-cache"
  });
});

test("publishes only the bounded public package artifact", async () => {
  const compactJsonPaths = [
    "knowledge/action-card.schema.json",
    "knowledge/action-cards.json",
    "knowledge/action-cards.schema.json",
    "knowledge/intent-taxonomy.json",
    "knowledge/intent-taxonomy.schema.json",
    "knowledge/mcp-resources.json",
    "knowledge/mcp-resources.schema.json",
    "knowledge/task-packet.schema.json"
  ];
  const sourceJson = await Promise.all(compactJsonPaths.map(async path => {
    const file = fileURLToPath(new URL(`../../${path}`, import.meta.url));
    return { file, path, contents: await readFile(file, "utf8") };
  }));
  const resolverFile = fileURLToPath(new URL(
    "../../knowledge/task-resolver.js",
    import.meta.url
  ));
  const resolverSource = await readFile(resolverFile, "utf8");
  const manifest = inspectPackageArtifact();
  const paths = manifest.files.map(file => file.path);

  assert.equal(manifest.name, "ggaction");
  assert.equal(manifest.version, packageVersion);
  assert.ok(manifest.entryCount <= PACKAGE_LIMITS.entries);
  assert.ok(manifest.size <= PACKAGE_LIMITS.packedBytes);
  assert.ok(manifest.unpackedSize <= PACKAGE_LIMITS.unpackedBytes);
  assert.ok(paths.every(path =>
    ["CHANGELOG.md", "LICENSE", "README.md", "package.json"].includes(path) ||
    path.startsWith("src/") || path.startsWith("types/") || [
      "knowledge/action-card.schema.json",
      "knowledge/action-cards.json",
      "knowledge/action-cards.schema.json",
      "knowledge/extension-authoring.md",
      "knowledge/intent-taxonomy.json",
      "knowledge/intent-taxonomy.schema.json",
      "knowledge/mcp-resources.json",
      "knowledge/mcp-resources.schema.json",
      "knowledge/task-packet.schema.json",
      "knowledge/task-resolver.js"
    ].includes(path)
  ));
  assert.equal(paths.some(path => path.startsWith("test/")), false);
  assert.equal(paths.some(path => path.startsWith("agent_docs/")), false);
  assert.equal(paths.some(path => path.startsWith(".github/")), false);
  assert.equal(paths.some(path => path.endsWith("/AGENTS.md") || path === "AGENTS.md"), false);
  for (const { file, path, contents } of sourceJson) {
    assert.equal(
      manifest.files.find(entry => entry.path === path).size,
      Buffer.byteLength(JSON.stringify(JSON.parse(contents)))
    );
    assert.equal(await readFile(file, "utf8"), contents);
  }
  assert.equal(
    manifest.files.find(entry => entry.path === "knowledge/task-resolver.js").size,
    Buffer.byteLength(compactPackageJavaScript(resolverSource))
  );
  assert.equal(await readFile(resolverFile, "utf8"), resolverSource);
  for (const relative of ["src/grammar/scales/color.js", "src/grammar/scales/transformed.js",
    "src/grammar/scales/definition.js", "src/actions/scales/definitions.js"]) {
    const source = await readFile(new URL(`../../${relative}`, import.meta.url), "utf8");
    assert.equal(manifest.files.find(file => file.path === relative).size,
      Buffer.byteLength(compactPackageJavaScript(source, {keepNames:false})));
  }
});

test("rejects missing, forbidden, and oversized package manifests", () => {
  const base = {
    entryCount: 10,
    size: 1,
    unpackedSize: 1,
    files: [
      "CHANGELOG.md",
      "LICENSE",
      "README.md",
      "package.json",
      "knowledge/action-card.schema.json",
      "knowledge/action-cards.json",
      "knowledge/action-cards.schema.json",
      "knowledge/extension-authoring.md",
      "knowledge/intent-taxonomy.json",
      "knowledge/intent-taxonomy.schema.json",
      "knowledge/mcp-resources.json",
      "knowledge/mcp-resources.schema.json",
      "knowledge/task-packet.schema.json",
      "knowledge/task-resolver.js",
      "src/index.js",
      "src/basic.js",
      "src/extension.js",
      "src/mcp/adapter.js",
      "src/mcp/cli.js",
      "src/mcp/server.js",
      "src/renderers/pdf.js",
      "src/renderers/png.js",
      "src/renderers/svg.js",
      "types/index.d.ts",
      "types/basic.d.ts",
      "types/extension.d.ts",
      "types/pdf.d.ts",
      "types/png.d.ts",
      "types/svg.d.ts",
      "types/program.d.ts"
    ].map(path => ({ path }))
  };

  assert.throws(
    () => validatePackageManifest({
      ...base,
      files: base.files.filter(file => file.path !== "LICENSE")
    }),
    /missing required file "LICENSE"/
  );
  assert.throws(
    () => validatePackageManifest({
      ...base,
      files: [...base.files, { path: "test/private.test.js" }]
    }),
    /forbidden file/
  );
  assert.throws(
    () => validatePackageManifest({
      ...base,
      files: [...base.files, { path: "src/AGENTS.md" }]
    }),
    /forbidden internal file/
  );
  assert.throws(
    () => validatePackageManifest({ ...base, size: PACKAGE_LIMITS.packedBytes + 1 }),
    /Packed size/
  );
  assert.throws(
    () => validatePackageManifest({
      ...base,
      entryCount: PACKAGE_LIMITS.entries + 1
    }),
    /Package entry count/
  );
});


test("packed scale compaction preserves exports and numeric color results", async () => {
  const compactModule = async name => {
    const url = new URL(`../../src/grammar/scales/${name}.js`, import.meta.url);
    const source = await readFile(url, "utf8");
    const compact = compactPackageJavaScript(source, {keepNames:false}).replace(
      /from\s*["'](\.[^"']+)["']/g,
      (_, relative) => `from ${JSON.stringify(new URL(relative, url).href)}`
    );
    const module = await import(`data:text/javascript;base64,${Buffer.from(compact).toString("base64")}`);
    assert.deepEqual(Object.keys(module), Object.keys(await import(url.href)));
    return module;
  };
  const definitions = await compactModule("../../actions/scales/definitions");
  assert.deepEqual(definitions.resolveQuantitativeColorScaleDefinition({semanticSpec:{scales:[]}},"quantitative",{type:"log",range:["black","white"]}),
    {id:"color",type:"log",domain:"auto",range:["black","white"],interpolate:"rgb",base:10});
  const color = await compactModule("color");
  assert.deepEqual(color.mapSequentialColors([1,10,100],[1,100],["#000000","#ffffff"],{type:"log"}),
    ["#000000","#808080","#ffffff"]);
  const definition = await compactModule("definition");
  assert.deepEqual(definition.normalizeScaleDefinition({type:"log",color:true,
    patch:{domain:[1,100],range:["black","white"]},validateDomain:(_,value)=>value,validateRange:(_,value)=>value}),
    {type:"log",domain:[1,100],range:["black","white"],base:10,interpolate:"rgb"});
  const transformed = await compactModule("transformed");
  assert.deepEqual(transformed.mapTransformedValues([1,10,100],[1,100],[0,100],{type:"log"}),[0,50,100]);
  assert.deepEqual(transformed.mapTransformedValues([-1,0,1],[-1,1],[0,100],{type:"symlog",constant:.01}),[0,50,100]);
});
