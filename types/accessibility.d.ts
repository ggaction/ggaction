import type { ChartProgram } from "./program.js";
import type { BasicChartProgram } from "./basic.js";

export interface AccessibleColumn {
  readonly key: string;
  readonly role: string;
  readonly component: string;
  readonly field?: string;
  readonly aggregate?: string;
  readonly unit?: "utc-milliseconds";
}
export interface AccessibleRow {
  readonly component: string;
  readonly series: Readonly<Record<string, unknown>>;
  readonly values: Readonly<Record<string, unknown>>;
}
export interface AccessibleOwnerView {
  readonly ownerId: string;
  readonly markType: string;
  readonly columns: readonly AccessibleColumn[];
  readonly rows: readonly AccessibleRow[];
  readonly units: Readonly<Record<string, "utc-milliseconds">>;
}
export interface AccessibleChildView {
  readonly ownerId: string;
  readonly kind: "composition-child";
  readonly title: string | null;
  readonly facet?: Readonly<Record<string, unknown>>;
  readonly views: readonly AccessibleView[];
}
export type AccessibleView = AccessibleOwnerView | AccessibleChildView;
export interface AccessibleData {
  readonly schemaVersion: 1;
  readonly title: string | null;
  readonly views: readonly AccessibleView[];
}

/** One final native logical item. Visibility does not infer opacity or clipping. */
export interface AccessibleItem {
  readonly key: string;
  readonly component: string;
  readonly markType: string;
  readonly role?: string;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly channels: Readonly<Record<string, unknown>>;
  readonly selectedBy: readonly string[];
  readonly visible: boolean;
  readonly representationKeys?: readonly string[];
  /** Native hierarchy node keys, local to this view's childPath and component. */
  readonly navigation?: Readonly<Record<"key" | "parent" | "firstChild" | "previousSibling" | "nextSibling" | "root", string | null>>;
}
export interface AccessibleItemView {
  readonly kind: "items";
  readonly ownerId: string;
  readonly markType: string;
  readonly childPath: readonly string[];
  readonly items: readonly AccessibleItem[];
}
export interface AccessibleItemData {
  readonly schemaVersion: 1;
  readonly format: "items";
  readonly title: string | null;
  readonly views: readonly AccessibleItemView[];
}
export function exportAccessibleData(program: ChartProgram | BasicChartProgram, options: { readonly format: "items"; readonly target?: string }): AccessibleItemData;
export function exportAccessibleData(program: ChartProgram | BasicChartProgram, options?: { readonly format?: "table"; readonly target?: string }): AccessibleData;
export function exportAccessibleData(program: ChartProgram | BasicChartProgram, options: { readonly format?: "table" | "items"; readonly target?: string }): AccessibleData | AccessibleItemData;
