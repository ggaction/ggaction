export type ErrorCode = "invalid-option" | "invalid-value" | "missing-resource" |
  "ambiguous-resource" | "incompatible-resource" | "resource-in-use" |
  "resource-limit" | "unsupported-format" | "action-failed";

export interface ErrorDetails {
  readonly code: ErrorCode;
  readonly operation?: string;
  readonly optionPath?: string;
  readonly resourceId?: string;
  readonly candidates?: readonly string[];
  readonly limit?: number;
  readonly actual?: number;
}

export function getErrorDetails(error: unknown): ErrorDetails | undefined;
