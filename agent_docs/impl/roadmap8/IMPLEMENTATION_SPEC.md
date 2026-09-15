# Roadmap 8 데이터·저작 구현 상세 계약 — 개정 2

이 문서는 **미구현 제안**의 세부 의미를 고정한다. 이름을 비슷하게 추측해 바로 코딩하지 말고
[PROPOSED_TYPES.d.ts](PROPOSED_TYPES.d.ts), [구현 지도](IMPLEMENTATION_MAP.json), [인수 사례](ACCEPTANCE_CASES.json)를 함께 읽는다.
F06은 제외됐다. 이 문서에는 그 기능의 public/private implementation 작업을 추가하지 않는다.

## 0. 공통 작업 계약

### 0.1 함수와 변경 순서

기존 정상 실행은 `normalize → resolve resources → pure compute → editSemantic → wrapped materialize`다.
새 schema preflight는 pure compute 앞에 넣는다. 전체 액션의 기본 절차는 다음과 같다.

```text
before = inputProgram
options = validateClosedObjectAndNormalize(request)
resources = resolveExplicitOrCurrentUnique(before, options)
schema = resolveKnownInputSchema(before, resources)
requirements = policy.inputFields(options)
assertFieldsAvailable(schema, requirements)
definition = policy.normalize(options)
outputSchema = policy.outputSchema(schema, definition)
result = policy.compute(resources.values, definition)
assertComputedRowsMatchSchema(result.values, outputSchema)
next = writeThroughWrappedActions(before, definition, outputSchema, result)
next = explicitlyApplyDependentMaterialization(next)
return next
```

실패 시 before/caller input은 byte 또는 deep-equal로 유지되어야 한다. 실패를 catch해 before를
성공 결과처럼 반환하지 않는다. validation와 materialization을 서로 다른 계산식으로 구현하지 않는다.
실제 derive 함수가 배열을 반환하는 현재 경로는 유지할 수 있고, report가 필요한 family만
`{values, report, resolved?}`를 반환하도록 helper를 점진적으로 확장한다.

### 0.2 오류와 리소스 주소

새 예외 종류를 늘리기보다 기존 `annotateError/getErrorDetails`를 사용한다.
missing field는 code `missing-resource`, resourceId는 dataset ID, optionPath는 요청의 field 위치다.
없는 domain은 `incompatible-resource`, 옵션 모양 오류는 `invalid-option`, 값 오류는 `invalid-value`,
한도 초과는 `resource-limit`이다. 사람용 message에는 field 이름/원인을 넣되 raw row 전체는 넣지 않는다.
조회 report의 field-unavailable/domain-required reason은 이 stable code 위의 별도 reason token이다.
message 정규식으로 의미를 복구하지 않는다. 필드명에 점/대괄호가 있더라도 실제 객체 key로 처리한다.

### 0.3 파일 경계

- pure normalization/calculation/schema derivation은 `src/grammar/`에 둔다.
- state 기록과 hierarchy는 `src/actions/`에서 기존 primitive를 호출한다.
- dependent materialization은 기존 planner와 resource discovery를 확장한다.
- read-only exported helpers는 Phase 5에 `src/inspection.js`에서 노출한다.
- 새 semantic path는 parser, primitive validator, types, persistence, current contract를 같이 갱신한다.
- 계획의 타입 파일을 product 타입으로 import하지 않는다. 승인 후 필요한 정의를 실제 `types/`에 옮긴다.

## 1. F01: schema와 필드 검사

### 1.1 소유와 정확한 shape

source/derived dataset마다 `semanticSpec.datasets[].schema`에 DatasetSchema를 저장한다.
source 입력은 `createData({id,values,schema?:SourceSchemaInput})`, source 교체는
`reviseData({source,id,values,schema?:SourceSchemaInput})` 확장이다.
schema mode origin은 declared/inferred/derived이고, field lineage의 origin dataset/field를 추적한다.
state의 field storageType은 number/string/boolean/array/object/unknown/mixed다.
nullable은 null, optional은 property 없음 또는 undefined를 뜻한다. 둘은 별개다.

```json
{"version":1,"completeness":"known","origin":"declared","fields":[
  {"name":"x","storageType":"number","nullable":false,"optional":false},
  {"name":"y","storageType":"number","nullable":true,"optional":false}
]}
```

