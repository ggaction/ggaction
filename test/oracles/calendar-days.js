// Independent Gregorian enumeration: no production imports, Date or Intl.
export function gregorianDays(start, end) {
  let [year, month, day] = start.split("-").map(Number);
  const result = [];
  while (true) {
    const label = [String(year).padStart(4, "0"), String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
    if (label > end) return result;
    result.push(label);
    if (result.length > 10000) throw new RangeError("Gregorian oracle range exceeds 10000 days.");
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    day++;
    if (day > days) { day = 1; month++; }
    if (month > 12) { month = 1; year++; }
  }
}

export const civilDayBoundaries = [
  {
    start: "2024-03-09", end: "2024-03-11", timeZone: "America/New_York",
    expected: ["2024-03-09T05:00:00.000Z", "2024-03-10T05:00:00.000Z", "2024-03-11T04:00:00.000Z"]
  },
  {
    start: "2024-11-02", end: "2024-11-04", timeZone: "America/New_York",
    expected: ["2024-11-02T04:00:00.000Z", "2024-11-03T04:00:00.000Z", "2024-11-04T05:00:00.000Z"]
  },
  {
    start: "2018-11-04", end: "2018-11-05", timeZone: "America/Sao_Paulo",
    expected: ["2018-11-04T03:00:00.000Z", "2018-11-05T02:00:00.000Z"]
  },
  {
    start: "2024-01-01", end: "2024-01-02", timeZone: "Asia/Kolkata",
    expected: ["2023-12-31T18:30:00.000Z", "2024-01-01T18:30:00.000Z"]
  }
];
