import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { deserializeAnimation, serializeAnimation, sampleTransition } from "../../../src/animation.js";
import { exportTransitionPlan } from "../../../src/animation/planner.js";
import { packageVersion } from "../../../src/version.js";

const directory = new URL("../../fixtures/animation/legacy-geographic/", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("manifest.json", directory), "utf8"));
const digest = value => createHash("sha256").update(value).digest("hex");

for (const [index, expected] of manifest.entries()) {
  test(`legacy geographic version ${expected.version} preserves bytes and frames for capacity ${expected.capacity?.maxProjectedPoints ?? "default"}`, () => {
    const text = readFileSync(new URL(`plan-${index}.json`, directory), "utf8");
    assert.equal(digest(text), expected.sha256);
    const { plan } = deserializeAnimation(text);
    assert.equal(plan.version, expected.version);
    // The envelope records the writing package version; every other byte is preserved.
    const stored = `"packageVersion":${JSON.stringify(JSON.parse(text).packageVersion)}`;
    assert.equal(serializeAnimation(plan), text.replace(stored, `"packageVersion":${JSON.stringify(packageVersion)}`));
    assert.equal(digest(JSON.stringify(exportTransitionPlan(plan))), expected.wireSHA256);
    for (const frame of expected.frames) assert.equal(digest(JSON.stringify(sampleTransition(plan, frame.timeMs))), frame.sha256);
    const decisions = sampleTransition(plan, 50).decisions;
    if (expected.capacity) assert.equal(decisions[1].reason, "edited-geo-graphics");
    else assert.equal(decisions[1].kernel, "native-geo");
  });
}
