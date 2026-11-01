import test from "node:test";
import { cases } from "../../../scripts/consumers/fixtures/node/geographic-routes.mjs";
test("route-derived geography matches native lines in Canvas, SVG, PNG, PDF and scene rendering", cases.find(item => item.id.endsWith("four-renderer-native-line-parity")).run);
