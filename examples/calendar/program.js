import { chart } from "../../src/index.js";
import { calendarOptions } from "./fixture.js";
export function createCalendar(id = "year") {
  const options = calendarOptions(id);
  return chart().createCanvas(options.canvas).createData(options.data)
    .createCalendarLayout(options.layout).createCalendarPlot(options.plot).createTitle(options.title);
}
