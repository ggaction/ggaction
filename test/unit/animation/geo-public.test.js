import test from "node:test";
import { cases } from "../../../scripts/consumers/fixtures/node/animation-geo.mjs";
for (const entry of cases) test(entry.id, entry.run);
