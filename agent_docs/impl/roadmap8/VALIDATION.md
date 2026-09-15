# Roadmap 8 검증과 완료 판정

상태: **계획된 인수 사례**. B baseline 외의 미래 API 기대값은 아직 실행하지 않았다.
각 사례의 결과 상태는 not_run/passed/failed/not_applicable로 기록하고, not_applicable은
근거 있는 family 제약에만 사용한다. 미구현을 not_applicable로 분류하지 않는다.

## 합성 데이터와 독립 oracle

```text
six:
id  group  x  y  z
1   A      1  2  13
2   A      2  4  16
3   A      3  6  19
4   B      1  3  14
5   B      2  5  17
6   B      3  7  20

nullable: (A,null), (A,2), (B,null), (B,4), (C,null), (C,null)
bins: 0,5,10,15,20,null
arrays: {id:"a",xs:[10,20]}, {id:"b",xs:[]}, {id:"c",xs:null}
```

integer counts/membership은 exact 비교한다. 회귀·분포 등 부동소수점 값은 해당 수치식의
절대/상대 tolerance를 사례에 명시하고 실제 출력에서 기대값을 역산하지 않는다.
회귀의 단순 직선 예제는 계수/예측 오차 1e-10 이하를 제안한다. 큰 동적 범위 사례는
기존 numerical 안정성 fixture의 tolerance를 이어받는다.

## 인수 사례