declared input은 fields 배열만 받는다. name은 nonempty/unique, boolean defaults는 false,
storageType은 unknown/mixed를 제외한 concrete 타입이다. descriptor unknown keys는 거절한다.
declared input은 closed field set이므로 선언되지 않은 row key도 거절한다. source는 여전히 dense plain rows다.
schema를 생략하면 모든 row의 own enumerable keys union을 처음 관측한 순서대로 수집한다.
동일 field에서 null/undefined를 제외한 concrete type가 하나면 그 type, 여럿이면 mixed, 없으면 unknown이다.
Date/function/class/cycle는 기존 JSON-like source 제약대로 거절하며 object로 정규화하지 않는다.

`values:[]`이고 선언 schema가 없으면 completeness unknown/fields[]다.
`schema:{fields:[]},values:[]`이면 completeness known/fields[]다. `[{}]`의 inferred schema도 known/fields[]다.
field schema가 known이지만 storageType unknown이면 존재는 확인되며 타입 의존 계산의 증거는 부족하다.
빈 rows에서 수치값이 없다는 이유만으로 field를 number로 바꾸지 않는다.
storageType number는 값의 저장 타입 정보이며 모든 operator에서 finite임을 보증하는 타입이 아니다.
기존 source value 허용 계약을 schema inference로 몰래 강화하지 않는다. finite 여부는 해당 연산이 검사한다.
field lookup은 Object.hasOwn/Map을 사용하고 `__proto__` 같은 문자열을 객체 prototype 접근으로 처리하지 않는다.

### 1.2 availability와 값 검증

1. dataset resolver로 실제 source/current revision을 고정한다.
2. schema가 없는 legacy nonempty dataset은 private helper로 추론한다. 조회는 program에 쓰지 않는다.
3. completeness unknown이면 필요한 field 목록을 충족했다고 판단하지 않는다.
4. known schema에 요구 field가 없으면 행 수와 무관하게 거절한다.
5. fields가 있으면 해당 operator의 타입/optional/null policy에 따라 실제 값을 검사한다.
6. source array mutation 없이 result를 만들고 output schema와 값의 부합을 검사한다.

name typo와 실제 row에 없는 optional 값은 다른 경우다. optional field는 schema에 존재하며 missing 정책을 따른다.
all-null의 unknown storage는 명시 missing drop이 있는 숫자 통계에서 빈 eligible 집합으로 처리할 수 있다.
mixed의 유효 문자열을 drop으로 숨겨 numeric 결과를 만들지 않는다.

### 1.3 transform 출력 규칙

`TRANSFORM_POLICIES`에 `inputFields(definition)`와 `outputSchema(input,definition)`를 추가한다.
새 함수명은 internal이며 다른 메타데이터 registry를 만들지 않는다. transformTopology와 별개 축이다.

| family | 출력 계약 |
| --- | --- |
| filter, sort, markFilter | input fields 유지. 행 수·순서가 달라도 schema를 rows에서 재추론하지 않음 |
| computed, timeUnit, window | input 유지+명시 output role. output 충돌과 AST의 모든 field 참조 preflight |
| summary | group keys+aggregate outputs+optional members만. count/valid는 number nonnullable |
| bin/bin2d | 실제 as lower/upper/count/members. summary 결과에 원본 모든 field를 있다고 쓰지 않음 |
| regression | group,x,y 및 interval 요청 시 bounds. interval false는 bounds 미존재 |
| density/interval/ecdf | 실제 family 출력 역할과 group keys, null policy로 nullable 결정 |
| fold/complete/impute/normalize/stack | 기존 실제 row construction을 기준으로 input 유지/추가/제거를 선언 |
| box/horizon/gradient/statisticalReference | built-in 전용 output도 등록. 사용자-facing 여부와 무관하게 coverage 필요 |

각 family의 current validator/row constructor와 실제 output field set을 비교하는 contract test를 만든다.
표의 일반 설명을 복사해 모든 family에 같은 schema를 쓰면 안 된다. unknown external extension은 unverified다.

### 1.4 상태 기록과 replay

createData는 values/schema를 하나의 외부 액션 안에서 기록한다. primitive 중간 write마다 완성 상태를
검증하여 valid final update를 거절하지 않도록 source create와 migration을 구별한다.
`createDerivedData`는 source+transform을 알고 있으므로 derived definition 시점에 output schema를 만든다.
materializer는 결과 rows와 그 schema를 검증하고, source가 0행이어도 schema를 지우지 않는다.
`editDerivedData` revision plan이 바꾸는 모든 output role과 field lineage를 재계산한다.
`reviseData`에서 declared schema omission은 원래 선언을 상속해 새 값을 검사하고, inferred source는 새 값에서
재추론한다. explicit schema를 주면 새 계약으로 검증하며 소비자 타입 충돌 시 atomic reject한다.

