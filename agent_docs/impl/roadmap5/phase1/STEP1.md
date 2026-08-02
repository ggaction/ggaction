# STEP 1 — UTC Calendar Derivation

## 진행 상태

- [ ] Current derived-data registry와 replay boundary 확인
- [ ] Independent UTC bucket oracle/fixtures 작성
- [ ] Runtime and declaration implementation
- [ ] Current contract/catalog/docs promotion
- [ ] Focused and cumulative verification
- [ ] Remote Gate checkpoint 기록

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
