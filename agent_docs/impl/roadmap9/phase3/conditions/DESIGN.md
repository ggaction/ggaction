# STEP-016 조건부 데이터 흐름

## 진행 상태

- [x] 원본 STEP-016, data-statistics/core 계약과 현재 parameter/encoding 경로 대조
- [x] 전체 계획 승인과 독립 작업 범위 연결
- [x] Boolean predicate와 ordered first-match 순수 kernel 및 독립 시험
- [x] AST filter 생성·편집·revision·schema·lineage·복원 연결
- [ ] 조건부 encoder와 parameter/selection/scale dependency 연결
- [ ] Empty domain·cycle·inactive branch·zero·atomic failure 통합 시험
- [ ] 타입·Current·공개 문서·generated metadata·설치 소비자 동기화
- [ ] 전체 조건부 checkpoint commit/push와 AT-18 인계

기준은 `c0f0f7147f62a9da671b632eb5dbaf03188cd575`다. 사용자의 전체 Roadmap9 실행·병렬
작업 승인은 [AUTHORIZATION](../../AUTHORIZATION.json)에 기록되어 있다. Root가 지정한
`codex/roadmap9-conditions`에서 독립 구현하며 G-DATA의 아직 통합되지 않은 파일은 복사하지 않는다.
이 문서는 구현 예정인 구체 계약이며 시험 성공이나 STEP-016 완료를 뜻하지 않는다.

## Predicate와 filter

기존 `ExpressionV2`의 closed node, `standard@1`, descriptor-safe 입력, depth/node/work 한도를
재사용한다. Predicate root는 boolean이어야 한다. 숫자/string의 truthiness는 허용하지 않는다.
비교의 null/missing false, typed equality, and/or 및 if의 지연 평가는 기존 AST 계약을 유지한다.
현재 실행되지 않는 분기의 field·parameter·타입도 정적 검사한다.

`filterData({id,source?,where:ExpressionV2})`와 `editFilteredData({target,where,...})`를 기존
field/oneOf/noneOf/predicate/range 방식과 배타적인 모드로 연결한다. `where`에는 임의 callback,
JS source 또는 선택 resource를 넣지 않는다. Topology를 바꾸는 filter는 dataset DAG를 소유한다.
Stored filter는 `where`와 exact `parameterInputs`를 보존하고 기존 dataset source/schema/row token,
lineage와 logical owner revision을 사용한다. Parameter edit는 이 root부터 기존 union planner로
filter→summary/stack→scales→marks→guides→highlights를 순서대로 재계산한다.

## Ordered conditional encoding

공개 입력은 `{conditions:[{when,value},...],otherwise}`다. `when`은 strict boolean
`ExpressionV2` 또는 `{selection:UserId}`이며 selection ID는 기존 stored logical selection을 명시한다.
`value`와 `otherwise`는 해당 기존 encoder의 constant 또는 field/fieldType/scale payload다.
분기는 입력 순서의 첫 true만 채택하고 `otherwise`는 필수다. `0`, `false`, 빈 배열 등을
truthiness로 생략하지 않는다. 모든 branch의 shape/field/type/resource를 먼저 검증하고 선택된
branch의 값만 계산한다. 1–64개 조건, 전체 predicate AST 4,096 nodes 및 기존 row-work 한도를
allocation 전에 검사한다. Caller input은 복사·동결하고 getter나 prototype path를 실행하지 않는다.

우선 기존 appearance encoder 8개(color/stroke/size/shape/opacity/strokeWidth/strokeDash/angle)를
연결한다. Stored branch, parameter와 selection ref는 한 semantic owner에 두고 정확한 revision을
검증한다. Scale/mark/guide resource를 암묵적으로 첫 항목에 연결하지 않는다. Selection predicate가
조건부 출력 property를 다시 읽는 순환은 preflight에서 거부하며 이전 program/trace를 유지한다.
Branch별 scale normalization과 mark/item-grain 호환성은 기존 owner를 사용한다. Path/aggregate
item의 한 값이 유일하지 않으면 임의 source row를 선택하지 않고 명시 오류를 낸다.

위치·offset·pointRadius·text·group/pathOrder를 scope 밖으로 단정하지 않는다. 아래 matrix를
등록 cookbook·현재 각 encoder·인수 시험과 대조하여 required와 unsupported를 구분한다.
필수로 판명된 소비자는 같은 STEP에서 연결하며 unresolved cell이 있으면 AT-18을 닫지 않는다.

| 소비자 | 현재 계획 | 종료 조건 |
| --- | --- | --- |
| color/stroke/size/shape/opacity/strokeWidth/strokeDash/angle | 우선 구현 | 기존 mark별 허용 채널, constant/field/scale, create/edit/remove/replay 및 renderer parity |
| x/y/x2/y2/theta/r | 추가 계약 대조 중 | positional mapping과 topology 변경을 구별한 supported/unsupported 근거 및 필요 구현 |
| xOffset/yOffset/dx/dy | 추가 계약 대조 중 | 기존 unit/coordinate/field 제약과 조건부 branch 호환성 |
| pointRadius | 추가 계약 대조 중 | equal-area size와 radius의 기존 단위/동시 사용 금지 유지 |
| text | 추가 계약 대조 중 | content/format/layout owner와 typed value 계약 |
| group/pathOrder | topology 경계 검토 | item grain 변경·selection 대응·데이터 DAG 순환을 감추지 않는 계약 |
| parameter/filter/stats/scale/guide/highlight | 필수 | 영향 있는 closure만 갱신, diamond 중복 제거, 불변 실패 |
| selection CRUD, resource removal, facet/repeat/concat | 필수 | exact refs, scope, 재채택과 ancestor snapshot 갱신 |
| inspection/scene/codec | 필수 | 조건 입력/결과 확인, concrete output parity, fresh-process 편집과 malformed restore 거부 |
| G-DATA sourcePlan / raw+computed union | root 통합 후 필수 | prepared source/parameter update가 filter와 조건부 mark closure를 빠뜨리지 않음 |