### 1.5 schema 1 snapshot migration

새 editable snapshot writer는 envelope schemaVersion2, reader는 1/2를 허용한다.
graphic-only writer/reader는 payload 변화가 없으므로 기존 schemaVersion1을 유지한다.
2 reader는 dataset schema를 required로 검사하고 derived schema와 definition의 일치를 확인한다.
1 reader는 기존 strict validation을 먼저 거친 후 children 재귀+dataset DAG 위상 순서로 schema를 복원한다.
원본 값과 exact transform definition으로만 추론한다. unknown source에서 field 계약을 증명할 수 없으면
unknown을 보존하되 기존 graphic 복원은 허용하고 이후 의미 편집에 진단을 제공한다.
source 없는 참조/cycle/중복 ID를 migration으로 고치지 않는다. 현재 이미 거절하는 payload는 계속 거절한다.
old parameter omission의 통계 정책은 0.0.16과 같아야 하며 새로운 정책으로 migration하지 않는다.

## 2. F02: empty domain와 nullable consumer

### 2.1 API와 저장 위치

`emptyDomain:"preserve"|"require-explicit"`를 기존 scale definition/scale option union에 추가한다.
semantic path는 `scale[id].emptyDomain` 한 곳이다. encoding/facade의 nested scale options가 이를 전달한다.
omission은 기존 동작이다. 기존 markFilter-empty의 보존 경로를 유지하고 일반 자동 domain은 기존처럼 실패한다.
새 preserve는 opt-in이며 기존 snapshot에 없던 임의 default를 삽입하지 않는다.

### 2.2 도메인 결정 순서

```text
if explicit domain: validate and use explicit domain
else if eligible values exist: resolve normal automatic domain
else if existing markFilter legacy empty case: existing compatible behavior
else if emptyDomain == preserve and prior domain meaning matches: reuse prior domain
else: throw annotated domain-required
```

preserve를 위해 resolvedScales[id]에 내부 `bindingSignature`를 추가한다. domain 값은 이미 있는
resolved domain 한 곳에 두고 signature에 복제하지 않는다. signature는 channel role, coordinate family,
field or datum, fieldType/unit, aggregate/bin 의미, contributing logical dataset identities의 canonical tuple이다.
style/title/pixel range는 tuple에 포함하지 않는다. data revision plan의 검증된 old→new logical mapping은
동일 source identity로 정규화하지만, 같은 이름의 다른 source를 임의로 동일시하지 않는다.
shared scale은 모든 contributing consumer의 의미가 호환되어야 한다. 하나의 nonempty consumer라도
있으면 통상 domain resolution을 사용하며, domain preservation으로 그 값을 무시하지 않는다.
range는 현재 Canvas/coordinate에서 다시 계산한다. 이전 pixel range까지 유지하지 않는다.

### 2.3 빈 그래픽과 missing 값

기존 mark policy별로 logical data item 0개인 concrete graphics를 만든다. guide/title은 독립 의미이므로
명시 domain이나 보존된 domain이 있으면 유지할 수 있다. 이름/owner/order를 유지해 복구 시 중복 생성하지 않는다.
bin frequency0은 값이 있는 통계이며 data-empty와 다르다. 0 크기의 bar를 null로 바꾸지 않는다.
회귀 fitting 실패는 빈 그래픽으로 대체하지 않는다. 구간 표본 부족 역시 명시 실패다.

nullable 일반 mark 소비는 기존 `mark.missing`의 error/break 계약을 보존하고 새 `"skip"`을 제안한다.
skip은 point/bar/rect/tick/rule/text 같은 독립 item에서만 허용한다. line/area는 기존 break로 연결을 끊고,
새 skip으로 결측 구간을 몰래 이어 붙이지 않는다. arc는 angle 합계/그룹 의미가 달라질 수 있으므로
명시 dataset missing policy로 처리하고 generic skip 지원으로 표시하지 않는다.
skip된 member는 selection/label/accessibility eligibility와 같은 집합을 사용하며 inspect에서 count를 보고한다.
새 완결 소비 범위와 미지원 조합을 types/capability에 함께 등록한다. Polar/Parallel 전용 existing missing 계약은
강제로 이 enum에 합치지 않고 정확히 지원하는 조합을 표에 기록한다.

