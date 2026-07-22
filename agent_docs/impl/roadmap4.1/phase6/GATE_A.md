# Gate R41-P6-A — Statistical Owner Revisions

## Gate state

`ready-for-review`

## Review target

Phase 6의 error bar/band statistical revision, error-band boundary lifecycle, density source/field/group revision과
regression data/x/y/group revision vertical slice 전체다.

## Exact public calls

```javascript
program.editErrorBar({
  statistics: { center: "median", extent: "iqr" }
});

program.editErrorBand({
  statistics: { extent: "ci", level: 0.9 },
  boundaries: false
});
program.editErrorBand({
  boundaries: { stroke: "#334155", strokeWidth: 1.5 }
});

program.editDensity({ source: "observations", field: "value", groupBy: false });
program.editRegression({ data: "observations", x: "time", y: "value", groupBy: false });
```

Omitted option은 current owner provenance/component state를 보존한다. Empty top-level edit와 empty `statistics`는
거부한다. Error bar/band statistics가 normalized current provenance와 같으면 data revision 없이 ordinary
rematerialization만 수행한다. Regression data/statistical candidate가 current와 같으면 fitted-data revision을 만들지
않는다. Density는 기존 statistics/placement edit 호환성대로 accepted edit마다 revision을 만든다.

## Resolution, preflight and trace

- Error bar/band의 stable owner는 main rule/area다. `statistics`는 owner dataset의 exact one `interval` transform에서만
  dispatch하며 explicit center/lower/upper owner는 mode conversion 없이 거부한다. Partial center/extent/level은 complete
  combination으로 normalize하고 median↔IQR 및 CI-only level 규칙을 speculative branch에서 먼저 검증한다.
- Interval revision ID는 `${owner}IntervalDataRevision${n}`이다. Enabled cap/boundary만 consumer plan에 포함하며 main과
  모든 enabled child를 explicit `rebindLayerData`한다. Main config data를 새 ID로 옮긴 뒤 mark rematerializer가 scale과
  current highlight를 clean baseline에서 재적용하고 old orphan을 release한다.
- Error-bar representative trace는 `createIntervalData`, main/lower/upper `rebindLayerData`,
  `rematerializeErrorBar`, `releaseDerivedData`다. Error-band statistics+disable trace는 `createIntervalData`, body/lower/upper
  rebind, body rematerialization, 두 boundary의 semantic/graphic removal, release 순서다.
- `boundaries: false`는 already-disabled에서도 성공하며 body, interval data와 deterministic child role IDs를 보존한다.
  `{}`는 both boundaries를 default appearance로 만들고 non-empty appearance는 missing component create와 existing
  component edit를 한 owner call에서 수행한다. Removed boundary가 소유한 selection/highlight/config/context도 정리한다.
- Density는 `source`, `field`, `groupBy` complete candidate와 placement/color compatibility를 preflight한다. Output field,
  density channel, coordinate와 x/y scale ID를 보존한다. `groupBy: false`는 group과 group-owned color/legend를 제거하고,
  group replacement는 default category field와 grouping color를 새 field로 옮긴다. Representative trace는
  `createDensityData`, `rebindLayerData`, `releaseDerivedData`, semantic group cleanup, affected mark plan이다.
- Regression은 stable point owner를 유지하고 derived line/optional band만 새 fitted data에 bind한다. `data`, `x`, `y`,
  `groupBy`와 method parameters의 complete candidate를 speculative branch에서 derive한다. Line/band IDs, coordinate와
  position scale IDs는 유지하고 component field/group encodings와 error-band provenance를 함께 바꾼다. Point와 새 group의
  color 의미가 다르면 `${owner}RegressionColor`로 분리한다. Representative ungroup trace는 `createRegressionData`, two
  rebinds, component semantic cleanup, area/line rematerialization, release다.
