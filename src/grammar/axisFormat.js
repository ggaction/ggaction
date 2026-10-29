import { formatNumericTickValues } from "./ticks.js";
import { formatVisibleText } from "../core/textMetrics.js";
import { formatValue, isUtcValueFormat, validateValueFormat } from "./valueFormat.js";

export function validateAxisFormat(format) {
  if (format === "ticks") return format;
  return validateValueFormat(format, "Label format", {
    allowDecimalsObject: true
  });
}

export function formatNumericAxisTicks(values, scaleType) {
  if (["ordinal", "band", "point", "time"].includes(scaleType)) {
    throw new Error('Axis format "ticks" requires a quantitative scale.');
  }
  return formatNumericTickValues(values);
}

export function formatAxisValue(value, scaleType, format, autoFormatter) {
  if (format === "ticks") {
    throw new Error('Axis format "ticks" requires the complete settled tick values.');
  }
  validateAxisFormat(format);
  if (format === "auto") return formatVisibleText(autoFormatter(value));
  if (["ordinal", "band", "point"].includes(scaleType)) {
    throw new Error('Discrete axis labels require format "auto".');
  }
  if (scaleType === "time") {
    if (!isUtcValueFormat(format)) {
      throw new Error("Time axis labels require a supported time format string.");
    }
    return formatValue(value, {
      format,
      valueType: "temporal",
      label: "Axis label format"
    });
  }
  if (isUtcValueFormat(format)) {
    throw new Error("Quantitative axis labels cannot use a time format string.");
  }
  return formatValue(value, {
    format,
    valueType: "quantitative",
    label: "Axis label format",
    allowDecimalsObject: true
  });
}
