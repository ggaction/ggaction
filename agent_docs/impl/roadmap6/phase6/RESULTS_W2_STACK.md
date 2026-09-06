# Phase 6 W2-E 결과 — Reusable stack data projection

## 결과

- `createStackData({ id, source?, category, group, value, mode?, as? })`를 추가했다.
- `stack`, `fill`, `center`, `diverging`가 Phase 4의 canonical `layoutSeriesPartition`을 직접 호출하므로
  Bar/Area stack 수학을 복제하지 않는다.
- Category partition과 global group stack order는 source first appearance를 사용하고 output은 original row
  order와 모든 source cell을 보존한다.
- 각 row에 start/end/raw value/absolute-magnitude share를 추가한다. Zero cell은 zero-thickness endpoint와
  share 0으로 남는다.
- `stack` transform을 advanced `createDerivedData`, statistical topology/replay registry와 strict
  TypeScript union에 연결했다.

## 오류와 불변성

- Category/group/value role collision, missing/non-finite cell, duplicate category/group cell, invalid mode,
  non-negative mode의 negative value와 output alias/source collision을 첫 state change 전에 거부한다.
- Missing category/group 조합은 합성하지 않으며 source row 최대 10,000개만 materialize한다.
- Fill/stack/center precision과 overflow, diverging sign accumulation은 shared Phase 4 owner의 오류를 그대로
  사용한다.
- 실패한 호출은 이전 program, caller options와 source rows를 변경하지 않는다.

## 검증

- Focused stack/derived/registry tests: 10/10 pass.
- Unit suite: 2,165/2,165 pass.
- Contracts: 310/310 pass.
- Packed consumer: endpoints/shares runtime, `StackDataOptions`, `DatasetTransform` compile 포함 pass.
- Packed artifact SHA-256: `ddc67b9ad29be3d260271643621d29bb9ef01ab4bba0b546a3f87b318d938152`.
- Bundle 측정: Full 270,826 gzip bytes / 418 modules, Basic 147,995 / 251, SVG 6,437 / 15.
- Package bound는 새 public action+grammar source 2개에 맞춰 entries 471, packed 550,000 bytes로
  조정했다. Browser gzip bounds는 유지했다.

## W2 종합

- Summary, bin, fold, computed, stack의 다섯 reusable materializing transform이 모두 concrete values와
  immutable provenance를 한 호출에서 완성한다.
- 각 transform은 public types/current contract/action card/docs/package consumer와 동기화됐다.
- Callback/eval transform은 추가하지 않았고 Histogram/aggregate/Phase 4 stack 계산은 기존 owner를
  재사용했다.
