import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { corpusDatasetIds } from "../test/support/datasets/catalog.js";
import {
  tidyTuesdayCachePath,
  tidyTuesdaySourceUrl,
  verifyTidyTuesdaySource
} from "../test/support/datasets/tidytuesday.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

function requestedIds(arguments_) {
  const available = corpusDatasetIds("tidytuesday");
  const options = arguments_.filter(argument => argument.startsWith("--"));
  const unknown = options.find(option => option !== "--all");
  if (unknown !== undefined) {
    throw new Error(`Unknown dataset sync option "${unknown}".`);
  }
  if (arguments_.length === 0 ||
      (arguments_.length === 1 && arguments_[0] === "--all")) {
    return available;
  }
  if (options.length > 0) {
    throw new Error("Dataset sync --all cannot be combined with dataset ids.");
  }
  const ids = arguments_;
  for (const id of ids) {
    if (!available.includes(id)) {
      throw new Error(
        `Unknown TidyTuesday dataset "${id}". Expected: ${available.join(", ")}.`
      );
    }
  }
  return Object.freeze([...new Set(ids)]);
}

async function download(id) {
  const url = tidyTuesdaySourceUrl(id);
  const response = await fetch(url, {
    headers: { "user-agent": "ggaction-dataset-corpus/1" },
    redirect: "follow",
    signal: AbortSignal.timeout(60_000)
  });
  if (!response.ok) {
    throw new Error(`Could not download ${id}: HTTP ${response.status}.`);
  }
  const source = await response.text();
  const { report } = verifyTidyTuesdaySource(id, source);
  const target = tidyTuesdayCachePath(id);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  try {
    await writeFile(temporary, source, "utf8");
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
  return { ...report, target: path.relative(repositoryRoot, target), url };
}

const ids = requestedIds(process.argv.slice(2));
for (const id of ids) {
  const report = await download(id);
  process.stdout.write(
    `${report.id}: ${report.bytes} bytes, ${report.sha256}, ${report.target}\n`
  );
}
