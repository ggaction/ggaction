# Phase 6 W2-B 결과 — Reusable one-dimensional bin data

## 결과

- `createBinData({ id, source?, field, maxBins? | step | boundaries, extent?, nice?, zero?, includeEmpty?, members?, as? })`를 추가했다.
- 기존 Histogram의 `normalizeHistogramBin`, `resolveHistogramBins`, `findHistogramBinIndex`를 그대로 사용해
  경계 계산과 마지막 upper endpoint 포함 규칙을 복제하지 않는다.
- 기본 output은 `<field>_start`, `<field>_end`, `count`이며 `members: true`이면 original rows를
  각 구간에 보존한다. `as`로 모든 output alias를 명시적으로 바꿀 수 있다.
- `includeEmpty`는 기본 true이고, false이면 관측값이 없는 구간만 생략한다.
- materialized transform에는 resolved domain, boundaries, 가능한 경우 step을 provenance로 저장한다.
- `bin` transform을 advanced `createDerivedData`, statistical topology/replay registry와 strict
  TypeScript union에 연결했다.

## 오류와 불변성

- `maxBins`, `step`, `boundaries`는 상호 배타적이며 생략하면 `maxBins: 10`을 사용한다.
- 비수치 input, 오름차순이 아닌 boundaries, source 범위를 포함하지 않는 explicit extent,
  중복 output alias, 잘못된 boolean과 unknown option을 semantic state 생성 전에 거부한다.
- `members: false`에서 `as.members`를 선언하는 모순도 거부한다.
- 실패한 호출은 이전 program과 caller-owned source rows를 변경하지 않는다.
- 결과의 lower/upper/count fields는 ranged Rect 등 downstream mark가 바로 소비할 수 있는 concrete
  values다.

## 검증

- Focused bin tests: 4/4 pass.
- Unit suite: 2,153/2,153 pass.
- Contracts: 310/310 pass.
- Packed consumer: exact boundaries/count runtime, `BinDataOptions`, `DatasetTransform` compile 포함 pass.
- Packed artifact SHA-256: `6a517bd62c6a4c0ca3659dc2f1eff65d35f19b1a5e10e740a1f4963413d92ef2`.
- Bundle 측정: Full 268,154 gzip bytes / 412 modules, Basic 147,971 / 251, SVG 6,437 / 15.
- Package bound는 새 public action+grammar source 2개에 맞춰 entries 465, packed 538,000 bytes로
  조정했다. Full gzip 269,000 bytes, Basic과 SVG 한도는 유지했다.
