import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares Full-only exact named-resource removal contracts", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-remove-resource-types-"));
  try {
    const file = path.join(directory, "remove-resources.mts");
    await writeFile(file, `
import { chart } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basicChart } from ${JSON.stringify(path.join(root, "types/basic.js"))};
import type { RemoveResourceOptions } from ${JSON.stringify(path.join(root, "types/index.js"))};
const options: RemoveResourceOptions = { id: "unused" };
chart().removeData(options).removeScale({ id: "x" }).removeCoordinate({ id: "plot" });
// @ts-expect-error removeData is Full-only.
basicChart().removeData({ id: "unused" });
// @ts-expect-error id is required.
chart().removeScale({});
// @ts-expect-error target inference is not supported.
chart().removeCoordinate({ target: "plot" });
// @ts-expect-error cascade is outside the safe-removal contract.
chart().removeData({ id: "unused", cascade: true });
// @ts-expect-error batch removal is not supported.
chart().removeScale({ id: ["x", "y"] });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), [
      "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
