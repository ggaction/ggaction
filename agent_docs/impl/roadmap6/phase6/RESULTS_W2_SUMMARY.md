# Phase 6 W2-A 결과 — Reusable summary data

## 결과

- `createSummaryData({ id, source?, groupBy?, aggregates, members? })`를 추가했다.
- 공통 `AggregateOperation`과 `aggregateRows`를 그대로 사용하여 chart-specific aggregate 수학을 복제하지 않는다.
- Observed group은 source first-appearance order를 보존하고 여러 aggregate output을 한 final group row에 만든다.
- Optional `members`는 각 output row에 original group rows를 보존한다.
- Ungrouped empty source는 aggregate identity 한 row, grouped empty source는 빈 observed-group 결과로 정의했다.
- `summary` transform을 advanced `createDerivedData`, facet topology/replay registry와 strict TypeScript union에 연결했다.

## 오류와 불변성

- Duplicate group, output/group/members alias collision, missing field, incompatible numeric type, unsupported
  aggregate, malformed list와 10,000 group 초과를 semantic state 생성 전에 거부한다.
- Caller-owned group/output option과 source rows는 deep ownership 경계를 유지한다.
- 결과는 즉시 mark creation 또는 `bindMarkData`에서 사용할 concrete `values`를 가진다.

## 검증

- Focused summary/registry/advanced transform tests: 10/10 pass.
- Contracts: 310/310 pass.
- Packed consumer: grouped sum+count runtime, `SummaryDataOptions`, `DatasetTransform` compile 포함 pass.
- Packed artifact SHA-256: `5acebafca5be8f9d78148509f151b75df6539acb600d642a403cd26177762208`.
- Bundle 측정: Full 267,161 gzip bytes / 410 modules, Basic 147,964 / 251, SVG 6,437 / 15.
- Package bound는 새 public action+grammar source 2개에 맞춰 entries 463, packed 534,000 bytes,
  Full gzip 269,000 bytes로 조정했다. Basic과 SVG 한도는 유지했다.
