import { chart } from "../../src/index.js";

// FiveThirtyEight daily United States births, 2014 only.
export function createUsBirthsCalendar(births) {
  const days = births
    .filter(row => row.year === 2014)
    .map(row => ({
      date: `2014-${String(row.month).padStart(2, "0")}-${String(row.date_of_month).padStart(2, "0")}`,
      births: row.births
    }));

  return chart()
    .createCanvas({
      width: 960,
      height: 250,
      margin: { top: 80, right: 130, bottom: 20, left: 50 }
    })
    .createData({ id: "births", keyField: "date", values: days })
    .createCalendarLayout({
      id: "days",
      date: "date",
      value: "births",
      start: "2014-01-01",
      end: "2014-12-31",
      timeZone: "UTC",
      weekStartsOn: 1,
      aggregate: "sum",
      missing: "empty"
    })
    .createCalendarPlot({
      color: { type: "sequential", palette: "viridis" },
      labels: { week: false },
      monthBoundary: { stroke: "#475569", strokeWidth: 1 }
    })
    .createLegend({ target: "calendar", title: "Births per day" })
    .createTitle({
      text: "United States births in 2014",
      subtitle: "Weekends and holidays have far fewer births than weekdays"
    });
}
