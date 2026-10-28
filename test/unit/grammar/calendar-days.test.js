import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

import { deriveCalendarDayDomain, normalizeCalendarDayDomain } from "../../../src/grammar/calendarDay.js";
import { bucketTime, calendarParts, CALENDAR_BOUNDARY_WORK } from "../../../src/grammar/timeUnit.js";
import { civilDayBoundaries, gregorianDays } from "../../oracles/calendar-days.js";

const domain = patch => ({ unit: "day", start: "2024-01-01", end: "2024-12-31", timeZone: "UTC", ...patch });
const label = (instant, timeZone) => {
  const parts = calendarParts(instant, timeZone);
  return [String(parts.year).padStart(4, "0"), String(parts.month).padStart(2, "0"), String(parts.day).padStart(2, "0")].join("-");
};

test("calendar domain includes both endpoints and all 366 Gregorian leap-year days", () => {
  const values = deriveCalendarDayDomain(domain());
  assert.equal(values.length, 366);
  assert.equal(new Set(values).size, 366);
  assert.deepEqual(values.map(value => label(value, "UTC")), gregorianDays("2024-01-01", "2024-12-31"));
  assert.equal(values[0], 1704067200000);
  assert.equal(values[59], 1709164800000);
  assert.equal(values.at(-1), 1735603200000);
  assert.equal(deriveCalendarDayDomain(domain({ start: "2024-02-01", end: "2024-02-29" })).length, 29);
  assert.deepEqual(deriveCalendarDayDomain(domain({ start: "2024-02-29", end: "2024-02-29" })), [1709164800000]);
  assert.equal(deriveCalendarDayDomain(domain({ start: "1900-02-01", end: "1900-02-28" })).length, 28);
  assert.equal(deriveCalendarDayDomain(domain({ start: "2000-02-01", end: "2000-02-29" })).length, 29);
});

test("calendar domain preserves literal IANA boundaries across gaps, folds and non-hour offsets", () => {
  for (const { expected, ...options } of civilDayBoundaries) {
    const values = deriveCalendarDayDomain(domain(options));
    assert.deepEqual(values.map(value => new Date(value).toISOString()), expected);
    assert.deepEqual(values.map(value => label(value, options.timeZone)), gregorianDays(options.start, options.end));
    assert.ok(values.every((value, index) => Number.isFinite(value) && (index === 0 || value > values[index - 1])));
  }
  const spring = deriveCalendarDayDomain(domain({ start: "2024-03-09", end: "2024-03-11", timeZone: "America/New_York" }));
  const fall = deriveCalendarDayDomain(domain({ start: "2024-11-02", end: "2024-11-04", timeZone: "America/New_York" }));
  assert.equal(spring[2] - spring[1], 23 * 3600000);
  assert.equal(fall[2] - fall[1], 25 * 3600000);
});

test("a repeated clock hour still belongs to one civil-day domain cell", () => {
  const values = deriveCalendarDayDomain(domain({ start: "2024-11-03", end: "2024-11-03", timeZone: "America/New_York" }));
  const transform = { unit: "day", timeZone: "America/New_York" };
  assert.equal(values.length, 1);
  for (const instant of ["2024-11-03T05:30:00Z", "2024-11-03T06:30:00Z"]) {
    assert.equal(bucketTime(Date.parse(instant), transform), values[0]);
  }
});

test("calendar domains reject a civil date removed by a timezone transition", () => {
  const options = domain({ start: "2011-12-29", end: "2011-12-31", timeZone: "Pacific/Apia" });
  const before = structuredClone(options);
  assert.throws(() => deriveCalendarDayDomain(options), /boundary does not exist/);
  assert.deepEqual(options, before);
  assert.throws(() => deriveCalendarDayDomain({ ...options, start: "2011-12-30", end: "2011-12-30" }), /boundary does not exist/);
  assert.equal(deriveCalendarDayDomain({ ...options, start: "2011-12-31" }).length, 1);
});

test("calendar domains preserve years zero through 99 without Date.UTC remapping", () => {
  for (const date of ["0000-01-01", "0000-02-29", "0099-01-01", "0099-12-31", "9999-12-31"]) {
    for (const timeZone of ["UTC", "Etc/UTC"]) {
      const value = deriveCalendarDayDomain(domain({ start: date, end: date, timeZone }))[0];
      assert.equal(new Date(value).toISOString(), `${date}T00:00:00.000Z`);
      assert.equal(label(value, timeZone), date);
    }
  }
  assert.equal(deriveCalendarDayDomain(domain({ start: "0000-01-01", end: "0000-01-01" }))[0], -62167219200000);
  assert.throws(() => deriveCalendarDayDomain(domain({ start: "0099-02-29", end: "0099-02-29" })), /Gregorian/);
});

