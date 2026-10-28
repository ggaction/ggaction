export function tracePath(context, commands) {
  for (const command of commands) {
    if (command.op === "M") {
      context.moveTo(command.x, command.y);
    } else if (command.op === "L") {
      context.lineTo(command.x, command.y);
    } else if (command.op === "C") {
      context.bezierCurveTo(
        command.x1,
        command.y1,
        command.x2,
        command.y2,
        command.x,
        command.y
      );
    } else {
      context.closePath();
    }
  }
}
