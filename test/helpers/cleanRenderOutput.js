import { mkdir, readdir, rm } from "node:fs/promises";

const output = new URL("../output/", import.meta.url);
await mkdir(output, { recursive: true });

for (const entry of await readdir(output, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".png")) {
    await rm(new URL(entry.name, output));
  }
}
