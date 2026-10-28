/** Review-only contract, not a ggaction export. */
export type ParameterType = 'number' | 'string' | 'boolean';
export type ParameterValue = number | string | boolean | null;
type Definition<T extends ParameterType, V> =
  | { readonly type?: T; readonly value: V; readonly nullable?: boolean }
  | { readonly type: T; readonly value: null; readonly nullable: true };
export type CreateParameterOptions = { readonly id: string } & (
  Definition<'number', number> | Definition<'string', string> | Definition<'boolean', boolean>
);
export interface EditParameterOptions {
  readonly target: string;
  /** Runtime checks against the existing resource's type and nullability. */
  readonly value: ParameterValue;
}
export interface RemoveParameterOptions { readonly id: string }
export interface ParameterRef {
  readonly kind: 'parameter'; readonly id: string; readonly revision: number;
}
export interface ParameterResource extends ParameterRef {
  readonly algorithmVersion: '1';
  readonly ownership: { readonly mode: 'authored' };
  readonly inputs: readonly [];
  readonly options: { readonly type: ParameterType; readonly nullable: boolean };
  readonly result: { readonly value: ParameterValue };
  readonly provenance: { readonly origin: 'authored' };
}
/** Narrow proposed method view; ordinary existing methods are omitted, not removed. */
export interface ProposedBasic {
  createParameter(options: CreateParameterOptions): ProposedBasic;
}
export interface ProposedFull extends ProposedBasic {
  createParameter(options: CreateParameterOptions): ProposedFull;
  editParameter(options: EditParameterOptions): ProposedFull;
  removeParameter(options: RemoveParameterOptions): ProposedFull;
}