| ID | Feature | 준비와 조작 | 기대 결과 |
| --- | --- | --- | --- |
| V01 | F01 | six를 group별 y mean으로 summary 후 x gte2 filter | field-unavailable finding, 원본/summary 불변, 새 빈 dataset을 성공으로 반환하지 않음 |
| V02 | F01 | 선언된 x/y schema의 0행 데이터에 x filter와 typo filter | x는 field 검증 통과, typo는 실패; 값 유무와 별개 |
| V03 | F01 | schema 없는 과거 빈 source snapshot 복원 | unknown을 기록, 임의 field/type 생성 없음; 명시 schema 제공 경로 안내 |
| V04 | F01 | source revision으로 사용 중 field 삭제 또는 타입 변경 | invalid 소비자가 있으면 atomic reject; independent source는 영향 없음 |
| V05 | F02 | valid filter가 0행, 같은 field의 기존 domain 있음 | preserve 정책에서 mark 0개, domain/사용자 style 유지 |
| V06 | F02 | 새 0행 차트, explicit x/y domain | 유효한 empty render; axis/legend가 data mark 수에 포함되지 않음 |
| V07 | F02 | 새 0행 차트, known schema, domain 없음 | 명확한 domain-required 진단; invented [0,1] 없음 |
| V08 | F02 | empty→non-empty revise와 y→다른 단위 z reencode | 첫 경우 새 데이터로 재계산, 둘째 이전 y domain을 z에 잘못 재사용하지 않음 |
| V09 | F03 | nullable summary, explicit identity policy | A:count2,valid1,sum2,mean2,median2; B:2,1,4,4,4; C:2,0,0,null,null |
| V10 | F03 | nullable summary, 정책 omission | 승인된 호환 전략에 따라 0.0.16과 일치; undefined를 null로 비교하지 않음 |
| V11 | F03 | bins, missing drop, boundaries=[0,10,20] | count2,3; 마지막 20 포함; input6,used5,excluded-null1 |
| V12 | F03 | weighted statistics와 일부 null/0-weight/invalid weight | 기존 frequency/reliability 수식 유지; null 제외와 0 기여를 분리; invalid weight는 오류 |
| V13 | F03 | 같은 explicit policy의 facade/standalone/edit/revise/facet | 수치/field/grain과 report가 해당 최신 입력 기준으로 일치 |
| V14 | F04 | (1,2),(2,4), interval false, band false | slope2,intercept0; CI fields 없음; 원본 두 점 유지 |
| V15 | F04 | V14에 mean/prediction interval 요청 | 구간 표본 조건 오류; 임의 margin 또는 zero band 생성 없음 |
| V16 | F04 | six group별 linear interval false | A slope2/intercept0, B slope2/intercept1; whole group은 slope2/intercept0.5 |
| V17 | F04 | explicit grid [1,1.5,2], A/B fit | A=[2,3,4], B=[3,4,5]; observed x 이외 1.5 포함 |
| V18 | F04 | duplicate/descending/nonfinite grid, constant x, too-small sample | 구체 오류와 atomic failure; full model/method matrix에 명시 unsupported |
| V19 | F05 | follow 회귀에서 source y→z | A slope3/intercept10, B slope3/intercept11로 변경; 회귀 스타일 보존 |
| V20 | F05 | fixed 회귀에서 source y→z | 기존 회귀 recipe 유지; follow와의 차이를 문서/compare에서 확인 |
| V21 | F05 | follow source 필터 변경, group 표본 부족 또는 cycle/source 삭제 | 정책상 invalid면 source 포함 전체 patch 실패, stale curve 성공 반환 없음 |
| V22 | F05 | follow→fixed, snapshot 복원, facet/concat child 교체 | 최신 resolved recipe와 explicit target 관계 보존; 다른 child 불변 |
| V23 | F06 | arrays에서 empty drop, missing drop | a 원소10/20 두 행; 원본 row0/index0,1; b/c 제외 이유 구별 |
| V24 | F06 | arrays에서 empty keep, missing keep | a 두 행+b/c 각각 as/index null 한 행, 총4; scalar non-array는 오류 |
| V25 | F06 | output name 충돌, sparse source, object/multiple-array 요청, limit 초과 | 생성 전 거절/명시 unsupported; 입력 불변; 지원되는 edit/revise/replay는 동등 |
| V26 | F07 | six에서 1≤x<3 단일 range | id1,2,4,5; 기존 gte1→lt3 조합과 일치 |
| V27 | F07 | group noneOf A; 숫자1과 문자열1 혼합 | group B만 유지, typed 비교로 1과"1" 구별 |
| V28 | F07 | lower만, upper만, inverted, 양 경계 없음, 옵션 충돌 | 열린 경계 성공, 나머지 의미 invalid는 atomic reject |
| V29 | F07 | 하한 pin 후 상한만 edit, snapshot/revise; temporal 정규화 후 filter | 하한 보존; explicit zone normalization의 expected membership 유지 |
| V30 | F08 | multi-key sortBy, tie/nulls | 명시 key 순서와 null placement, tie는 source index; 값/membership 보존 |
| V31 | F08 | 정렬 결과에 같은 sort 재적용, descending↔ascending edit | 값/행수 불변, deterministic order; raw row array mutation 없음 |
| V32 | F08 | 시간·혼합타입 key, sort→window/facet/revise | temporal 기준 순서, incompatible mixed type 오류, partition 재계산 동등 |
| V33 | F09 | 모든 built-in action inventory와 Full/Basic surface | 누락 descriptor 없음; supported/conditional/unsupported/unverified 구별 |
| V34 | F09 | point shape 가능, line shape 불가, missing target/field/options | 정적 applicability와 실제 실행 전제조건 일치; numeric 검사 미실행은 표시 |
| V35 | F09 | 조회 반복과 unknown registered extension | program/trace 불변, extension 의미 미확인이 supported로 승격되지 않음 |
| V36 | F10 | color binding 변경 vs 색 constant 변경 vs 제목만 수정 | 해당 resource/role 변경과 shared consumer 보고, row change를 발명하지 않음 |
| V37 | F10 | trace/context-only 차이, layer order 변경, 다른 source 동일 값 | trace-only는 차트 의미변경 아님; 순서/기존 identity 차이는 보존 |
| V38 | F10 | 새로운 generated IDs가 다른 builtin equivalent 결과/unknown extension | 검증한 canonical owner만 동등 처리; unknown은 명시 반환 |
| V39 | F11 | axis-only, mark opacity0, zero size, outside clip | 네 상태를 구별, guide symbol을 data item으로 세지 않음 |
| V40 | F11 | line/area/composite interval/boxplot | logical item/series와 concrete primitive counts를 혼동하지 않음 |
| V41 | F11 | nullable/empty 결과와 unsupported text/custom owner | empty와 error/미검사 구별; partial inspection coverage를 공개 |
| V42 | F11 | 같은 graphic의 SVG/Canvas/PNG/PDF 및 nested composition | 공통 geometry/ownership 검사 일치; pixel visibility 미검사를 passed로 쓰지 않음 |
| V43 | F12 | 같은 base에서 독립 후보20개, option별 반복 수정 | source/data 공유 유지, 후보 상호오염 없음; elapsed/retained memory 기록 |
| V44 | F12 | 평가 count 고정 다단계 workload와 장기 source revision | 동일 결과, 한계/실패 공개; cache stale와 불필요한 live retention 검사 |
| V45 | F12 | cap 내 및 fold/flatten/generated count 초과 입력 | cap 내는 correctness 통과, 초과는 structured resource-limit 진단 |
| V46 | F12 | Node와 browser installed package의 export/bundle/inspection | browser에 Node builtin 누출 없음; 새 entry가 미사용 main bundle에 강제 포함되지 않음 |

