import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectPackageArtifact,
  PACKAGE_LIMITS,
  validatePackageManifest
} from "../../scripts/package-artifact.js";

test("publishes only the bounded public package artifact", () => {
  const manifest = inspectPackageArtifact();
  const paths = manifest.files.map(file => file.path);

  assert.equal(manifest.name, "ggaction");
  assert.equal(manifest.version, "0.0.1");
  assert.ok(manifest.entryCount <= PACKAGE_LIMITS.entries);
  assert.ok(manifest.size <= PACKAGE_LIMITS.packedBytes);
  assert.ok(manifest.unpackedSize <= PACKAGE_LIMITS.unpackedBytes);
  assert.ok(paths.every(path =>
    ["CHANGELOG.md", "LICENSE", "README.md", "package.json"].includes(path) ||
    path.startsWith("src/") || path.startsWith("types/")
  ));
  assert.equal(paths.some(path => path.startsWith("test/")), false);
  assert.equal(paths.some(path => path.startsWith("agent_docs/")), false);
  assert.equal(paths.some(path => path.startsWith(".github/")), false);
  assert.equal(paths.some(path => path.endsWith("/AGENTS.md") || path === "AGENTS.md"), false);
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
      "src/index.js",
      "src/extension.js",
      "src/renderers/png.js",
      "types/index.d.ts",
      "types/extension.d.ts",
      "types/png.d.ts",
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
});
