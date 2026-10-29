import { requireStoredResource } from "../../selectors/resources.js";
export function calendarScaleValues(program, consumer) {
  if (consumer.channel !== "color") throw new TypeError("Calendar supports only its intrinsic color scale.");
  const layout = requireStoredResource(program, consumer.layer.calendarBinding.layout);
  return layout.result.cells.flatMap(cell => cell.value === null ? [] : [cell.value]);
}
