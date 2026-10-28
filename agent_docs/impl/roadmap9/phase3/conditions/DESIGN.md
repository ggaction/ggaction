# STEP-016 조건부 데이터 흐름

## 진행 상태

- [x] 원본 STEP-016, data-statistics/core 계약과 현재 parameter/encoding 경로 대조
- [x] 전체 계획 승인과 독립 작업 범위 연결
- [x] Boolean predicate와 ordered first-match 순수 kernel 및 독립 시험
- [x] AST filter 생성·편집·revision·schema·lineage·복원 연결
- [x] Appearance 조건부 encoder와 parameter/selection/scale dependency 연결
- [x] Appearance empty domain·cycle·inactive branch·zero·atomic failure 통합 시험
- [x] Appearance 타입·Current·공개 문서·generated metadata·설치 소비자 동기화
- [x] Prepared-source/main statistics 통합, lifecycle 직접 증거와 설치·문서 검증
- [ ] Positional·offset·pointRadius·text 및 topology matrix 종료
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
family 전체를 일괄 미지원 처리하지 않는다. Branch field/type/scale binding이 하나일 때 기존 target+channels 범례를 재사용한다.
여러 binding이면 명시 ambiguity 오류를 내며, 이미 범례가 있으면 branch 변경을 원자적으로
거부한다. 별도의 scale 선택 옵션이나 branch별 동시 범례를 신설하지 않는다. Branch 교체와 removeEncoding은 ref를 해제하고 다른
live 소비자가 있는 scale을 제거하지 않는다. 아래 appearance checkpoint에서 이 경로를 검증했다.

Point의 size/shape/angle은 geometry 이전 row mapping에 적용해 jitter/packing이 실제 최종
모양을 반영해야 한다. 나머지 appearance는 기존 mark materializer가 명시 호출하는 output
단계에서 적용한다. Selection property가 같은 conditional 결과를 읽는 cycle을 선검증하고,
parameter와 selection edit는 exact refs를 갱신한 뒤 affected mark/scale/guide만 물질화한다.


## Appearance checkpoint 구현 상태

8개 appearance focused encoder와 encodeChannels의 조건부 branch를 구현했다. 타입과
현재 계약은 같은 generic payload를 사용한다. 기존 시각 primitive/mark owner를 재사용하므로
새 primitive visual target이 없으며 중복 시각 승인 gate를 만들지 않는다. 원본 STEP-016과
Root의 추가 확인에 따라 positional x/y/x2/y2/theta/r은 다음 동일 STEP checkpoint의 필수 범위다.

이번 checkpoint는 first-match/otherwise/opacity zero, inactive branch, field/scale refs,
conditional-only parameter, selection exact revision, feedback cycle, grouped path/bar,
shared scale detach, output-field rename, malformed restore, empty preserve/explicit/refill,
facet/repeat/concat와 overlay geometry를 실제 회귀로 고정한다. 과거 최종 item 순서의 index를
조건 값에 사용하는 대신 identity key로 결합해 highlight reordering에도 값을 보존한다.

Empty regression에서 일반 opacity/continuous-color/strokeWidth scale helper가 이미 허용한
emptyDomain 옵션을 저장하지 않는 결함을 재현했다. 기존 grammar validator를 공유하며
해당 option을 수동 definition helper와 재지정 scale patch에서 보존하도록 고쳤다. 이 보완은
새 empty 정책을 추가하지 않는다.

### Root 통합 후 반드시 확인할 경로

- G-DATA sourcePlan의 prepared raw+computed union에 where-filter roots와 conditional mark
  closure를 연결한다. opaque source payload 검증과 materialization 원자성을 유지한다.
- 새 adoptSelectionResources가 conditional parameterInputs/selectionInputs의 exact refs를
  복원하되 독립 live data-source binding을 과거 child에서 되살리지 않는다.
- 통계 checkpoint의 pivot/LOESS/calendar 최종 schema와 출력 field rename을 조건부 branch와
  predicate가 공유하는지 통합 시험한다.
- positional/offset/pointRadius/text 소비자와 topology group/pathOrder의 matrix는 아직 닫지
  않는다. 이 appearance checkpoint를 STEP-016 또는 AT-18 완료라고 보고하지 않는다.

### Appearance 검증 결과

[APPEARANCE-CHECKPOINT.json](evidence/APPEARANCE-CHECKPOINT.json)에 정확한 명령과
증거 hash를 기록했다. 전체 normal coverage 6,572건, 기존 global 94/89/98 기준과
critical floors 213개를 모두 통과했다. 실제 측정은 96.00/93.58/98.75다. 새 conditional
owner만 측정한 98.95/88.94/100은 별도 집중 결과이며 global 결과로 해석하지 않는다.
기존 floor를 낮추지 않았고 새 grammar/materialization prefix에 기존 expression family와
동일한 90/80/100을 자동 적용했다.

설치 패키지 Node 사례 191건과 qualification 7개, 새 브라우저 DPR 1/2 사례 2건,
문서 161건, built 150페이지/1,193 artifact, docs browser desktop 및 320/390/768px를
통과했다. Basic은 기존 color/size/shape 범위의 조건을 지원하며 설치 fixture는 color로
검증했다. Full fixture는 where filter와 opacity 조건부까지 복원·parameter 편집을 검증했다.

