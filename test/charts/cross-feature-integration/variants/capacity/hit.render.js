import test from "node:test";
import { cases } from "../../../../../scripts/consumers/fixtures/node/hit-preparation.mjs";
for (const entry of cases) test(entry.id, entry.run);
