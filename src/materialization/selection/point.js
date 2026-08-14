import { createPointShapeGraphic } from "../../grammar/pointShapes.js";
import { finiteMidpoint } from "../../grammar/numeric.js";

function pointCenterAndArea(child) {
  const properties = child.properties;
  if (child.type === "circle") {
    return {
      x: properties.x,
      y: properties.y,
      area: Math.PI * properties.radius ** 2
    };
  }
  if (child.type === "rect") {
    return {
      x: properties.x + properties.width / 2,
      y: properties.y + properties.height / 2,
      area: properties.width * properties.height
    };
  }
  const points = properties.commands.filter(command =>
    command.op === "M" || command.op === "L"
  );
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    left = Math.min(left, current.x);
    right = Math.max(right, current.x);
    top = Math.min(top, current.y);
    bottom = Math.max(bottom, current.y);
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return {
    x: finiteMidpoint(left, right),
    y: finiteMidpoint(top, bottom),
    area: Math.abs(twiceArea) / 2
  };
}

function transformCommand(command, geometry, center, scale) {
  if (command.op === "Z") return command;
  const transform = (x, y) => ({
    x: center.x + (x - geometry.x) * scale,
    y: center.y + (y - geometry.y) * scale
  });
  if (command.op !== "C") {
    return { op: command.op, ...transform(command.x, command.y) };
  }
  const control1 = transform(command.x1, command.y1);
  const control2 = transform(command.x2, command.y2);
  return {
    op: "C",
    x1: control1.x,
    y1: control1.y,
    x2: control2.x,
    y2: control2.y,
    ...transform(command.x, command.y)
  };
}

export function transformPointHighlightChild(child, style) {
  const geometry = pointCenterAndArea(child);
  const center = {
    x: geometry.x + style.offset.x,
    y: geometry.y + style.offset.y
  };
  const area = geometry.area * style.size;
  const shared = {
    fill: style.fill ?? child.properties.fill,
    ...(style.opacity === undefined
      ? (child.properties.opacity === undefined ? {} : { opacity: child.properties.opacity })
      : { opacity: style.opacity }),
    ...(style.stroke === undefined ? {} : { stroke: style.stroke }),
    ...(style.strokeWidth === undefined ? {} : { strokeWidth: style.strokeWidth })
  };
  if (style.shape !== undefined) {
    return createPointShapeGraphic({
      shape: style.shape,
      ...center,
      area,
      ...shared
    });
  }
  const scale = Math.sqrt(style.size);
  if (child.type === "circle") {
    return {
      type: "circle",
      properties: {
        ...child.properties,
        ...center,
        radius: child.properties.radius * scale,
        ...shared
      }
    };
  }
  if (child.type === "rect") {
    const width = child.properties.width * scale;
    const height = child.properties.height * scale;
    return {
      type: "rect",
      properties: {
        ...child.properties,
        x: center.x - width / 2,
        y: center.y - height / 2,
        width,
        height,
        ...shared
      }
    };
  }
  return {
    type: "path",
    properties: {
      ...child.properties,
      commands: child.properties.commands.map(command =>
        transformCommand(command, geometry, center, scale)
      ),
      ...shared
    }
  };
}
