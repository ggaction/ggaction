import { chart } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { exportAccessibleData, type AccessibleData, type AccessibleItemData } from "ggaction/accessibility";
const p = chart(), b = basic();
const table: AccessibleData = exportAccessibleData(p);
const explicit: AccessibleData = exportAccessibleData(b, { format: "table" });
const items: AccessibleItemData = exportAccessibleData(p, { format: "items", target: "bars" });
const key: string = items.views[0].items[0].key;
const selected: readonly string[] = items.views[0].items[0].selectedBy;
const visible: boolean = items.views[0].items[0].visible;
const childPath: readonly string[] = items.views[0].childPath;
const parent: string | null | undefined = items.views[0].items[0].navigation?.parent;
const format: "table" | "items" = Math.random() > .5 ? "table" : "items";
const union: AccessibleData | AccessibleItemData = exportAccessibleData(p, { format });
exportAccessibleData(b, { format: "items" });
// @ts-expect-error snapshots are immutable
items.views[0].items[0].selectedBy.push("bad");
// @ts-expect-error format values are closed
exportAccessibleData(p, { format: "rows" });
// @ts-expect-error select a child program explicitly
exportAccessibleData(p, { format: "items", target: { childPath: ["left"], id: "bars" } });
// @ts-expect-error table views are not the item schema
const wrong: AccessibleItemData = exportAccessibleData(p);
