import test from "node:test";
import { cases } from "../../../scripts/consumers/fixtures/node/interaction-animation.mjs";
for (const entry of cases.filter(value => ["interaction-animation/four-route-player-lifecycle", "interaction-animation/geographic-route-seam-current-hit"].includes(value.id))) test(entry.id, entry.run);