- Speculative execution이 derivation, scale, field, component 또는 materialization failure를 잡으면 그 branch trace와
  state를 버린다. Actual execution은 같은 validated plan을 한 번만 남긴다. Earlier program, caller input, source rows,
  unrelated dataset/layer/scale와 retained shared prior revision은 immutable하다.

## Resulting state and compatibility

- Representative error bar는 `errorBarIntervalDataRevision1`에 main과 both caps가 bind되고 old interval data가 orphan이면
  제거된다. Error band body/boundaries도 same revision을 공유하며 disable/recreate 뒤 child IDs가 바뀌지 않는다.
- Representative density는 `densityDensityDataRevision1`, regression은 `pointsRegressionDataRevision1`을 사용한다.
  Regression point owner의 source layer/data는 바뀌지 않고 only fitted components가 revision을 소비한다.
- Density/regression source/field 변경 뒤 stored selection과 highlight는 current final items에서 다시 적용된다. Group
  removal은 stale group/color semantic encoding과 owned legend를 남기지 않는다.
- Existing appearance-only error bar/band/regression calls, density statistical/placement revisions, explicit interval create와
  create-time grouping/method/boundary calls의 기존 tests가 모두 그대로 통과한다. 새 chart, renderer, persisted schema,
  package entry point 또는 macro architecture boundary는 추가하지 않았다.
- Runtime, strict declarations, Current `STATISTICS.md`/`ENCODINGS.md`, `ACTION_INDEX.json`, generated catalog/reference/search/
  LLM docs와 public API pages를 동기화했다. `statistical-owner-revisions`는 Planned inventory에서 제거되었다.

## Required evidence

- Statistical-owner-only interval dispatch and complete interval candidate validation
- Boundary false/object removal, retained body/data and ordinary recreation
- Density/regression source, role and grouping revisions with preserved stable identities
- Immutable derived revision, exact rebind/rematerialization/release trace
- Scale/guide/selection/highlight replay and downstream failure atomicity
- Previous program, caller input, source rows and unrelated resource preservation
- Existing valid call compatibility and focused/cumulative/Browser/PNG/package evidence

## Verification evidence

- Four focused lifecycle test files: 29/29 pass. Exact Current contract/type/Canvas/Node-PNG tests: 2/2 pass.
- Normal cumulative suite: 1,897/1,897 pass.
- Coverage: 94.7% lines, 90.05% branches and 98.52% functions; all 68 critical floors pass.
- Node render suite: 124/124 pass; generated 123 approved variants and zero active-review variants. Both approved and empty
  review galleries pass Playwright browser loading verification.
- Browser suite: 47/47 pass, including packed default entry, all public logical Canvas sizes, high pixel density,
  accessibility readiness and no console/page errors.
- Exact Gate contract renders error bar, error band disable/recreate, density source/field/ungroup and regression
  data/x/y/ungroup calls through mock Canvas and Node PNG at 2× (520×400 each), all non-empty.
- Generated contract/docs checkers and 37/37 docs tests pass. `git diff --check` passes.
- Package boundary: 382 entries, 354,458 packed bytes and 1,665,650 unpacked bytes; bounded entry, 400KB packed and
  1,675,000-byte unpacked ceilings pass.
- Installed package consumer passes Node, extension, PNG, TypeScript, tutorial, private-export and compatibility probes.
  Tarball SHA-256 is `229a280dafe8a7c0cb5c293b150dc74164cc3a5f2233e9ab744933830fbae15d`.
- Verified functional and exact-render remote checkpoint: `c2c448b7` on `origin/codex/roadmap4-1-lifecycle`.

## Approval effect

Approval은 Phase 6 statistical/data owner revision과 boundary lifecycle 결과를 고정하고 Phase 7 box/gradient data and
positional-role revisions를 허용한다. PR creation, npm publishing과 docs deployment 권한은 포함하지 않는다.

## Work blocked before approval

Phase 7 box/gradient data and positional-role revisions.
