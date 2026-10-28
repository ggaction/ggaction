# G-PARAM — parameter resource 검토안

상태: **Proposed**. 사용자 “구현해”(2026-10-28)는 G-PARAM 작업 진행 요청이다.
직전 설명에는 API 이름·기본값·저장 구조가 없었으므로 아래 P1–P6의 승인으로 기록하지 않는다.
[기존 G-EXPR 승인](../G-EXPR.json)의 D1–D6는 그대로 유지한다.
이 문서는 신규 계약 제안이며 Current 계약이나 제품 기능 설명이 아니다.

## P1 — 공개 lifecycle과 타입

| 호출 | 제안 계약 |
|---|---|
| `createParameter({id,value,type?,nullable?})` | id 필수. 같은 kind+id가 이미 있으면 오류. non-null value에서 type 추론. null 초기값에는 명시 type과 nullable:true 필수. nullable 기본 false. |
| `editParameter({target,value})` | target/value 필수. 기존 resource의 값만 교체하고 전체 의존 closure를 원자적으로 재계산. type/nullable/ID는 유지. |
| `removeParameter({id})` | id 필수. 존재하는 미참조 parameter만 삭제. 참조 중이면 resource-in-use. |

ID는 기존 validateUserId의 `[A-Za-z0-9_-]+`다. 생성에는 단일 기본 역할이 없어 ID를 추측하지 않는다.
수정은 인접 `editComputedData`의 명시 target, 삭제는 `removeData({id})`의 명시 ID 규칙을 따른다.
같은 문자열의 dataset, selection, parameter는 서로 다른 namespace다.

type은 number/string/boolean이다. 숫자는 finite, 문자열은 AST core의 1,048,576 UTF-16 units 한도를
공유한다. 빈 문자열·0·false·-0은 유효하다. null은 nullable:true일 때만 허용하며 missing/undefined,
array/object/Date/bigint/function은 허용하지 않는다. Date는 caller가 명시적으로 epoch number로 변환한다.
생략 가능한 옵션도 명시 undefined는 오류다. unknown key·accessor·symbol·hidden key는 읽기 전에 거부한다.
Proxy 격리는 기존 own-data 경계처럼 보장하지 않는다.

type/nullable 변경은 이번 API에 포함하지 않는다. 참조 제거 후 삭제·재생성으로 다른 정의를 만든다.
min/max/step/enum/UI control/수식으로 계산되는 parameter는 요구되지 않은 확장이라 추가하지 않는다.
nullable number의 null을 boolean 조건으로 쓰면 기존 AST boolean-strict 규칙에 따라 실패한다.
같은 값을 다시 쓰는 요청은 Object.is 비교로 resource revision·계산 결과를 유지한다. action()의 기존
top-level trace 기록은 유지한다. -0→0은 값 변경으로 본다. 빈 edit와 value:undefined는 오류다.

`editDerivedData`는 transform 정의 수정과 downstream 선택을 위해 dependents 옵션을 제공한다.
Parameter 수정의 의미는 dependent 계산 결과 갱신이므로 여기에는 reject/recompute 스위치를 추가하지
않고 **항상 전체 affected closure를 preflight**한다. 처리할 수 없는 consumer가 있으면 전체 요청을 거부한다.

## P2 — 저장 구조와 exact revision

기존 semanticSpec.resources 배열과 typed input reference를 확장한다. 다른 parameter map이나
materializationConfigs 복사본을 만들지 않는다. 다음은 정규화된 저장 예다.

```json
{
  "kind": "parameter", "id": "threshold", "revision": 0,
  "algorithmVersion": "1", "ownership": {"mode": "authored"}, "inputs": [],
  "options": {"type": "number", "nullable": false},
  "result": {"value": 10}, "provenance": {"origin": "authored"}
}
```

값의 정본은 result.value 한 곳이다. scalar parameter는 authored·inputs:[]만 허용한다.
revision은 0부터 시작하는 nonnegative safe integer, 변경마다 +1이며 overflow는 atomic error다.
이전 ChartProgram은 이전 resource를 보존하고 새 program은 해당 kind+id의 최신 snapshot 하나를 갖는다.
삭제 후 같은 ID 재생성은 기존 resource 규칙처럼 revision0이다. 외부 비동기 요청의 동일성/취소는
G-DATA에서 input hash 및 실행 token을 포함해 결정하며 이 Gate가 ABA 방지 계약을 대신하지 않는다.

