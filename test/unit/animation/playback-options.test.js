import assert from "node:assert/strict";
import test from "node:test";
import { normalizePlaybackOptions, serializePlaybackOptions, restorePlaybackOptions }
  from "../../../src/grammar/animation/playbackOptions.js";

test("playback defaults and infinite repeat have one explicit reversible storage representation", () => {
  assert.deepEqual(normalizePlaybackOptions(), {rate: 1, repeat: 0, reducedMotion: false});
  for (const rate of [0, -0, -2, .5, Number.MAX_VALUE]) for (const repeat of [0, 3, Infinity]) {
    const input = {rate, repeat, reducedMotion: true};
    const stored = serializePlaybackOptions(input);
    assert.deepEqual(stored, {rate, repeat: repeat === Infinity ? "infinite" : repeat, reducedMotion: true});
    assert.deepEqual(restorePlaybackOptions(stored), input);
    assert.ok(Object.isFrozen(stored));
    assert.ok(Object.isFrozen(restorePlaybackOptions(stored)));
    assert.deepEqual(input, {rate, repeat, reducedMotion: true});
  }
});

test("playback normalization rejects invalid, executable and inherited options without host calls", () => {
  let calls = 0;
  const accessor = Object.defineProperty({}, "rate", {enumerable: true, get() {calls++; return 1;}});
  for (const input of [null, [], Object.create({rate: 1}), accessor, {extra: true},
    {rate: Infinity}, {rate: NaN}, {rate: undefined}, {repeat: -1}, {repeat: 1.5},
    {repeat: "infinite"}, {repeat: undefined}, {reducedMotion: 1}, {reducedMotion: undefined}]) {
    assert.throws(() => normalizePlaybackOptions(input));
  }
  assert.equal(calls, 0);
  for (const input of [null, {}, {rate: 1, repeat: 0},
    {rate: 1, repeat: Infinity, reducedMotion: false}, {rate: 1, repeat: "forever", reducedMotion: false},
    {rate: 1, repeat: 0, reducedMotion: false, extra: true}]) {
    assert.throws(() => restorePlaybackOptions(input));
  }
});