## 3. F03: 결측과 계산 보고

### 3.1 호환성 기본표

새 `missing` omission은 현재 family가 처리하던 결과를 유지한다. 아래 표는 구현 시작 시 기존 test와
함께 동결할 baseline이며 전체 policy를 하나의 global default로 바꾸지 않는다.

| family | 현재 누락/결측 처리 | 새 명시 정책의 의미 |
| --- | --- | --- |
| summary numeric value | finite 집합 계산, 빈 값은 undefined | error/drop + empty null/identity |
| bin/density/regression quantitative input | 비유한·null 값 거절 경로 | error 유지 또는 명시 drop |
| interval | 유효 표본으로 계산, 작은 그룹은 family 정책 | explicit error/drop을 먼저 적용하고 표본 조건 유지 |
| ECDF/window | 이미 있는 missing option 보존 | 기존 token을 rename하지 않고 report를 연결 |
| weighted | 기존 weight-kind/invalid 검증 보존 | missing value/weight exclusion과 zero weight를 구별 |

행 count는 그룹이 형성된 실제 행 수, valid count는 field의 valid 관측수다. 그룹 key null은 typed
category로 유지하던 current family의 계약을 유지한다. 데이터 필드의 missing drop으로 group key를 삭제하지 않는다.
summary의 여러 measures는 각 field별 eligibility로 계산한다. y가 null이라는 이유로 같은 행의 정상 z를
합계에서 제외하지 않는다. regression은 x/y pair, KDE/bin/interval은 해당 value/weight 단위로 eligibility를 정한다.

### 3.2 오류 우선순위와 report

처리 순서는 구조/field 검증 → invalid 타입/비유한값 거절 → 명시 missing 정책 → finite 계산이다.
missing:"drop"도 Infinity/NaN/객체/수치 문자열을 null로 취급하지 않는다. 이 변경이 기존 omission의
결과를 바꾸면 omission 경로는 별도 호환 branch로 보존하고 explicit path만 강화한다.

계산 report의 canonical owner는 `materializationConfigs.calculations`다.
`datasets[id]`는 materialized derived dataset, `layers[id][role]`는 inline aggregation 등 별도 dataset이
없는 계산 결과를 소유한다. 같은 계산을 두 owner에 복제하지 않고 alias 소비자는 ownerRef로 연결한다.
records는 input resource reference+정규화된 definition과 같은 revision에 묶이고 old records를 새 data에 사용하지 않는다.
상태 schema validator와 typed resource collector에 이 참조를 등록한다.

report는 계산 단위 unit 배열을 가진다. 각 unit은 group/measure role, inputRows, usedRows, excludedRows,
exclusive reason counts, optional zeroWeightRows를 가진다. input=used+excluded를 항상 만족해야 한다.
같은 원본 행이 다른 measure에 쓰일 수 있으므로 여러 unit의 inputRows를 전체 행 수로 합산하지 않는다.
missing value와 weight가 같은 행이면 `missing-value`가 우선인 하나의 exclusion reason만 센다.
zero weight는 input에 존재하고 excluded로 세지 않으며 contribution0 사실을 별도 표시한다.
bin domain 밖 값은 `outside-domain`, 결측값은 `missing-value`로 별도 센다.
full raw values/실제 사용자 입력 strings를 diagnostic evidence에 복제하지 않는다.

### 3.3 report와 recompute

pure derive가 report를 만들고 owning domain materializer가 `._withMaterializationConfig`를 통해 저장한다.
report write 자체를 새 사용자 액션으로 노출하지 않는다. 원래 액션의 의미 있는 자식 materialization은 trace에 남는다.
rebind/revise/facet/repeat 시 input identity와 counts를 재생성하고, remove 시 참조 closure와 함께 제거한다.
report는 Phase5 inspectProgram의 `calculations`로 읽는다. 별도의 자동 추천 점수로 사용하지 않는다.
primitive extension이 해당 계산 경로를 쓰지 않으면 missing report를 0으로 채우지 않고 unavailable로 기록한다.

## 4. F07: 필터 상세 알고리즘

### 4.1 create와 evaluate