## 기능별 공통 lifecycle 행렬

해당되는 각 F마다 아래 셀을 작성한다. 빈 셀은 완료가 아니다.

| 축 | 반드시 확인할 내용 |
| --- | --- |
| 최초 생성 | source/schema/policy와 결과 수치, action trace hierarchy |
| 수정 | 옵션 한 개와 복합 옵션 변경, 기존 사용자 스타일/독립 mark 유지 |
| 실패 | unknown/null/scalar options, 없는 ID/field, 잘못된 타입, 원본·caller input 불변 |
| 데이터 재생 | editDerivedData dependents reject/recompute, reviseData, branching DAG |
| 공간 재생 | resize/domain/frame/axis/grid/legend/selection/label/highlight |
| composition | facet/facetGrid/repeat, shared/independent scale, concat explicit child 교체 |
| persistence | v1 baseline read, 새 snapshot roundtrip, derived relation와 unknown extension |
| 삭제 | unused 제거, referenced reject, follow source 삭제, owner/config/trace의 일관성 |
| 배포 표면 | types positive/negative, Full/Basic 제한, browser/Node entry, docs/cards/MCP |

새 기능에서 semantic renderer/compiler를 만들지 않았음을 구조적으로 확인한다. Domain primitive
조합과 user-facing action의 동일 scene/pixel 검증은 해당 visual change의 기존 repository 절차를 따른다.
고유 field/key/provenance 값은 유의미한 것만 fixture에 넣고 generated ordering에 우연히 의존하지 않는다.

## 성능 측정 프로토콜

이 수치는 **제안된 검증 방법**이며 달성한 성능이 아니다.

- 장치, OS, Node/browser/native renderer 버전, build mode, dataset hash를 결과마다 고정한다.
- correctness를 먼저 통과시킨 workload만 성공 latency 통계에 넣는다. reject/timeout 수와 latency는 별도로 보고한다.
- workload별 warmup 10회, measured 100회로 p50/p95/max를 보고한다. 장시간 workload는 승인된 횟수와
  신뢰 한계를 별도 표기하고 7회 median을 p95처럼 표현하지 않는다. cold-start는 warm 값과 분리한다.
- Node에서 optional forced-GC 전후 retained heap과 peak RSS, browser에서 실제 지원되는 memory metric만 측정한다.
- input 1k/10k/50k tier, 연산별 실제 output 수/limit을 기록한다. 500k는 지원·탐색 목표 결정 전 unverified다.
- 공식 baseline 비교는 같은 runtime·머신·조건을 사용한다. 기존 기능은 0.0.16 대비 p95/retained memory
  10% 초과 회귀가 재현되면 원인을 설명하고 개선/승인된 tradeoff 없이는 닫지 않는 안을 제안한다.
- 250ms preview/1000ms 카드집합은 앱 전체의 참고 budget이다. 라이브러리가 독자적으로 보장하지 않는다.
  ggaction 실행+inspection의 몫을 따로 기록하여 host의 scheduling/render/UI 비용과 합칠 수 있게 한다.
- 20 후보 workload는 같은 immutable base에서 실행한다. 다단계는 고정 action/parameter sequence와
  deterministic evaluation budget을 사용한다. 실제 recommender·corpus를 구현하지 않아도 실행 비용을 재현한다.
- snapshot serialize 비용/bytes, source revise 뒤 살아 있는 과거 dataset 크기, 후보 해제 후 retained memory를
  분리한다. 라이브러리가 의도적으로 보존하는 history와 cache leak을 혼동하지 않는다.

## 테스트 위치와 완료 증거

durable tests는 `test/unit/grammar`, `test/unit/actions`, `test/contracts`, `test/charts`, browser/package
기존 capability owner에 둔다. completed roadmap 디렉터리를 테스트 데이터의 필수 import로 만들지 않는다.

Phase별로 해당 focused tests를 먼저 실행하고, public 옵션·공통 grammar를 바꾸면 해당 cumulative
consumer tests를 수행한다. Phase 7에서는 repository의 필수 CI/checks, coverage floors, realistic
시나리오, renderer/package/docs 검사 전체를 통과시킨다. 계획 문서 편집에는 기존 navigation/link 검사만 수행한다.

완료 원장은 V ID → test file → 실행 명령 → 결과 artifact/commit → 남은 제약을 연결한다.
모든 F가 구현·검증됐다는 근거 없이 로드맵을 completed로 전환하지 않는다. E01/E02의 core 외 경계를
결과에도 표시하고, 나중에 승인된 확장 기능은 미완료 상태를 숨기지 않는다.