AST의 `{type:"parameter",id}`는 요청 의도다. materialized computed transform에만
`parameterInputs: [{kind:"parameter",id,revision}]`를 저장한다. normalized AST dependency의 첫 출현
순서로 중복을 제거하고, parameter가 없는 v2에는 빈 배열, v1에는 새 필드를 넣지 않는다.
요청 API가 revision이나 parameterInputs를 받지는 않는다. 저장 vector의 누락·중복·extra·stale ref는
복원/재생 시 거부한다. 같은 값을 복사해 transform에 넣지 않고 exact resource를 resolve한다.
진단·inspection은 이 vector를 투영하며 row lineage의 data/row 참조에 parameter를 섞지 않는다.

## P3 — 명시적인 재계산과 원자성

1. 옵션과 candidate resource를 검증하고 기존 ID·revision을 resolve한다.
2. normalized AST의 모든 branch에서 dependency를 추출한다. inactive branch의 parameter도 dependency다.
3. 해당 parameter를 읽는 모든 저장 computed snapshot을 시작점으로 기존 dataset input DAG의 transitive
   closure를 합친다. 다중 시작점과 lookup diamond를 한 번씩만 계산한다. dataset/resource namespace를
   분리하고 stable topological order를 사용한다. cycle, missing/stale ref, budget 초과는 계산 전에 거부한다.
4. candidate resource 값으로 computed·후속 transform의 새 immutable dataset revision과 schema/lineage/
   reports를 준비한다. 기존 logical owner와 data revision naming/release 규칙을 재사용한다.
5. layer·logical data owner·selection/highlight·통계 chart cache의 typed references를 갱신하고
   scales→marks→guides→layout→highlights 순서의 기존 materialization plan으로 모든 consumer를 검증한다.
6. 모든 candidate가 유효할 때만 새 program을 반환한다. 실패 시 입력 program·trace·cache는 불변이다.

복수 parameter를 읽는 dataset은 바뀐 ref만 새 revision에 결합하며 나머지는 유지한다. 같은 결과값이
나와도 다른 parameter revision을 읽은 새 dataset은 새 provenance를 갖는다. 의존하지 않는 sibling은
재계산하지 않고 reference를 공유한다. 현재 program에 남은 비활성/미사용 dataset도 저장된 live ref이므로
누락하지 않는다. 기존 release 규칙으로 제거할 수 없는 snapshot은 재계산하거나 전체 요청을 거부한다.

자원 DAG와 dataset DAG를 별도의 무관한 그래프로 검사하면 교차 cycle을 놓친다. typed edge collector를
통해 통합 closure를 검사한다. parameter 자체는 inputs:[]이므로 data→parameter 역참조를 저장할 수 없다.
후속 URL/조건부 consumer는 해당 owner가 동일 collector/planner에 등록하며 이 단계에서 가짜 node를
저장하지 않는다. work/resource 한도는 기존 validateWorkLimit와 expression limits를 공유한다.

Domain action은 preflight와 wrapped child orchestration을 소유한다. parameter state는
`editSemantic({property:"resource[parameter:threshold]",value:...})` 또는 remove:true로 갱신한다.
Primitive가 AST를 자동 평가하거나 computed revision 번호만 바꾸지 않는다. 기존 immutable speculative
실행 방식으로 candidate를 먼저 완성하고 검증한다. Extension primitive의 중간 state에 stale computed
ref가 있으면 완성된 domain 결과/저장 복원으로 통과할 수 없다. 새로운 public batch/transaction API나
validation 우회 옵션을 만들지 않는다. 실제 child action과 materialization은 trace에 남는다.

## P4 — 삭제·composition·저장 복원

삭제는 restrict만 제공한다. computed, stored resource, retained facet/repeat source의 참조가 하나라도
있으면 resource-in-use와 작은 consumer ID 목록을 반환한다. cascade/force로 수식이나 dataset을
암묵적으로 없애지 않는다. 참조 수식을 바꾸거나 해당 derived resource를 먼저 제거해야 한다.
Primitive remove도 같은 collector를 사용해 domain 삭제를 우회하지 못한다.

Resource는 unit-local이다. concat에서는 기존 명시 child scope로 처리하고 sibling의 같은 ID에 전파하지
않는다. facet/repeat parent 편집은 retained source를 갱신한 후 기존 composition recipe로 모든 child,
shared domain/guide, ancestor layout을 다시 만든다. child 복사본의 resource 값을 parent의 별도 정본으로
삼지 않는다. retained source와 child 생성 시 parameter resource와 exact ref도 함께 복사·검증한다.

