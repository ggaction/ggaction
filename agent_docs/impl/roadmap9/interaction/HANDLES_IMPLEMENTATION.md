# 선택 영역 resize 및 범주 reorder 구현

2026-11-01. [범위 감사와 채택된 구체안](HANDLES_AUDIT.md)은 당시 구현 전 사실을 보존한다.
이 후속은 [기존 승인](../AUTHORIZATION.json#remainingApproval)과 root의 `getSelectionHandles()`
readonly 공개 계약 채택에 따른 STEP058 직접 조작 구현이다. 정확한 현재 API는
[Current INTERACTION](../../../contract/current/INTERACTION.md#selection-region-and-category-handles)이 정본이다.

## 진행 상태

- [x] Native region forward projection과 기존 region inverse/select replace를 재사용한 resize
- [x] 실제 축 raw category와 기존 orderCategories action을 재사용한 reorder
- [x] Readonly CSS handle query, closed public types/own-data validation, 기존 capture/history/cancel 연결
- [x] 순수 6 + public lifecycle 17, canonical hit 326, source/package/discovery/types 38
- [x] Owning coverage 333; 새 3 owner의 95/90/100 floor 통과
- [x] Canvas/SVG × DPR1·2 실제 mouse/touch/keyboard 동등 경로 4개
- [x] 동일 tar Node20/22/24 각각 설치 public 3개 + strict types + 문서 snippet + peers + 6 bundles
- [ ] Runtime source 고정 후 문서 provenance 및 변경 화면의 최종 검증
- [ ] 해시/로그/원 실패·회복 구분을 포함한 증거 pin과 원격 전달

## 구현 경계

`grammar/selectionHandles.js`가 authored raw region의 native numeric/log/time/band/theta
forward geometry를 소유한다. `regionResize.js`는 exact scoped native source/clip과 현재
frame을 검산하고 기존 brush inverse를 호출한다. `categoryReorder.js`는 실제 축 tick/label의
raw typed value를 받아 기존 category assignment를 공유한다. Assignment 본문은 native action과
adapter의 실제 두 소비자를 위해 `materialization/categoryOrder.js`로 이동했다.

`getSelectionHandles()`는 accepted scene의 기존 `frameVersion`만 반환한다. Host가 idle UI와
ARIA를 그리며 같은 CSS point가 실제 mouse3/touch6 slop 후보의 기준이다. Query에는 새 clock,
registry, persisted state 또는 renderer semantic read가 없다. Collection clip은 기존
`hitProgram`의 authentic snapshot association에서 가져온다. Native program/row input은 불변이다.

기본 rank60, ambiguous capture, RAF coalescing, final coordinate flush, one commit/history,
취소/late callback/asset lifecycle는 기존 session을 재사용한다. 일반 sampled-frame geometry에서
raw region을 역추정하지 않는다. Item key/lasso/noncontiguous category에서 rectangle을 추정하지
않고 coincident 또는 nearest tie는 명시 오류다. Theta native directed cut을 보존한다.

## 검사와 원 실패 구분

- 첫 browser 4개는 host example의 destroy notification에서 readonly query를 재호출하여 실패했다.
  Host subscriber가 destroyed state를 무시하도록 수리한 후 같은 4개가 통과했다.
- 첫 docs 241개는 237 pass / 4 fail이었다: search payload cap 2개, 신규 snippet 등록 1개,
  미커밋 example source link 1개. Search/snippet 수리 후 owning49 중48개가 통과했고 source link는
  고정 후 검증한다. 최초 전체를 green으로 바꾸지 않는다.
- 같은 tar `1142aa0c72c4e2d89d3affc5dc2a39b6a6fadf8945c0177e16a7318053b85c9c`의 모든
  runtime/type/snippet/peer 검사는 통과했으나 각 설치 runner의 마지막 bundle cap assertion은
  interaction에서 실패했다. 최대135,989gzip에 current cap136,000을 적용한 같은 측정18개는 통과했다.
  이 metadata 수리는 source/배포 bytes를 바꾸지 않으며 원 exit1과 재검증 exit0을 함께 보존한다.
- Existing `hitProgram.js`는 선택 capability 집중 검사만 계측되어56.58/90.70/80.95다.
  변경 collection association 경로는 실행됐지만 전체 hit owner 또는 전체 repository coverage 통과로
  확대하지 않는다. 새 selectionHandles/regionResize/categoryReorder는100/≥90/100이다.

Source/pin 뒤 `handles-evidence/qualification.json`에서 정확 commit, input hashes, archive,
3Node 각 측정, 압축 로그 및 변경 페이지 검증을 추적한다. 최종 AT53/55/60/65/074/077,
전수 설치 corpus 또는 dedicated performance/P95를 대신하지 않는다. Continuous/interval
legend 전용 조작을 새로 추가하거나 native applicability/분모를 바꾸지 않는다.
