# 조건부 위치·텍스트 제품 checkpoint

## 진행 상태

- [x] 위치·offset·point radius·text의 native 소비자 구현과 불변 실패
- [x] 타입·Current·action 카드·공개 reference·LLM 문서 동기화
- [x] 실제 데이터의 focused/atomic 옵션·literal 실행과 lifecycle 검증
- [x] parameter→filter→summary→scale→조건부 출력의 독립 인수 값
- [x] 동일 archive의 Node20/22/24 설치 소비자와 bundle 검증
- [x] renderer/browser 및 문서 build·responsive 검증
- [x] 최종 source coverage와 변경 후 realistic 실행 종료
- [x] 재현 명령·입력 hash·원본 로그를 포함한 검증 증거 고정
- [x] 구현 `e62e9f38` commit/push 후 `a561ae1c` integration 및 main 통합

사용자가 승인한 STEP-077 전체 범위의 조건부 인코딩 부분이다. 2026-10-28의 남은 설계·시각
전체 승인은 integration commit `b758b912`의 [AUTHORIZATION](../../AUTHORIZATION.json)에 기록했다.
이 기록은 STEP-077 완료 선언이 아니다. 정확한 공개 동작은 [ENCODINGS](../../../../contract/current/ENCODINGS.md),
point layout 진단은 [MARKS](../../../../contract/current/MARKS.md)가 소유한다.

## 책임과 소비자

Ordinary encoder가 각 branch의 field/datum/scale/coordinate 계약을 정규화한다.
`layer.conditionals[channel]`이 단일 stored owner이며 선택한 binding view는 transient다.
기존 pure position policy를 `grammar/positionPolicies`로 옮겨 authoring과 restore가 함께 쓴다.
Renderer에는 조건식·dataset 해석을 추가하지 않는다.

| 소비자 | 구현과 증거 |
| --- | --- |
| Point/Tick/Rule/Rect/독립 Text | row identity를 유지한 Cartesian/polar mapping, endpoint, offset; conditional-position 및 conditional-text tests |
| Line/Area | vertex/aggregate lineage와 고정 topology, 선택값으로 native stack/fill/center·ranged·density 재계산; conditional-position 및 conditional-area-position tests |
| Bar/Arc | final category/bin/series grain, mixed total/domain, proportional theta와 measured radius; conditional-bar-position 및 conditional-arc-position tests |
| Point layout | 선택 radius/shape/angle/stroke extent와 각 branch scale의 jitter/packing; conditional-point-layout 및 point-layout-scales tests |
| Labels/overlays | source의 선택된 endpoint/measure, share denominator, native endpoint label, text visibility와 row identity; conditional-text 및 conditional-overlay tests |
| Scale/axis/grid | unique binding inference와 shared primary/secondary 유지; ambiguity를 첫 resource 선택으로 숨기지 않음 |
| Parameter/selection/data | 정확한 revision, prepared raw+computed closure, cycle preflight, empty preserve/explicit/refill, facet/repeat/concat과 restore |
| 그룹·경로 순서 | ordinary topology action이 계속 소유한다. 조건부 scalar branch로 grouping/order를 바꾸지 않으며, 데이터 topology 조건은 explicit `filterData({where})`가 소유한다. 실제 encodeChannels group/pathOrder 7경로도 검증했다. |
| 저장/inspection/scene/backend | schema4의 기존 conditional owner와 concrete graphic output 재사용; installed lifecycle의 fresh process 및 네 backend 검증 |

Native mark의 existing prerequisites와 empty policy는 유지한다. AT-18은 explicit summary 이후
Point 출력으로 empty filter의 domain 보존/재채움까지 검증한다. 일반 aggregate Bar의 빈 집계
거부를 이 checkpoint에서 새 empty semantics로 바꾸지 않는다. 최초 Bar 인수 fixture가 이
기존 제한에 걸린 실행도 evidence에 보존한다.

## 검증 중 발견한 결함과 수정