## Empty data와 시각 경계

현재 scale은 `emptyDomain:"preserve"|"require-explicit"`와 명시 domain을 지원한다.
기본 empty inferred domain은 오류이며 임의 과거 domain 유지나 새 fallback을 추가하지 않는다.
명시 preserve가 같은 의미 binding의 기존 domain만 재사용하는지, require-explicit가 오류를 내는지,
명시 domain에서 empty filter→mark/guide가 과거 항목을 남기지 않는지 따로 시험한다.

이 단계는 기존 승인된 mark의 기존 constant/field appearance와 geometry를 조건에 따라 선택한다.
새 primitive/renderer/시각 목표를 만들지 않는 소비자는 기존 point/bar/line 등의 primitive/public
same-run parity fixture로 근거를 남긴다. 기존 승인 범위를 벗어나는 새 시각 표현이 필요하면 그
소비자만 별도 visual review 대상으로 분리하고 나머지 독립 구현을 계속한다.

## 검증과 인계

실행 가능한 stable tests는 grammar/action/materialization/persistence owner 아래에 둔다.
독립 literal expected로 first-match 중복 true, otherwise, inactive 오류, opacity 0, unknown refs,
getter/cycle/budget, empty schema, parameter edit의 이전 state/trace 불변을 검증한다.
정상·type·계약·renderer·browser·installed evidence를 해당 checkpoint에 기록하고 원본 실패를
보존한다. G-DATA merge 전 결과는 그 경로까지 검증했다고 표시하지 않는다.


## 첫 checkpoint: predicate filter

이 checkpoint는 STEP-016 전체 완료가 아니다. Public `where` filter와 재사용 가능한
private first-match kernel을 함께 고정한다. `layer.conditionals` public encoder 경로와
위 matrix의 나머지 소비자는 다음 구현 대상이다.

- 생성·수정·parameter revision·raw revise·lookup diamond·summary/scale/guide/mark closure를 시험했다.
- 행 순서, explicit key와 logical identity, source schema, empty 결과와 exact refs를 보존한다.
- Boolean null의 실행 실패는 원자적이며 inactive branch field/parameter/type도 검사한다.
- Restore는 식을 실행하지 않고 source schema와 exact refs를 검증한다. 별도 process의 restore 후 parameter edit를 시험했다.
- `materialization/computedInputs.js`의 read-only 환경 owner를 `expressionInputs.js`로 확장·이동했다. 기존 persistence import 예외도 새 owner로 옮겼으며 source import cycle 검사를 통과했다.
- 기본 empty domain 오류, 명시 preserve, 명시 domain 및 비어 있다가 다시 채워지는 마크를 각각 시험했다.
- 카드·타입·공개 reference 원본·문서 실행 예제·현재 계약을 동기화했다. 새 시각 primitive는 없다.

첫 필터 checkpoint 검증은 [FILTER-CHECKPOINT.json](evidence/FILTER-CHECKPOINT.json)에 기록했다.
Unit 423건, contract 30건, docs 160건과 실제 설치 artifact 7개 qualification 그룹을 통과했다.
Node 20/22/24의 동일 tar/번들 입력 크기 행렬도 기록했다. Public conditional 전체 검증을 뜻하지 않는다.

### 다음 조건부 appearance의 단일 저장 owner

`layer.conditionals[channel]`에 정규화된 `conditions`, `otherwise`, exact
`parameterInputs`/`selectionInputs`를 저장한다. 동일 채널의 ordinary encoding은 제거하며
otherwise를 다른 semantic/config 위치에 복제하지 않는다. 기존 encoder owner로 각 branch를
선검증하되 branch가 grouping/stacking 등 topology를 바꾸는지 별도로 확인한다.

분기 field/scale는 비활성 상태에서도 live reference이며 scale domain collector는 모든 분기의
명시 field/scale binding을 읽는다. 첫 true를 고르는 시점은 기존 final item grain이다. Path/bar
그룹에서 서로 다른 source 값이 하나의 최종 item 값으로 정의되지 않으면 임의 첫 행을 택하지
않는다. 명시 group이나 해당 family의 기존 aggregate owner를 사용 가능한 경우 재사용하며,
family 전체를 일괄 미지원 처리하지 않는다. Branch별 scale이 여러 개인 guide는 기존 explicit
scale/target 계약으로 모호성을 해소한다. Branch 교체와 removeEncoding은 ref를 해제하고 다른
live 소비자가 있는 scale을 제거하지 않는다. 이러한 경로는 아직 구현/검증 완료가 아니다.

Point의 size/shape/angle은 geometry 이전 row mapping에 적용해 jitter/packing이 실제 최종
모양을 반영해야 한다. 나머지 appearance는 기존 mark materializer가 명시 호출하는 output
단계에서 적용한다. Selection property가 같은 conditional 결과를 읽는 cycle을 선검증하고,
parameter와 selection edit는 exact refs를 갱신한 뒤 affected mark/scale/guide만 물질화한다.