모든 nested scale literal 직접 실행에서 numeric discretized size가 소비자 등록 이전에 color로
분류되는 결함을 찾아 수정했다. 단일 conditional semantic binding과 새 scales를 기록·해석한 뒤
기존 scales를 수정하며, 새/기존 scale을 함께 변경하는 회귀도 통과했다. Stored strokeDash는
정규화 배열을 요구하며 author 입력의 named dash는 기존 owner에서 배열로 바뀐다.

Generated lifecycle/scenario inventory의 새 조건 옵션에 대한 direct-call 및 option inventory
동기화는 Root의 pivot repair와 같은 파일을 소유하므로 최신 main 통합 직후 연결한다.
이번 증거는 full realistic sweep, 전체 render sweep 또는 G-DATA 통합 완료를 주장하지 않는다.

## Prepared-source 통합 checkpoint

Appearance checkpoint 뒤 main `72855612`의 prepared source/pivot/LOESS/calendar를 이 branch에
병합했다. `reviseUnitParameter`는 준비된 raw revision plan을 그대로 재사용하면서 조건부 exact
parameter refs를 먼저 갱신하고, union DAG 이후 데이터가 그대로인 conditional-only mark도
명시적으로 물질화한다. Filter는 이미 공유 planner의 parameterInputs를 통해 raw/computed와
동일 union에 들어가므로 sourcePlan의 별도 predicate 목록이나 두 번째 DAG owner는 만들지 않는다.

실제 공개 API 회귀는 URL parameter→raw/filter/computed/lookup diamond, raw refresh→selection
조건, inactive field 실패, inferred empty-domain 실패, facet/repeat의 exact refs와 최신 source
binding을 확인한다. 기존 resource adoption은 현재 replacement source binding을 유지하며
과거 독립 source를 다시 채택하지 않는다. 이 checkpoint의 결과는 통합 evidence에 별도 기록한다.

Lifecycle 직접 사례는 8개 appearance 조건부 호출과 where filter create/edit를 포함한다.
옵션 inventory는 조건 배열의 존재와 otherwise payload를 실제 direct trace로 증명하고,
배열 내부는 기존 redacted-trace 정책을 유지한다. Source/renderer의 증거 없는 가짜 trace는 없다.

## 다음 positional 구현 계약

기존 `ConditionalEncodingOptions`와 단일 `layer.conditionals[channel]` owner를 유지한다.
각 branch는 해당 기존 action의 field/datum/scale/coordinate/aggregate 계약으로 정규화하고,
일반 encoding을 otherwise 복사본으로 영구 저장하지 않는다. `r`의 저장 channel은 기존처럼
`radius`다. 화면 단위가 필요한 pointRadius는 polar radius와 구분한다.

| 기존 소비자 | 조건 적용 grain과 범위 | topology/guide 제약 |
| --- | --- | --- |
| point/tick/text | 기존 source row의 Cartesian 값; point는 theta/r도 포함 | 동일 coordinate family; source-owned text 위치는 기존 금지 유지 |
| rule/rect | 기존 행의 start/end 각 endpoint | 기존 ranged/span 모드 유지, x2/y2는 기존 동반 축 정책 사용 |
| line/area | 기존 vertex; aggregate path는 기존 independent position group | group/bin/stack/coordinate가 분기마다 달라지는 새 topology를 숨겨 생성하지 않음 |
| bar | 기존 category/group/histogram/ranged item의 값 | category/bin/series grain을 고정하고 measure와 scale mapping을 조건에 따라 선택 |
| arc | 기존 category/row item의 theta/r 값 | 기존 aggregate/weight/radial mapping 의미와 total 검증 유지 |
| xOffset/yOffset | 기존 category slot 안의 subgroup 값 | parent band geometry 및 동일 grouping 의미 필요 |
| dx/dy | 기존 text row/label item의 pixel displacement | source-owned position 자체를 변경하지 않음 |
| pointRadius | 기존 point item의 pixel radius | area-based size와 배타적, 기존 shape geometry 사용 |
| text | 기존 text item의 content/format | font/layout owner를 그대로 사용, 임의 callback 없음 |
| group/pathOrder | 기존 고정된 topology authoring 유지 | 조건부 scalar mapping이 새 grouping/order API를 암묵 도입하지 않음; 최종 cookbook/acceptance 대조 필요 |

모든 positional branch의 field/scale refs와 domain contribution은 비활성 상태에도 유효하다.
한 binding만 명확하면 기존 axis/grid와 scale editor inference를 사용한다. 서로 다른 binding으로
기존 guide 의미가 모호해지면 전체 action을 원자적으로 거부한다. 여러 branch 중 첫 scale을
선택하지 않으며 새 guide 선택 API를 추가하지 않는다. 실제 path/aggregate grain의 predicate가
유일한 값을 갖지 못하면 임의 source row를 선택하지 않는다. 위 matrix는 다음 구현의 구체
계약이며 아직 지원 완료를 뜻하지 않는다.


Prepared-source 통합 검증은 [INTEGRATION-CHECKPOINT.json](evidence/INTEGRATION-CHECKPOINT.json)에
보존했다. Unit 50/50, contracts 24/24, focused realistic 10/10, installed Node 198/198 및
qualification 7/7, browser 2/2, docs 166/166, build/built/browser를 통과했다.
동일 tar와 minified bytes의 Node 20/22/24 크기를 측정했고 global/critical coverage floor는
그대로 유지했다. 이 통합에서 새 full coverage/full realistic sweep을 수행했다고 주장하지 않는다.