공통 modes는 oneOf/noneOf/predicate/range 중 정확히 하나다. oneOf/noneOf는 nonempty dense scalar array이고
typed equality를 쓴다. 중복 값은 정규화 과정에서 first occurrence로 제거할 수 있으나 1과"1"은 다르다.
독립 새 `nulls:"include"|"exclude"` 옵션을 제안한다. null과 absent/undefined에 적용하며 field schema가
먼저 존재해야 한다. omission은 기존 비교 의미 유지, 새 noneOf는 typed not-in 의미를 사용한다.
explicit nulls는 mode 계산보다 먼저 missing row의 포함 여부를 결정한다.

range는 min/max가 적어도 하나 필요하며 경계 값은 finite number 또는 string이다. 두 경계가 있으면
같은 타입, min≤max다. inclusive와 minInclusive/maxInclusive 중 두 문법군을 섞으면 reject한다.
제공하지 않은 경계의 inclusive option도 reject한다. 새 문법에서 제공된 경계의 default inclusion은 true다.
range:null, NaN, Infinity, unknown keys, 양 경계 없는 {}는 invalid다.

```text
matchRange(value, normalized):
  if not same comparable primitive type: false
  if lower exists and (value<lower or value==lower and !lowerClosed): false
  if upper exists and (value>upper or value==upper and !upperClosed): false
  return true
```

같은 경계 min=max에서 양쪽 closed만 equality 한 점을 포함한다. 한쪽 open이면 정상적인 empty predicate다.
calendar/offset parsing을 수행하지 않는다. timestamp/date normalization은 명시적인 데이터 준비의 책임이다.

### 4.2 edit의 부분 merge 규칙

- 같은 field에서 range만 수정: 기존 range의 미지정 경계를 유지한다.
- 기존 inclusive를 min/max inclusion으로 정규화한 뒤 patch를 적용한다. 새 patch에서 inclusive를 주면
  현재 존재하는 모든 경계에 같은 boolean을 적용한다. 양 문법군을 함께 전달한 patch는 reject한다.
- 편집에서만 min:false/max:false는 그 경계를 제거하는 sentinel이다. create에서는 false 경계 reject다.
  삭제 후 양 경계가 없으면 reject한다. 삭제한 경계의 inclusion metadata도 제거한다.
- field 변경 또는 mode 변경: 이전 mode의 field 전용 값은 상속하지 않는다. 새 complete mode가 필요하다.
- mode를 변경하지 않는 nulls-only patch는 기존 mode/field 유지다. nulls:false는 edit에서 override 제거다.
- stored transform은 requested field/mode와 normalized ranges를 가지며 legacy inclusive 문법도 reader가 정규화한다.
  없앤 경계를 undefined key로 저장하지 말고 실제 key를 제거한다.

`normalizeFilterEdit`의 기존 replaceExclusive가 range 전체를 바꾸는 경로이므로 이 부분 merge를
명시적으로 추가한다. 다른 transform의 nested edit 정책을 공통 shallow merge로 바꾸지 않는다.
mark selector op=range/noneOf도 같은 boundary validator를 쓰되 최종 item membership을 평가한다.

## 5. F04: 회귀 상세 알고리즘

### 5.1 interval/predict normalization

linear/polynomial은 interval false/mean/prediction, loess는 interval 옵션 자체가 없는 현재 계약을 유지한다.
interval false와 confidence/level/confidenceMethod 동시 explicit 입력은 reject한다.
edit에서 interval false만 주면 과거 inherited confidence metadata를 지운다. 새로운 explicit 충돌값은 숨겨 지우지 않는다.
interval mean/prediction을 다시 켜면 생략된 confidenceMethod/level은 기존 승인된 defaults를 적용한다.
band:false만으로 interval 계산을 중단하지 않는다. interval false로 create할 때 band omission은 disabled,
band object는 충돌이다. edit에서 interval false로 바꾸면 owned band 제거도 같은 action의 효과로 포함한다.
독립적인 CI field 소비자가 있으면 전체 수정 reject다. interval을 다시 켤 때 제거된 band를 자동 복구하지 않고
명시 band 옵션 또는 보존된 visibility 계약에 따라 처리한다. 이 개정안은 edit로 제거한 band는 계속 disabled를 권장한다.