- Conditional Area fill을 concrete validation 전에 결정하고, Point의 conditional stroke가
  native width를 보존하도록 CI 재현을 수정했다. 이전 원격 실패 기록은 [REALISTIC_CI](REALISTIC_CI.md)다.
- Shared Rule endpoint scale, pending Text/Bar/Arc, binned domain 중복 확장, offset padding 재설정,
  숫자 문자열 category 순서를 실제 데이터 fixture로 고정했다.
- Jitter/packing의 stroke extent와 label/geometry feedback을 dependency graph가 추적한다.
  Graph-only preflight를 scale materialization보다 먼저 실행해 feedback 재귀를 차단한다.
- Empty conditional Text의 inspection membership과 source label selection을 concrete visibility에
  맞추되 appearance 계산의 불필요한 재진입을 피한다.
- 모든 path selection derivation은 lineage를 요청하므로 값 비교로 membership을 재구성하던
  도달 불가능한 fallback을 제거했다. Exact source indices를 그대로 사용한다.
- 최초 전체 검사 6,833개 중 6개 실패는 새 union에 맞지 않는 generated snippet과 이전
  signature/inventory/median 기대였다. Ordinary encoder sample을 명시하고 확대된 surface를
  검사한다. Card median 실측2064bytes에 bounded2070 ceiling을 적용했다.
- 같은 최초 검사의 critical floor는 Area callback과 path fallback 때문에 두 owner가 미달했다.
  Horizontal ranged/density의 literal·native parity를 추가하고 위 lineage fallback을 제거했다.
  Coverage floor 숫자는 낮추지 않았다.

## 인수 실행

```sh
node scripts/qualify-conditionals.js
```

8개의 literal expected/actual, 정확한 공개 call chain, 빈 diff, source input hashes를
`.artifacts/acceptance/conditionals.json`에 저장한다. 세 branch의 first-match/otherwise/opacity0,
parameter 변경에 따른 filter와 summary total 및 domain, empty/refill, offline replay,
inactive field·필수 otherwise·feedback cycle의 원자 거부를 포함한다.
최종 qualification은 STEP-074에서 전체 기능과 결합해 다시 수행한다.

## 최종 checkpoint 검증

정확한 명령·입력 hash와 압축 원본은 [manifest](evidence/position/manifest.json)에 기록했다.
이 문서를 포함한 구현 commit이 검증 대상 source를 고정한다.

| 검사 | 결과 |
| --- | --- |
| 전체 normal 및 coverage | 6,835/6,835; lines 96.12%, branches 93.74%, functions 98.78%; critical owner 245개 통과 |
| 최종 실제 데이터 실행 | 19/19; pinned 5 datasets × 3 recipes, 512 MiB/concurrency 2 |
| 렌더러 / browser | 272/272 / 301/301 |
| 동일 archive 설치 | Node 20·22·24 각각 199 cases + 7 qualification groups |
| 문서 | 150 pages / 1,221 LLM artifacts; responsive widths 320·390·768 |
| 독립 인수 실행 | 8 cases, expected/actual SHA 일치 및 diff 0 |

Canonical archive SHA-256은 `cb2822e50988e6924395eb9bdb7382992a359a94e1358b3307d8fd8fa2093312`다.
최종 source의 동일 packaging 경로로 다시 만든 archive도 byte-identical이다. Packaging은
일부 source와 JSON을 축약하므로 checkout raw bytes와 tar entry의 직접 비교를 재현성 검사로 쓰지 않는다.

최초 normal/coverage 실패와 cache 환경 변수를 누락한 realistic 실행 로그도 삭제하지 않았다.
최종 realistic은 pinned cache를 명시해 성공했다. Renderer/browser 전체 검사는 실행 불가능한
path fallback 제거 이전 결과를 재사용한다. 최종 normal·realistic·설치 검사는 제거 후 source를
검증했다. Responsive 검사는 마지막 action snippet regeneration 이전이고 최종 built 문서 검사는
그 이후다. 이러한 재사용 경계와 각 실행 hash는 manifest에 함께 보존했다.
