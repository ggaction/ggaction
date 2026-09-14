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
export function exportAccessibleData(program: ChartProgram | BasicChartProgram, options?: { readonly target?: string }): AccessibleData;