predict omission은 observed unique sorted x, `{values}`는 strictly ascending unique finite array 길이1 이상,
`{domain,steps}`는 lower<upper와 integer steps≥2다. domain grid는
`x_i=lower+(upper-lower)*i/(steps-1)`이며 양 끝을 정확히 입력값으로 고정한다.
overflow 위험은 stable interpolation helper와 finite validation으로 검사한다. group별 같은 grid를 사용하며
모든 그룹의 총 output count가 기존 generated-item cap을 넘으면 생성 전 reject한다.
edit의 predict omission은 기존 설정 유지이며, `predict:false`는 저장된 explicit grid를 제거해 observed
모드로 복귀하는 edit-only sentinel이다. create의 predict:false는 거절한다. regression data focused edit도
같은 normalization을 재사용한다. stored transform에는 false가 아니라 predict key 부재로 저장한다.

### 5.2 모델과 구간

linear:
`n>=2`, `Sxx>0`, `b1=Sxy/Sxx`, `b0=meanY-b1*meanX`. 기존 안정화 계산을 재사용한다.
interval false이면 residual variance/critical value 계산에 진입하지 않고 fitted 값만 반환한다.
interval mean/prediction은 n>=3, df=n-2이며 기존 confidenceCriticalValue를 사용한다.
mean variance multiplier는 `1/n+(x-meanX)^2/Sxx`, prediction은 앞 식에1을 더한다.
polynomial은 degree+1개의 독립 정보로 fit 가능 여부를 검증하고 CI는 양수 잔차 df를 요구한다.
loess는 observed fit과 explicit prediction 위치에서 같은 local fitting algorithm을 사용한다.
loess의 새 CI 또는 unsupported CI imitation을 추가하지 않는다.

prediction positions에 따른 값과 conditioning을 직접 검사한다. 관측 위치의 예측값을 선형 보간하여
polynomial/loess explicit grid를 대체하지 않는다. 외삽 여부는 각 group의 실제 fitted x extent와 비교한다.
result schema/fields에 false interval의 lower/upper가 없어야 한다. bands/legends/accessible export도 같은 결과를 읽는다.

## 6. F05: source-follow 상세 저장과 순서

### 6.1 관계를 저장할 한 곳

현재 회귀의 owner는 source point의 `markConfigs[pointId].regression`이다. 새 의미 관계는
`semanticSpec.layers[pointId].derivedBindings.regression`에만 저장한다.
정확한 shape는 `{mode:"follow", roles:["data","x","y"]}`다. sourceTarget ID는 parent layer ID이므로
중복 저장하지 않는다. fixed는 이 semantic entry의 부재로 표현한다. `sourceBinding:"fixed"`로 편집하면 entry 제거다.
기존 materialization recipe의 dataId/lineId/bandId/parameters/groupBy/appearance 참조는 현재 owner에 유지한다.
이 resolved recipe는 실행 결과이며 semantic follow mode의 독립 복제본이 아니다.

다른 mark를 source로 연결하는 새 target selector를 이번 범위에 추가하지 않는다. source point의 기존
regression owner가 유일한 anchor다. detached curve를 별도 source로 바꾸는 일반 graph editor는 범위 밖이다.
구조적으로 self/cross-reference cycle을 만드는 extension payload는 resource validator에서 거절한다.

### 6.2 무엇을 추적하는가

follow는 source layer의 dataflow 최종 입력 data와 quantitative x/y binding을 읽는다.
groupBy는 회귀 생성 때 resolve한 기존 recipe를 유지한다. color/style 변경으로 groupBy를 다시 추론하지 않는다.
fixed 모드의 현재 explicit data/field recipe를 변경하지 않는다. source-dependent geometric scale 갱신은
기존 규칙을 계속 따르되 data statistic 재적합을 몰래 수행하지 않는다.
follow create/edit에서 explicit x/y/data가 source의 의미와 불일치하면 incompatible-resource다.
source가 quantitative x/y를 잃으면 해당 combined edit는 원자적으로 거절한다.

### 6.3 trigger와 실행

trigger는 encodeX/Y/encodeChannels, source data rebind/filterMarks/removeMarkFilter,
editDerivedData descendants recompute, reviseData, facet/repeat 재생이다.
style/title/grid/Canvas 변화만으로 fit을 다시 계산하지 않는다. compare normalized dataflow/roles로 판단한다.
공통 private helper `planFollowingRegression(before, after, affectedOwners)`는 plan만 만들고 mutate하지 않는다.
호출 owner는 최종 semantic patch를 preflight한 뒤 내부적으로 `editRegression` 또는 공유 revision kernel을 호출한다.
follow 실행용 internal patch와 사용자 explicit request 검증을 구분하여 정상 동기화가 충돌로 거절되지 않게 한다.
reentrancy guard는 한 action 실행의 local plan 상태이며 serializable semantic flag를 임시 켜지 않는다.

