# STEP 1 — UTC Calendar Derivation

## 진행 상태

- [x] Current derived-data registry와 replay boundary 확인
- [x] Independent UTC bucket oracle/fixtures 작성
- [x] Runtime and declaration implementation
- [x] Current contract/catalog/docs promotion
- [x] Focused and cumulative verification
- [x] Remote Gate checkpoints 기록 (`e98f418d`, `5d419979`)

## Approved contract

```javascript
program.createTimeUnitData({
  id: "monthly",
  source: "events",
  field: "date",
  unit: "month",
  as: "month"
});
```

- Input row order와 모든 existing fields를 보존한다.
- `as` field에는 UTC bucket 시작의 finite timestamp를 쓴다.
- Units: year, quarter, month, day, hour, minute, second.
- Invalid temporal input, output collision와 invalid/duplicate IDs는 첫 state change 전에 오류다.
- Transform provenance는 type, input field, unit과 output field를 저장한다.

## Required evidence

- Literal leap-year, quarter/month boundary와 sub-day UTC expectations
- Number, ISO string, date-only string과 four-digit year input
- Every unit, row order, source immutability와 caller-option isolation
- Explicit/current source, unknown source, output collision와 invalid temporal value
- Meaningful action hierarchy and registered derived replay
- Filter/facet replay and ordinary time scale/axis consumption
- Declarations, current contract, catalog, docs and installed consumer
- Primitive/public pixel-identical before/after UTC month-bucketing comparison

## Implemented slice

- `createTimeUnitData`는 `year | quarter | month | day | hour | minute | second`를 UTC bucket 시작
  timestamp로 materialize한다.
- Stored transform은 `{ type: "timeUnit", field, unit, as }`이며 derived replay registry에서
  `materializeTimeUnitData`로 다시 계산된다.
- Source/current resolution, create-only ID, row order, caller input ownership, output collision과 invalid date rejection을
  immutable action chain 안에서 보장한다.
- Row-preserving facet replay 후에도 각 child가 자기 partition에서 같은 transform을 materialize한다.
- Derived temporal field는 기존 point mark의 ordinary temporal x encoding과 resolved time scale에 바로 연결된다.
- Review comparison은 original dates가 월 안에 흩어진 왼쪽 panel과 UTC month-start 세로열로 정렬된 오른쪽
  panel을 같은 domain과 event order로 나란히 보여준다.

## Verification snapshot

- Focused grammar/action tests: 7 pass.
- Full repository suite: 1,949 pass, including the approved stable visual slice.
- Contract suite: 160 pass.
- Coverage: 94.67% lines, 90.03% branches, 98.45% functions; 68 critical floors pass.
- Documentation: 45 source tests, 112 built pages, desktop search와 320/390/768px browser checks pass under
  repository-pinned Ruby 3.2.6.
- Installed package consumer: Node runtime, strict TypeScript, tutorials, full/basic/SVG bundles와 private-export checks pass.
- Package budget는 두 source entries와 declarations/docs 증가를 반영해 entry ceiling `399 → 405`, unpacked ceiling
  `1,750,000 → 1,780,000`으로 좁게 조정했다. Packed ceiling `400,000`은 유지했다.
