# Roadmap 2.1 Closeout

## 결과

`ggaction@0.0.2` 외부 평가의 F-001~F-007을 모두 재현하고, current `main`에서 공유 원인을 수정했다.
각 finding은 독립 conceptual commit과 최소 재현 기반 회귀 테스트를 가지며, public signature를 제거하거나
이름을 바꾸지 않았다.

| Finding | 공유 원인과 수정 | 회귀 근거 | Commit |
| --- | --- | --- | --- |
| F-007 | bar layout endpoint와 scale domain이 다른 baseline을 사용하던 문제를 semantic zero endpoint로 통일 | signed group/overlay matrix, incompatible domain/type, resize/editScale | `05ea426` |
| F-001 | complete ranged/aggregate bar eligibility가 canonical default width를 소비하지 않던 문제 수정 | vertical/horizontal ranged, aggregate, width override, rematerialization | `fa863ad` |
| F-002A | ranged area 판정이 `y2`만 보던 orientation asymmetry 수정 | horizontal statistical/explicit color composition | `f2d732e` |
| F-002B | ordinary line position policy가 materializer가 지원하는 quantitative direct path를 막던 문제 수정 | horizontal explicit lower/upper boundary paths | `0dcb067` |
| F-003 | size legend dispatch와 guide applicability가 color/shape eligibility에 결합된 문제 분리 | size-only explicit/inferred/automatic, ambiguity, resize | `3f7fd8a` |
| F-004 | tick interval과 auto formatter precision이 분리된 문제를 distinct-label refinement로 수정 | year~second spans, leap/boundary/reversed/explicit format | `34db6e5` |
| F-005 | runtime transform registry와 public type/docs가 분리된 문제 수정 | four public transform branches, strict TS, invalid shapes, deep ownership | `8a5125f` |
| F-006 | public state 개념과 exact inspection path가 분리된 문제 수정 | point/bar/line cardinality, strict TS, docs path contract | `4515699` |

## 호환성 판단

- 기존 action 이름과 runtime method signature는 유지했다.
- F-001, F-002, F-003은 documented valid flow를 정상 동작시키는 additive correction이다.
- F-004는 distinct temporal tick의 automatic display text를 더 구체적으로 만들 수 있다. Explicit format은 유지한다.
- F-007은 잘못된 aggregate bar geometry를 semantic zero baseline으로 바꾸므로 rendered output이 의도적으로 달라진다.
- F-005는 `createDerivedData`의 loose `Record<string, unknown>` declaration을 closed public transform union으로
  좁힌다. 유효한 inline call은 source-compatible하다. 동적으로 조립한 option은 TypeScript가 discriminant를
  보존하도록 `DatasetTransform` 또는 `CreateDerivedDataOptions`로 명시한다.
- F-006은 public state declarations를 더 구체화하며 runtime state를 바꾸지 않는다. User IDs와 collection paths는
  stable contract이고 system-generated component/item IDs는 stable contract가 아니다.

## 검증 증거

- 외부 baseline: `/Users/hj/Desktop/ggaction_test/0.0.2/reproductions/run.mjs`가 2026-07-17에 F-001~F-007
  original observations를 모두 다시 confirmed했다.
- Current repository: `npm test` — 1,120 pass.
- Coverage: 95.14% lines, 90.84% branches, 98.20% functions; 23 critical floors pass.
- Package: packed JavaScript, extension, PNG, strict TypeScript와 private-export rejection pass.
- Browser: packed entry와 every registered example pass.
- Render: 77 PNG variants와 Roadmap 2 gallery verification pass.
- Docs: generated image/LLM freshness, Markdown links/anchors/search contracts, Jekyll build, built links/assets와
  desktop/mobile browser checks pass in CI.
- Corrective implementation CI: `https://github.com/hj-n/ggaction/actions/runs/29545320789`.

## 남은 경계

- 외부 reproduction은 published `0.0.2`의 original failure oracle이다. Current 수정은 repository regression으로
  검증하며, 다음 published version은 0.0.2 evidence를 덮어쓰지 않고 새 독립 평가를 받아야 한다.
- `createDerivedData` may record multiple ordered public transforms as provenance, but each built-in value materializer
  intentionally owns one matching transform created by its high-level action.
- Roadmap 2.1은 corrective source candidate를 완성한다. Version bump와 npm publish는 별도 release 결정이다.
