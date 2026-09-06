# Phase 6 W2-C 결과 — Reusable wide-to-long fold data

## 결과

- `createFoldData({ id, source?, fields, as? })`를 추가했다.
- Output grain은 정확히 `source row × selected field`이며 source row order 안에서 caller가 준 field
  순서를 보존한다.
- 각 output row는 original source cell을 모두 보존하고 기본 `key`/`value` 또는 custom alias를 추가한다.
- Selected values는 finite number, string, boolean 중 하나의 공통 primitive type으로 제한해 하나의
  long value field가 불명확한 mixed unit/type을 갖지 않게 했다.
- `fold` transform을 advanced `createDerivedData`, statistical topology/replay registry와 strict
  TypeScript union에 연결했다.

## 오류와 불변성

- Empty/duplicate selected fields, row별 missing/null/undefined cell, non-finite/structured value, mixed type,
  output alias 중복과 source field overwrite를 첫 state change 전에 거부한다.
- Selected fields는 최대 64개, expanded output은 최대 10,000 rows다.
- Empty source는 provenance를 가진 empty materialized dataset을 만든다.
- 실패한 호출은 이전 program, caller field list와 source rows를 변경하지 않는다.
- Summary aggregate와 Bin/Fold `as`의 unknown nested property가 normalize 과정에서 사라지던 strictness
  gap도 별도 `7a4b838f` commit에서 고쳤다.

## 검증

- Focused fold/derived/registry tests: 10/10 pass.
- Unit suite: 2,157/2,157 pass.
- Contracts: 310/310 pass.
- Packed consumer: stable wide-to-long runtime, `FoldDataOptions`, `DatasetTransform` compile 포함 pass.
- Packed artifact SHA-256: `c43d1ba475dd35fcabe16d29ef294115fdd269770321d32c925af9ffac070207`.
- Bundle 측정: Full 268,857 gzip bytes / 414 modules, Basic 147,974 / 251, SVG 6,437 / 15.
- Package bound는 새 public action+grammar source 2개에 맞춰 entries 467, packed 542,000 bytes로
  조정했다. Browser gzip bounds는 유지했다.
