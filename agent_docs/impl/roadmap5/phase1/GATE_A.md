# Gate R5-P1-A — UTC Time-Unit Derived Data

## Gate state

`ready-for-review`

## Review target

Approved `createTimeUnitData` contract의 complete vertical slice다.

## Exact public call

```javascript
program.createTimeUnitData({
  id: "monthly",
  source: "events",
  field: "date",
  unit: "month",
  as: "month"
});
```

`source`를 생략하면 current dataset을 사용한다. Source row와 순서를 보존한 새 dataset을 만들고 `month`에는 각
입력의 UTC 월 시작 timestamp를 기록한다. 원본 program과 caller-owned options는 바뀌지 않는다.

## Review evidence

- Seven supported units의 literal UTC 시작값, leap day, quarter boundaries, sub-day values와 early four-digit year를
  independent expectations로 검증했다.
- Number, ISO datetime, date-only와 year input을 검증하고 invalid/missing dates, output collision, duplicate ID,
  unknown source와 closed options를 atomic errors로 검증했다.
- Stored transform provenance, meaningful `createDerivedData → materializeTimeUnitData → editSemantic` trace,
  registered replay와 row-preserving facet rederivation을 검증했다.
- Derived timestamp를 ordinary temporal point encoding에 공급해 materialized items와 resolved time domain을 검증했다.
- Runtime registration, strict declarations, Current/internal contracts, generated catalog/reference/search/LLM docs,
  installed package consumer를 같은 slice로 동기화했다.

## Visual review evidence

왼쪽은 source timestamp를 그대로 temporal x에 사용하고, 오른쪽은 아래 public action으로 만든 `month` field를
동일한 x domain에 사용한다. 따라서 orange points가 월 안에 흩어진 상태에서 blue points가 1월·2월·3월의 UTC
month-start vertical columns로 정렬되는 변화를 직접 비교할 수 있다.

```javascript
chart()
  .createCanvas({ width: 440, height: 360 })
  .createData({ id: "events", values: rows })
  .createTimeUnitData({
    id: "monthlyEvents",
    field: "date",
    unit: "month",
    as: "month"
  })
  .createScatterPlot({
    id: "bucketedEvents",
    data: "monthlyEvents",
    x: { field: "month", fieldType: "temporal" },
    y: { field: "order", fieldType: "quantitative" }
  })
  .encodePointRadius({ target: "bucketedEvents", value: 7 })
  .createTitle({
    text: "After",
    subtitle: "Each event snaps to its UTC month start",
    align: "center"
  });
```

- Exact executable public source: `test/gates/time-unit-data/public.program.js`
- Independent primitive source: `test/gates/time-unit-data/primitive.program.js`
- Manifest and displayed chains: `test/gates/time-unit-data/manifest.js`
- Primitive: `.artifacts/test/png/review/time-unit-data/month-bucketing/primitive.png`
- Public: `.artifacts/test/png/review/time-unit-data/month-bucketing/user-facing.png`
- Physical size: 1856×768 at pixel ratio 2; logical size 928×384.
- Primitive/public PNG SHA-256 identity:
  `941539b5878db9dbd815b3de3c1546e789eaf59e5c4404050369f596b69c8645`.
- Gate normal tests prove nine literal month outputs, source-field preservation, exact public trace and graphic equivalence.

## Verification

| Check | Result |
| --- | --- |
| Focused time-unit grammar/action | 7 pass |
| Full repository suite | 1,948 pass, including active visual Gate |
| Contract suite | 160 pass |
| Coverage | 94.67% lines, 90.03% branches, 98.45% functions; 68 floors pass |
| Documentation | 45 source tests; 112 built pages; desktop and 320/390/768px browser pass |
| Installed package | Runtime, strict TypeScript, tutorials, three bundle entries and export checks pass |
| Active visual Gate | 2 normal tests and 1 primitive/public render pair pass; decoded pixels are identical |

The first network-enabled package run encountered the existing asynchronous tutorial Canvas ink check once; an immediate
no-code-change rerun and the final package run both passed. Documentation source/build checks ran with pinned Ruby 3.2.6;
the browser check was rerun outside the filesystem sandbox only to permit a local `127.0.0.1` test server.

## Package impact

Two runtime files and synchronized declarations/docs raise the artifact to 401 entries, 371,825 packed bytes and
1,754,306 unpacked bytes. The installed tarball SHA-256 is
`bfa5a5a51638b30fb9298003d0a8b3034561905586f5570e25f16beaff5c2b05`. The
entry limit is narrowly adjusted from 399 to 405 and unpacked limit from 1.750 MB to 1.780 MB; the 400 KB packed limit is
unchanged.

## Remote checkpoint

- Runtime review commit: `e98f418d` (`feat: add UTC time-unit data`)
- Visual evidence commit: pending verified visual package commit
- Remote branch: `origin/codex/roadmap5-temporal-ordering-directional-marks`

## Approval effect

승인하면 Phase 2 semantic category ordering implementation을 시작할 수 있다. PR creation, publish, deployment와
release 권한은 포함하지 않는다.

## Work blocked before approval

- `orderCategories`/`removeCategoryOrder` runtime implementation
- Phase 3 이후 capability implementation
