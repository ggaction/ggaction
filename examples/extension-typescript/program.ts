import { action, ChartProgram } from "ggaction/extension";

type SetPointOpacityOptions = Record<string, unknown> & {
  target: string;
  value: number;
};

class MyProgram extends ChartProgram {}

const setPointOpacityAction = action<SetPointOpacityOptions>(
  {
    op: "setPointOpacity",
    description: "Set the opacity of a point mark."
  },
  function ({ target, value }) {
    const withTarget = this.graphicSpec.objects[target] === undefined
      ? this.createGraphics({ id: target, type: "circle" })
      : this;
    return withTarget.editGraphics({
      target,
      property: "opacity",
      value
    });
  }
);

const markReadyAction = action(
  {
    op: "markReady",
    description: "Record that extension authoring is complete."
  },
  function () {
    return this;
  }
);

interface MyProgram {
  setPointOpacity: typeof setPointOpacityAction;
  markReady: typeof markReadyAction;
}

MyProgram.prototype.setPointOpacity = setPointOpacityAction;
MyProgram.prototype.markReady = markReadyAction;

export const extensionProgram = new MyProgram()
  .setPointOpacity({ target: "points", value: 0.5 })
  .markReady();
