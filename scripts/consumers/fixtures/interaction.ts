import { chart } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { createInteractionSession, type InteractionCommand, type InteractionEvent } from "ggaction/interaction";
import { createTransitionScene } from "ggaction/scene";
const program = chart();
const session = createInteractionSession({ program, bindings: [{ type: "inspect", events: ["click"] }] });
createInteractionSession({ program: basic(), bindings: [] });
const command: InteractionCommand = { type: "frame", scene: createTransitionScene(program, { format: "canvas" }), version: 1, generation: 0 };
session.dispatch(command);
session.dispatch({ type: "inspect", point: { x: 5, y: 6 }, pointerType: "touch", slop: 2 });
declare const element: HTMLCanvasElement;
const unmount = session.mount(element, { rootTransform: [1, 0, 0, 1, 0, 0] });
const unsubscribe = session.subscribe((event: InteractionEvent) => { const key: string | undefined = event.state.hit?.target?.itemKey; });
session.updateProgram(program); unsubscribe(); unmount(); session.destroy();
// @ts-expect-error unsupported controller binding
createInteractionSession({ program, bindings: [{ type: "drag" }] });
// @ts-expect-error unsupported implicit pixel ratio conversion
session.mount(element, { pixelRatio: 2 });
// @ts-expect-error sampled SVG fragments are not Canvas frames
session.dispatch({ type: "frame", scene: createTransitionScene(program), version: 1, generation: 0 });
// @ts-expect-error inspection metadata is immutable
session.getState().hit!.target!.itemKey = "change";
