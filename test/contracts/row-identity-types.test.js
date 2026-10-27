import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileTypeScript } from "../support/typescript.js";

test("Full and Basic declare exclusive typed row keys and Full revision correspondence", async () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-row-identity-types-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import { chart, type RowKey, type InputRowRef } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basic } from ${JSON.stringify(path.join(root, "types/basic.js"))};
import type { GraphicIdentity, PersistentSelectionResource } from ${JSON.stringify(path.join(root, "types/extension.js"))};
const values = [{ id: "a", v: 1 }, { id: "b", v: 2 }] as const;
const keys: readonly RowKey[] = [new Date(0), [true, 2n, ""]];
const p = chart().createData({ id: "rows", values, keys });
basic().createData({ values, keyField: "id" });
chart().createData({ values, keyFields: ["id", "v"] });
p.reviseData({ source: "rows", id: "next", values, keys });
chart().createData({ id: "generated", values }).reviseData({ source: "generated", id: "next", values, rowMap: [1, null] });
declare const identity: GraphicIdentity;
declare const resource: PersistentSelectionResource;
declare const input: InputRowRef;
const rowKey: string = input.rowKey;
const revision: number = resource.revision;
const key: string = identity.key;
void rowKey; void revision; void key;
// @ts-expect-error key modes are exclusive
chart().createData({ values, keyField: "id", keys });
// @ts-expect-error tuples contain only scalar keys
chart().createData({ values, keys: [[{}]] });
// @ts-expect-error rowMap and explicit keys are exclusive
p.reviseData({ source: "rows", id: "bad", values, keys, rowMap: [0, 1] });
// @ts-expect-error key mode cannot change in a revision
p.reviseData({ source: "rows", id: "bad", values, keyField: "v" });
// @ts-expect-error revision remains Full-only
basic().reviseData({ source: "rows", id: "bad", values });
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
