import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";


import {
  BROWSER_BUNDLE_GZIP_LIMITS,
  measureMinimalBrowserBundle
} from "./browser-bundle-size.js";
import { createPackageArtifact } from "./package-artifact.js";
import { testTutorialConsumers } from "./tutorial-consumer.js";

import { root, run, npmCommand, runConsumerCases } from "./consumers/runtime.js";
import { testNodeConsumer } from "./consumers/node.js";
import { testMcpConsumer } from "./consumers/mcp.js";
import { testTypeScriptConsumer } from "./consumers/types.js";
import { testOptionalDependencies } from "./consumers/optional-peers.js";

export async function preparePackageConsumer({
  packageSpec = process.env.GGACTION_PACKAGE_SPEC,
  temporaryRoot = tmpdir()
} = {}) {
  const directory = await mkdtemp(path.join(temporaryRoot, "ggaction-consumer-"));
  try {
    const artifact = packageSpec === undefined ? await createPackageArtifact() : undefined;
    const installSpec = packageSpec ?? artifact.file;
    await writeFile(path.join(directory, "package.json"), `${JSON.stringify({
      name: "ggaction-release-consumer",
      version: "1.0.0",
      private: true,
      type: "module"
    }, null, 2)}\n`);
    run(npmCommand, [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      installSpec
    ], directory, {
      env: {
        ...process.env,
        NPM_CONFIG_CACHE: path.join(directory, ".npm-cache")
      }
    });
    const installedManifest = JSON.parse(await readFile(
      path.join(directory, "node_modules", "ggaction", "package.json"),
      "utf8"
    ));
    return {
      artifact,
      directory,
      installedManifest,
      packageSpec: packageSpec ?? artifact.file,
      cleanup: () => rm(directory, { recursive: true, force: true })
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

export async function testPackageConsumer(options) {
  const consumer = await preparePackageConsumer(options);
  try {
    await testOptionalDependencies(consumer);
    const bundle = async specifier => {
      const result = await measureMinimalBrowserBundle(consumer.directory, { specifier });
      const limit = BROWSER_BUNDLE_GZIP_LIMITS[specifier];
      if (result.gzipBytes > limit) throw new Error(`${specifier} gzip bundle ${result.gzipBytes} exceeds ${limit}.`);
      return result;
    };
    const results = await runConsumerCases([
      { id: "node", run: () => testNodeConsumer(consumer.directory) },
      { id: "mcp", run: () => testMcpConsumer(consumer.directory) },
      { id: "types", run: () => testTypeScriptConsumer(consumer.directory) },
      { id: "tutorials", run: () => testTutorialConsumers(consumer.directory) },
      { id: "bundle-full", run: () => bundle("ggaction") },
      { id: "bundle-basic", run: () => bundle("ggaction/basic") },
      { id: "bundle-svg", run: () => bundle("ggaction/svg") },
      { id: "bundle-interaction", run: () => bundle("ggaction/interaction") },
      { id: "bundle-graph", run: () => bundle("ggaction/graph") },
      { id: "bundle-animation", run: () => bundle("ggaction/animation") }
    ], path.join(root, ".artifacts/consumers/qualification.json"));
    const mcp = results.mcp;
    const fullBundle = results["bundle-full"];
    const basicBundle = results["bundle-basic"];
    const svgBundle = results["bundle-svg"];
    return {
      ...consumer,
      mcp,
      browserBundles: { full: fullBundle, basic: basicBundle, svg: svgBundle, interaction: results["bundle-interaction"], graph: results["bundle-graph"], animation: results["bundle-animation"] }
    };
  } finally {
    await consumer.cleanup();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const packageSpec = process.argv[2];
  const result = await testPackageConsumer({ packageSpec });
  process.stdout.write(`${JSON.stringify({
    package: `${result.installedManifest.name}@${result.installedManifest.version}`,
    source: result.artifact?.filename ?? result.packageSpec,
    ...(result.artifact ? { sha256: result.artifact.sha256 } : {}),
    peerMode: process.env.GGACTION_PEER_MODE ?? "locked",
    resolvedPeers: result.resolvedPeers,
    browserBundles: result.browserBundles,
    mcp: {
      coldStartMilliseconds: Math.round(result.mcp.coldStartMilliseconds)
    },
    checks: [
      "node",
      "linear-regression-statistics-cache-and-source-revision",
      "extension",
      "pdf",
      "png",
      "svg",
      "inspection",
      "numeric-font-weight",
      "point-jitter",
      "point-packing",
      "mark-label-removal",
      "selected-mark-labels",
      "semantic-label-placement",
      "beeswarm-plot",
      "raincloud-plot",
      "path-order",
      "time-unit-data",
      "summary-data",
      "bin-data",
      "fold-data",
      "named-dataset-lookup",
      "computed-data",
      "derived-data-editing",
      "safe-resource-removal",
      "advanced-authoring-integration",
      "normalized-data",
      "complete-data",
      "imputed-data",
      "stack-data",
      "window-data",
      "bin2d-data",
      "binned-heatmap",
      "parallel-coordinates",
      "parallel-dimension-scale-editing",
      "offset-scale-editing",
      "stroke-color-encoding-and-legends",
      "atomic-channel-encoding",
      "axis-title-label-overlap-policy",
      "numeric-independent-text-offsets",
      "statistical-references",
      "coordinate-aspect-and-polar-frame-editing",
      "facet-grid-repeat-and-named-composition-editing",
      "non-cartesian-facet-grid-and-repeat",
      "horizon",
      "violin-plot",
      "polar-radar-rug-strip-ecdf-facades",
      "right-categorical-legend-offset",
      "grouped-corner-and-free-legend-placement",
      "sequential-palette-count",
      "ranged-numeric-datum-wrapper-parity",
      "neutral-hcl-hue-borrowing",
      "facet-numeric-legend-inference",
      "explicit-fold-facet-partition",
      "shared-facet-top-lane",
      "rotated-facet-headers",
      "count-based-linear-position-domains",
      "nearest-step-linear-axis-ticks",
      "per-axis-numeric-tick-precision",
      "explicit-axis-and-border-underlays",
      "typescript",
      "basic-entry-runtime-and-types",
      "tutorial-consumers",
      "minimal-browser-bundle-measurement",
      "private-export-rejection",
      "installed-local-mcp",
      "direct-mcp-byte-equality",
      "task-packet-v5-authoring-execution",
      "explicit-unresolved-docs-fallback",
      "terminal-unsupported-no-fallback"
    ]
  }, null, 2)}\n`);
}