test("calendar domain rejects malformed closed input, dates, zones and reversed ranges", () => {
  for (const options of [null, [], new Date()]) assert.throws(() => normalizeCalendarDayDomain(options), /plain object/);
  for (const unit of [undefined, "month", "Day", null]) assert.throws(() => normalizeCalendarDayDomain(domain({ unit })), /unit/);
  for (const value of [undefined, null, 1704067200000, "", "2024-1-01", "2024-01-1", " 2024-01-01", "2024-01-01 ", "2024-01-01T00:00:00Z", "+002024-01-01"]) {
    assert.throws(() => deriveCalendarDayDomain(domain({ start: value })), /YYYY-MM-DD/);
    assert.throws(() => deriveCalendarDayDomain(domain({ end: value })), /YYYY-MM-DD/);
  }
  for (const value of ["2023-02-29", "1900-02-29", "2024-02-30", "2024-04-31", "2024-00-01", "2024-13-01", "2024-01-00", "2024-01-32"]) {
    assert.throws(() => normalizeCalendarDayDomain(domain({ start: value, end: value })), /Gregorian/);
  }
  for (const timeZone of [undefined, null, "", 0, "Not/A_Zone", "+01:00", "-0500"]) {
    assert.throws(() => normalizeCalendarDayDomain(domain({ timeZone })), /timeZone|time zone/);
  }
  assert.throws(() => normalizeCalendarDayDomain(domain({ start: "2025-01-01" })), /after end/);
  assert.throws(() => normalizeCalendarDayDomain(domain({ step: 1 })), /Unknown/);
});

test("calendar domain owns normalized inputs and returns immutable arrays without running getters", () => {
  const options = domain(), before = structuredClone(options);
  const normalized = normalizeCalendarDayDomain(options);
  assert.deepEqual(normalized, before);
  assert.ok(Object.isFrozen(normalized));
  assert.notEqual(normalized, options);
  options.timeZone = "Asia/Seoul";
  assert.equal(normalized.timeZone, "UTC");
  const values = deriveCalendarDayDomain(normalized);
  assert.ok(Object.isFrozen(values));
  assert.deepEqual(normalized, before);
  let calls = 0;
  for (const key of ["unit", "start", "end", "timeZone"]) {
    const malicious = Object.defineProperty(domain(), key, { enumerable: true, get() { calls++; throw new Error("executed"); } });
    assert.throws(() => normalizeCalendarDayDomain(malicious), /accessors/);
    assert.throws(() => deriveCalendarDayDomain(malicious), /accessors/);
  }
  assert.equal(calls, 0);
});

test("calendar preflights inclusive day and boundary work limits before allocating output", () => {
  const options = domain({ start: "2000-01-01", end: "2027-05-18" });
  const values = deriveCalendarDayDomain(options);
  assert.equal(values.length, 10000);
  assert.equal(new Date(values.at(-1)).toISOString(), "2027-05-18T00:00:00.000Z");
  assert.deepEqual(values.map(value => new Date(value).toISOString().slice(0, 10)), gregorianDays(options.start, options.end));
  assert.equal(CALENDAR_BOUNDARY_WORK, 50);
  // A domain at the output cap has at most 510,000 boundary/verification steps.
  assert.ok(values.length * (CALENDAR_BOUNDARY_WORK + 1) < 10000000);
  for (const end of ["2027-05-19", "9999-12-31"]) {
    assert.throws(() => deriveCalendarDayDomain({ ...options, end }), /domain count.*10000/);
    assert.throws(() => normalizeCalendarDayDomain({ ...options, end, timeZone: "Not/A_Zone" }), /domain count.*10000/);
  }
});

test("calendar domain is independent of the process timezone", () => {
  const url = new URL("../../../src/grammar/calendarDay.js", import.meta.url).href;
  const source = `import {deriveCalendarDayDomain} from ${JSON.stringify(url)}; console.log(JSON.stringify(deriveCalendarDayDomain(${JSON.stringify(domain({ start: "2024-03-09", end: "2024-03-11", timeZone: "America/New_York" }))})));`;
  const results = ["UTC", "America/Los_Angeles", "Asia/Seoul"].map(TZ => execFileSync(process.execPath, ["--input-type=module", "-e", source], { env: { ...process.env, TZ }, encoding: "utf8" }));
  assert.equal(results[0], results[1]);
  assert.equal(results[1], results[2]);
});