G-EXPR D2대로 editable schema4/tagged codec을 유지하는 additive 변경이다. 이전 reader가 새 resource
kind 또는 v2 transform을 만나면 명시 거부해야 한다. legacy schema1–3로 parameter payload를 위장해도
거부한다. graphic-only schema는 그대로다. 복원은 validators로 ref/type/revision을 확인하며 재계산·fetch·
action replay를 실행하지 않는다. restore→editParameter→reviseData→serialize를 새 Node process에서도
동일하게 실행해야 제품 통합 완료다. 이번 codec 실험은 값 보존 가능성만 증명한다.

## P5 — 소유자·package·호환성

| 책임 | 기존 owner / 승인 후 최소 확장 후보 |
|---|---|
| scalar options와 resource normalization | grammar의 작은 parameter owner; ownData/identifiers/limits 재사용 |
| named identity와 exact revision lookup | selectors/resources.js |
| resource kind/schema/graph/prepared input | materialization/resourceState.js, primitives/resourceState.js |
| AST dependency, computed materialization | expressionAst.js, transforms.js, actions/data/computed.js |
| resource/data reference closure·revision | core/resourceReferences.js, datasetReferences.js, data/edit.js |
| domain CRUD | actions/parameters의 facade; action()/editSemantic 사용 |
| snapshots, legacy rejection | persistence/validation.js, 기존 tagged codec |

Full은 세 action을, Basic은 createParameter와 v2 computed 생성을 제공하는 안이다. Basic의 기존
creation-only data 편집 경계는 유지한다. Basic→deserializeProgram은 기존처럼 Full로 복원한다.
함수형 export와 method/type/TargetedOptions 선언은 인접 action registration 계약을 따른다.
새 package subpath는 만들지 않는다. 무거운 revision planner는 Basic create 경로에서 import하지 않는다.
생성 docs와 Current 계약·inventory·action cards는 실제 공개 통합 checkpoint에서 함께 갱신한다.
승인 전 후보를 Current/Planned에 등록하지 않는다. renderer는 graphicSpec만 읽는다.

## P6 — 승인 범위·실행 순서·통과 기준

P1–P5의 계약과 이 통합 순서를 승인 대상으로 제안한다. G-EXPR D6의 공개 v2 경계는 변경하지 않는다.
승인 후 parameter normalization/resource validation/reference planning의 내부 구현과 안정 시험을 진행할
수 있다. 공개 parameter/v2 action 노출과 최종 computed binding은 G-DATA 계약 확정 후 하나의 완결된
제품 surface로 통합한다. 기능이 없는 placeholder action을 내보내지 않는다.

STEP-016의 ordered first-match/otherwise/empty-domain 정책은 이번에 구체화하지 않았으며 별도
후속 review가 필요하다. 기존 DATAFLOW-INTEGRATION 의무는 유지한다. G-PARAM 승인이나 scalar
reference 실험만으로 AT-18 또는 STEP-013을 닫지 않는다.

- 현재 검토: 제안 선언의 positive/negative calls, scalar/resource/revision/closure reference 실험,
  현재 제품의 신규 kind/API 부재, 기존 focused tests·전체 normal suite·machine metadata.
- 내부 구현: 불변성·getter0회·type/null/zero/empty/한도·stale/duplicate/cycle/diamond·atomic failure,
  typed resource/data namespace와 primitive removal 우회 방지, 영향받은 source coverage.
- 공개 통합: Full/Basic installed consumer와 declarations, create/edit/revise/facet/lookup/selection,
  schema·lineage·inspection·codec fresh process, docs/contracts, 전체 coverage·realistic·browser/render.
  SVG·Canvas 및 PNG·PDF·scene은 같은 materialized 결과를 소비하는지 확인한다.

[consumers.json](consumers.json)이 각 통합 cell과 아직 실행하지 않은 검사를 보존한다.
새 visual primitive는 없으므로 이번 Gate에서 별도 시각 승인을 만들지 않는다.
[verify.mjs](verify.mjs)는 **검토용 scalar 모델/현재 kernel/현재 baseline**을 구분해 보고한다.
모델은 ChartProgram을 구현하지 않으며 실제 domain transaction·rematerialization의 통과 증거가 아니다.
