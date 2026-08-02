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

## Verification

| Check | Result |
| --- | --- |
| Focused time-unit grammar/action | 7 pass |
| Full repository suite | 1,946 pass |
| Contract suite | 160 pass |
| Coverage | 94.67% lines, 90.03% branches, 98.45% functions; 68 floors pass |
| Documentation | 45 source tests; 112 built pages; desktop and 320/390/768px browser pass |
| Installed package | Runtime, strict TypeScript, tutorials, three bundle entries and export checks pass |

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

Pending the verified package commit. A metadata-only follow-up records its exact commit after push.

## Approval effect

승인하면 Phase 2 semantic category ordering implementation을 시작할 수 있다. PR creation, publish, deployment와
release 권한은 포함하지 않는다.

## Work blocked before approval

- `orderCategories`/`removeCategoryOrder` runtime implementation
- Phase 3 이후 capability implementation
