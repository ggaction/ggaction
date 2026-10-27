import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { root, run, npmCommand, tscCommand } from "./runtime.js";

export async function testTypeScriptConsumer(directory) {
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
