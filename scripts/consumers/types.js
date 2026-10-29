import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { root, run, npmCommand, tscCommand } from "./runtime.js";

export async function testTypeScriptConsumer(directory) {
  const animationFile = path.join(directory, "animation.mts");
  await writeFile(animationFile, await readFile(new URL("./fixtures/animation.ts", import.meta.url), "utf8"));
  run(process.execPath, [tscCommand, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", animationFile], directory);
  const tableFile = path.join(directory, "table.mts");
  await writeFile(tableFile, await readFile(new URL("./fixtures/table.ts", import.meta.url), "utf8"));
  run(process.execPath, [tscCommand, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", tableFile], directory);
  const streamFile = path.join(directory, "stream-baselines.mts");
  await writeFile(streamFile, await readFile(new URL("./fixtures/stream-baselines.ts", import.meta.url), "utf8"));
  run(process.execPath, [tscCommand, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", streamFile], directory);
  const trailFile = path.join(directory, "trail.mts");
  await writeFile(trailFile, await readFile(new URL("./fixtures/trail.ts", import.meta.url), "utf8"));
  run(process.execPath, [tscCommand, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", trailFile], directory);
  const waterfallFile = path.join(directory, "waterfall.mts");
  await writeFile(waterfallFile, await readFile(new URL("./fixtures/waterfall.ts", import.meta.url), "utf8"));
  run(process.execPath, [tscCommand, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", waterfallFile], directory);
  const ohlcFile = path.join(directory, "ohlc.mts");
  await writeFile(ohlcFile, await readFile(new URL("./fixtures/ohlc.ts", import.meta.url), "utf8"));
  run(process.execPath, [tscCommand, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", ohlcFile], directory);
  const pyramidFile = path.join(directory, "pyramid.mts");
  await writeFile(pyramidFile, await readFile(new URL("./fixtures/pyramid.ts", import.meta.url), "utf8"));
  run(process.execPath, [tscCommand, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", pyramidFile], directory);
  const responsiveFile = path.join(directory, "responsive-guides.mts");
  await writeFile(responsiveFile, await readFile(new URL("./fixtures/responsive-guides.ts", import.meta.url), "utf8"));
  run(process.execPath, [tscCommand, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", responsiveFile], directory);
  const routesFile = path.join(directory, "edge-routes.mts");
  await writeFile(routesFile, await readFile(new URL("./fixtures/edge-routes.ts", import.meta.url), "utf8"));
  run(process.execPath, [tscCommand, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", routesFile], directory);
  const logicalSelectionFile = path.join(directory, "logical-selection.mts");
  await writeFile(logicalSelectionFile, await readFile(new URL("./fixtures/logical-selection.ts", import.meta.url), "utf8"));
  run(process.execPath, [tscCommand, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", logicalSelectionFile], directory);
  const accessibleFile = path.join(directory, "accessible-items.mts");
  await writeFile(accessibleFile, await readFile(new URL("./fixtures/accessible-items.ts", import.meta.url), "utf8"));
  run(process.execPath, [tscCommand, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", accessibleFile], directory);
  const interactionFile = path.join(directory, "interaction.mts");
  await writeFile(interactionFile, await readFile(new URL("./fixtures/interaction.ts", import.meta.url), "utf8"));
  run(process.execPath, [tscCommand, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", interactionFile], directory);
  const graphFile = path.join(directory, "graph-inference.mts");
  await writeFile(graphFile, await readFile(new URL("./fixtures/graph-inference.ts", import.meta.url), "utf8"));
  run(process.execPath, [tscCommand, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", graphFile], directory);
  const flowFile = path.join(directory, "flow-types.mts");
  await writeFile(flowFile, await readFile(new URL("./fixtures/flow-types.ts", import.meta.url), "utf8"));
  run(process.execPath, [tscCommand, "--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", flowFile], directory);

  const formatsFile=path.join(directory,"value-formats.mts");
  await writeFile(formatsFile,await readFile(new URL("./fixtures/types-1.ts", import.meta.url), "utf8"));
  run(process.execPath,[tscCommand,"--noEmit","--strict","--skipLibCheck","--target","ES2022","--module","NodeNext","--moduleResolution","NodeNext",formatsFile],directory);
  const extensionAuthoring = await readFile(
    path.join(root, "examples", "extension-typescript", "program.ts"),
    "utf8"
  );
  await writeFile(
    path.join(directory, "extension-authoring.ts"),
    extensionAuthoring
  );
  await writeFile(path.join(directory, "consumer.ts"), await readFile(new URL("./fixtures/types-2.ts", import.meta.url), "utf8"));
  await writeFile(path.join(directory, "facet-axis-gaps.ts"), await readFile(new URL("./fixtures/facet-axis-gaps.ts", import.meta.url), "utf8"));
  await writeFile(path.join(directory, "bin2d-assignment.ts"), await readFile(new URL("./fixtures/bin2d-assignment.ts", import.meta.url), "utf8"));
  await writeFile(path.join(directory, "axis-title-relative.ts"), await readFile(new URL("./fixtures/axis-title-relative.ts", import.meta.url), "utf8"));
  await writeFile(path.join(directory, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: {
      module: "NodeNext",
      moduleResolution: "NodeNext",
      target: "ES2023",
      lib: ["ES2023", "DOM"],
      strict: true,
      noEmit: true,
      skipLibCheck: false
    },
    files: ["consumer.ts", "extension-authoring.ts", "facet-axis-gaps.ts", "bin2d-assignment.ts", "axis-title-relative.ts"]
  }, null, 2)}\n`);
  run(process.execPath, [tscCommand, "--project", "tsconfig.json"], directory);
}
