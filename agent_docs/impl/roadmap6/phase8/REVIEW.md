# Roadmap 6 Phase 8 X — Statistical and endpoint chart closeout

## 고정 결과

- 검증된 source/result ref는 `bc9213379fd12d5d5ea6ffd67a8385bf42fd8aa5`이며
  `origin/codex/roadmap6-hierarchical-actions`와 일치한다.
- W1은 `createIntervalPlot`과 `createRegressionPlot`, W2는 `createDotPlot`·`createLollipopPlot`·
  `createDumbbellPlot`과 `editEndpointPlot`, W3는 `createECDFData`·`createECDFPlot`·`editECDFPlot`을
  기존 data/Point/Rule/Line/label/guide owner 위에 구현했다.
- 모든 complete facade는 lower public action hierarchy를 그대로 호출한다. Facade 전용 renderer나 별도 chart
  compiler가 없으며, statistical transform과 appearance/geometry owner를 분리했다.

## X 통합 감사

현재 action-card 선언에서 user-facing action은 217개다. Generated lifecycle은 217개를 모두 scenario root에서
직접 호출하고 9,146 option paths, 13,188 coverage requirements를 declaration-derived inventory로 잠근다.
Realistic suite는 TidyTuesday와 zoo corpus의 statistical, Cartesian, facet, guide, lifecycle 조합 243개를 통과했다.

W1~W3가 공유하는 hierarchy 경계는 다음과 같다.

1. Interval center와 error-bar interval, Regression scatter와 fitted model은 같은 source/grain/scale을 공유한다.
   Complete Interval의 생략된 scale IDs는 owner-scoped `${id}X`/`${id}Y`이며 caller의 explicit sharing은 보존한다.
2. Dot/Lollipop/Dumbbell은 raw row와 explicit summary를 구별한다. Stem/connector/endpoints/labels는 ordinary
   child owner이고 `editEndpointPlot`이 source와 statistical roles를 한 immutable branch에서 교체한다.
3. ECDF sorting/ties/denominator/missing/weight는 materialized data owner가, 우연속 step geometry는 ordinary
   Line이, group별 endpoint text는 generic mark-label owner가 맡는다. Raw source filter만 denominator를 다시
   계산하며 final mark filter는 visual membership만 바꾼다.

## 추가 결함 처리

- [#122](https://github.com/ggaction/ggaction/issues/122)는 complete Interval이 unrelated global channel scale을
  재사용해 valid multi-layer call이 authoring order에 따라 실패하던 문제다. Owner-scoped defaults와 재현 테스트로
  수정하고 closed했다.
- [#123](https://github.com/ggaction/ggaction/issues/123)는 Phase 8의 9개 public action이 realistic generated
  root에서 빠지고 inventory total/digest가 stale했던 문제다. Direct lifecycle과 exact declaration inventory를
  갱신하고 243/243 누적 실행 뒤 closed했다.

## 누적 검증

| 범위 | 실제 결과 |
| --- | --- |
| ECDF focused runtime/type | 15/15 pass |
| primitive/public ECDF state | 2/2 pass |
| focused ECDF decoded PNG | 1/1 pass |
| unit | 2,246/2,246 pass |
| contracts | 318/318 pass |
| charts | 570/570 pass |
| docs | 47/47 pass |
| browser examples | 69/69 pass |
| realistic corpus | 243/243 pass |
| coverage | 95.49% lines, 92.29% branches, 98.93% functions; 88 critical floors pass |
| generated contract checks | catalog/card/capabilities/action/signature/metadata/search/machine/example pass |
| package | 481 entries, packed 570,812, unpacked 2,751,506 bytes |
| installed gzip | Full 288,249 / Basic 149,994 / SVG 6,437 bytes |

Current ceilings는 package 481/575,000/2,770,000, browser gzip 289,000/150,000/25,000 bytes다. Full-only
statistical surface 증가만 반영했고 Basic/SVG browser ceilings는 유지했다. Installed artifact SHA-256은
`26d99a5c0b03ee70f9ef3bc050fb60d0ae18db5bf532edc57c125a7b251748ea`다.

`docs:generate`와 source/generated docs tests는 통과했다. Host Ruby가 repository의 3.2.6 대신 2.6.10이라
`docs:verify` preflight 이후의 Jekyll build/browser 단계는 실행할 수 없었으며, 이 환경 제한을 통과 결과와
분리해 W3 원장에 남겼다.

## 종료 판정

- F10, F11, F13은 runtime, strict declaration, Current/card/docs, primitive/public renderer와 realistic
  lifecycle 증거를 갖춘 implemented-verified 상태다.
- Phase 8에 숨은 Planned 또는 deferred 구현은 없다. F12 Raincloud는 원래 owner인 Phase 9 W2에 남아 있다.
- [전체 실행 승인](../APPROVAL.md)이 A/V/X에 적용되므로 R6-P8-X를 approved로 닫고 Phase 9로 이동한다.