실행 순서는 source final patch/schema → new regression fit → source/curve/band domain union →
mark materialization → guides/layout → selection/labels/highlights다.
source x/y에 대한 중간-invalid 상태를 보고 fit하지 않으며 encodeChannels의 final patch에서 한 번만 실행한다.
외부 공개된 earlier program과 오래된 standalone dataset은 불변으로 남지만 새 결과 owner는 최신 revision만 참조한다.
실패는 source를 포함한 외부 액션 실패다. retain old curve 후 warning으로 성공 반환하는 degradation은 도입하지 않는다.

## 7. F08: 정렬 데이터 상세 구현

### 7.1 API와 topology

`createSortedData({id,source?,sortBy})`, `editSortedData({target,sortBy,dependents?})`를 Full에 추가한다.
transform은 `{type:"sort",sortBy:[...]}`, materializer는 materializeSortedData다.
edit는 sortBy 배열 전체를 replace한다. 각 key의 일부만 index로 수정하는 API는 만들지 않는다.
dependency policy는 기존 reject(default)/recompute를 재사용한다. materialization data owner family는 sort다.
`transformTopology.sort.facetTopology`는 statistical로 두어 partition 후 재실행한다.
행 membership 유지와 facet partition replay transparency를 같은 개념으로 취급하지 않는다.

### 7.2 sort key

key는 field,order(ascending default),nulls(last default),optional temporalUnit이다.
temporalUnit이 없으면 numeric/string/boolean의 한 공통 storage type로 비교한다. null/undefined는 missing bucket이다.
temporalUnit은 year/timestamp만 허용하고 기존 `normalizeTemporalValue`로 finite 값/4자리 year를
명시적으로 정규화한다. arbitrary locale date string/Date.parse를 sort에 새로 도입하지 않는다.
timestamp는 UTC milliseconds 숫자, year는 기존 year 입력 계약을 따른다. calendar date 문자열은 host가 먼저 정규화한다.

sortBy는 nonempty/dense/field unique이며 모든 key의 field 존재를 empty source에서도 검사한다.
mixed nonmissing storage types 또는 object/array key는 오류다. nullable/optional 존재 자체는 오류가 아니다.
숫자는 `<`/`>`로 비교하여 a-b overflow를 피한다. strings는 JS code-unit lexical `<`/`>`를 사용하며 localeCompare 금지.
boolean은 false<true. missing placement는 direction과 독립이다: descending이어도 nulls:last는 항상 마지막이다.
모든 key 동점이면 original source row index ascending이다.

```text
decorated = rows.map((row,index)=>({row,index,keys:normalizeKeys(row)}))
sort a,b:
  for each sort key:
    if either missing: compare null placement; if different return result
    else compare typed values; if different return direction * result
  return compare(a.index,b.index)
output = decorated.map(item=>item.row)
```

input rows/array를 sort하지 않는다. 이미 library-owned immutable row라면 같은 row identity를 공유할 수 있다.
출력 schema는 input과 동일하며 lineage는 reorder 관계다. 가짜 output field나 originalIndex column을 만들지 않는다.
원본 정렬 인덱스는 이 계산에만 사용하고 UI stable row identity로 영속화하지 않는다.

### 7.3 반드시 등록할 파일

grammar sort + transforms + transformTopology, actions/data/sort + data/index,
edit.js의 CREATOR_BY_TYPE/REVISION_ROLE/EDIT action 목록, revision outputRoles(empty),
facets replay compatibility, semantic transform validator, types unions, current contract,
generated cards/catalog, persistence/typed resource references.
`createDerivedData`에 임의 type string을 통과시켜 registry를 생략하는 shortcut은 금지한다.

## 8. implementation과 승인 검토의 관계

상세 타입·저장 위치·알고리즘은 추론 부담을 줄이기 위한 **권장 제안 고정안**이다.
D01–D07/D09–D14의 기존 승인 근거가 없으면 product 구현 승인으로 쓰지 않는다.
이전 FEATURES/DECISIONS의 “추후 정확화” 표현은 이 문서로 구체화했으며 추가 추측 없이 review할 수 있다.
검토에서 다른 선택이 승인되면 types/map/cases/example을 함께 고치고 해당 개정만 구현한다.
