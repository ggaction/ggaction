function translateCommands(commands, dx, dy) {
  return commands.map(command => {
    if (command.op === "Z") return { ...command };
    const next = {
      ...command,
      x: command.x + dx,
      y: command.y + dy
    };
    if (command.op === "C") {
      next.x1 = command.x1 + dx;
      next.y1 = command.y1 + dy;
      next.x2 = command.x2 + dx;
      next.y2 = command.y2 + dy;
    }
    return next;
  });
}

export function translatedProperties(type, properties, dx, dy) {
  const next = { ...properties };
  if (["circle", "rect", "text", "canvas"].includes(type)) {
    next.x = (next.x ?? 0) + dx;
    next.y = (next.y ?? 0) + dy;
  } else if (type === "line") {
    next.x1 += dx;
    next.x2 += dx;
    next.y1 += dy;
    next.y2 += dy;
  } else if (type === "path") {
    next.commands = translateCommands(next.commands, dx, dy);
  }
  return next;
}

export function translateGraphic(program, id, dx, dy) {
  const graphic = program.graphicSpec.objects[id];
  if (dx === 0 && dy === 0) return program;
  if (graphic.items !== undefined) {
    let next = program.editGraphics({
      target: id,
      property: "items",
      value: graphic.items.map(item => ({
        type: item.type ?? graphic.type,
        properties: translatedProperties(
          item.type ?? graphic.type,
          item.properties,
          dx,
          dy
        )
      }))
    });
    if (graphic.type !== "canvas") {
      for (const child of graphic.children ?? []) next = translateGraphic(next, child, dx, dy);
    }
    return next;
  }
  let next = program;
  const properties = translatedProperties(
    graphic.type,
    graphic.properties,
    dx,
    dy
  );
  for (const [property, value] of Object.entries(properties)) {
    if (value !== graphic.properties[property]) {
      next = next.editGraphics({ target: id, property, value });
    }
  }
  if (graphic.type !== "canvas") {
    for (const child of graphic.children ?? []) next = translateGraphic(next, child, dx, dy);
  }
  return next;
}
