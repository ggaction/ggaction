# Roadmap 8 결정·호환성·Gate 원장

모든 결정은 **제안**이다. 계획 작성은 승인됐지만 새 API·저장 형식·구현·릴리즈는 승인되지 않았다.
Gate state는 planned/ready-for-review/approved/changes-requested만 사용한다. 제품 코드나
실행 가능한 prototype가 없는 이번 문서를 구현 완료 증거로 해석하지 않는다.

## 결정 목록

| ID | 권장안 | 호환성과 중요한 대안 | Gate |
| --- | --- | --- | --- |
| D01 | dataset schema를 의미 상태의 canonical field 계약으로 저장; transform policy가 전파 | 앱의 stable field ID를 core binding 전체에 강제 도입하지 않음. metadata 없는 빈 과거 source는 unknown | G1 |
| D02 | 새 schema/relationship 저장을 포함하는 snapshot schema 2; schema 1 reader 유지 | old snapshot의 빈 source를 추정해 채우지 않음. schema 1 그대로 확장하는 대안은 strict validator 호환성이 불명확하므로 비권장 | G1 |
| D03 | emptyDomain의 preserve/require-explicit; 없는 domain은 명확한 미결정 오류 | implicit [0,1] 등 의미를 지어내는 fallback 제외. 기존 domain reuse는 같은 field/type/unit 관계에 한함 | G1 |
| D04 | missing/empty 정책은 명시적 opt-in; 기존 omission은 per-family baseline 유지 | 기본값 일괄 drop/identity로 바꾸면 결과·차트·serialized state가 달라짐. 변경 원하면 별도 migration 결정 | G2 |
| D05 | noneOf와 경계별 range; 기존 inclusive와 새 옵션 혼합은 reject | generic expression/boolean AST까지 확대하지 않음. 날짜 parsing은 필터 외부의 명시 normalization | G2 |
| D06 | interval:false로 계산 생략, band:false는 표시 생략 유지; explicit predict grid | 기존 band:false를 interval:false로 자동 해석하면 기존 CI field 소비자가 깨짐 | G3 |
| D07 | sourceBinding fixed default, explicit follow는 source data/x/y 추적·groupBy 고정 | implicit reactive graph 또는 모든 grouping 상속 제외. 관계 변경은 semantic intent이고 renderer가 갱신하지 않음 | G3 |
| D08 | 1개 array field의 scalar 1단계 flatten, index/row lineage, empty/missing 정책 | object projection·multi-array zip/product는 명시 unsupported, 별도 요청 없이 scope 확대하지 않음 | G4 |
| D09 | 독립 sorted dataset, multi-key stable order, 명시 null placement | window에 더미 연산을 넣어 sort를 흉내 내거나 pathOrder를 dataset sort로 재해석하지 않음 | G4 |
| D10 | browser-safe read-only inspection entry, shared normalize/validation에 기반한 describeAction | 문서 string parser나 앱 추천기 내장 제외. Full/Basic/extension 검사 coverage를 구분 | G5 |
| D11 | conservative structural/semantic change report, unknown 가능 | 일반적인 semantic-equivalence prover나 lossless action log를 추가하지 않음 | G5 |
| D12 | owner-aware graphic inspection, 수행한 검사와 한계 공개 | data item/primitive/visible ink를 구분; renderer success를 의미 validation success로 오인하지 않음 | G5 |
| D13 | 측정 후 hotspot 최적화, output/work caps 유지, 신규 async/worker API는 증거 기반 | limit 상향·자동 sampling·데이터 의미 변경으로 속도를 맞추지 않음 | G6 |
| D14 | 모든 feature의 docs/types/persistence/package 동기화, 버전/배포는 별도 | 이번 계획을 main merge/PR/npm/docs publish 승인으로 재사용하지 않음 | G7 |

## G1에서 보여야 할 state 계약

아래는 shape 예시이며 final TypeScript/JSON schema가 아니다. 정확한 optional/type/unknown-field
검사와 normalizer는 실행 가능한 fixture로 검토한다.

```text
semanticSpec.datasets[id]
  values/source/transform                 기존 의미 유지
  schema
    fields[]: name, storageType, nullable, optional, origin
    origin: declared | inferred | derived
    derived field lineage: source dataset/field, owner, role

source schema = source 값 또는 명시 schema의 검증 결과
derived schema = 해당 transform policy(input schema, definition)의 결과
```

- storageType은 number/string/boolean/array/object/unknown/mixed를 구분하는 안을 제안한다.
  시간 semanticType/단위와 timestamp storage를 혼동하지 않는다. 세부 temporal encoding 계약과 일치시킨다.
- declared schema가 있으면 값과 충돌하는 타입·허용하지 않은 null/absent/unknown field를 검증한다.
  inferred source는 모든 row key의 union을 사용하고 row마다 field가 빠질 수 있음을 optional로 기록한다.
- schemaVersion 1 → 2 reader는 source부터 DAG 순서로 known schema를 재구성한다. 0행·all-null 등
  타입 증거가 없는 field는 unknown이다. old graphic snapshot은 그대로 render 가능해야 한다.
- source dataset에 field가 전혀 없다는 것과 schema 자체를 모른다는 것을 구분한다.
- 기존 action이 생성한 옛 snapshot의 migration 이후 render/추가 edit를 둘 다 검사한다.
  extension schema를 모르면 caller 등록 descriptor 또는 explicit unsupported로 처리한다.
- type/data policy의 자동 inference 결과를 현재 사용자가 명시적으로 선택한 의도로 기록하지 않는다.

## G3에서 보여야 할 relationship 계약

```text
semantic derived relationship
  owner: 실제 회귀 owner
  sourceTarget: source mark ID
  mode: fixed | follow
  followedRoles: inputData, x, y
  grouping: resolved fixed recipe

materializationConfigs
  기존 regression geometry/appearance 재계산 설정
  semantic relationship을 독립적으로 복제하지 않음
```

fixed mode의 기존 materialization recipe를 이동할지, 새 follow 의미만 semantic relationship에 저장할지는
현재 owner record와 함께 canonical JSON before/after를 G3에 제출한다. 한 사실을 두 owner가
각각 수정하는 구조는 허용하지 않는다. 이 저장 위치는 아직 구현 확정이 아니다.

source-follow가 각 함수에 흩어진 observer로 실행되지 않도록 encoding/data 변경 action에서
관계의 dependency closure를 계획하고, schema → 계산 → domain → mark → guide/layout 순서로 실행한다.
외부에 중간 program을 노출하지 않고 실패하면 원본을 반환하는 척하지 말고 오류로 전체 변경을 거절한다.

## Gate 상태와 패키지

| Gate | 현재 상태 | 구현 전 검토할 범위 | 승인 근거 |
| --- | --- | --- | --- |
| G0 | planned | F01–F12 순서, E01/E02 경계, 이 계획의 API 제안 | 없음; 계획 작성 요청만 있음 |
| G1 | planned | schema/empty/nullable 정책, persistence migration fixture, public calls | 없음 |
| G2 | planned | per-family default 영향표, missing/empty/filter 타입, raw numeric oracle | 없음 |
| G3 | planned | interval/grid/follow 계약, 관계 state, source 변경 전후 curve | 없음 |
| G4 | planned | flatten/sort source/output/schema/lineage, create/edit/remove 호출 | 없음 |
| G5 | planned | read-only entry export/types, 반환 schema, descriptor coverage, unknown 사례 | 없음 |
| G6 | planned | 새 public limit/async/cache boundary 변경이 필요한 경우만 그 구체안 | 없음 |
| G7 | planned | 최종 호환성·범위·검증 결과와 별도로 요청할 release 대상 | 없음 |

G0가 계획 승인으로 해소되더라도 아직 구체화되지 않은 D의 선택까지 자동 승인됐다고 쓰지 않는다.
반대로 사용자가 구체적인 여러 D를 한 번에 승인하면 해당 Gate에 같은 승인 근거를 연결하고
각 Phase에서 다시 허락을 묻지 않는다. G6은 이미 승인된 의미 안의 내부 최적화를 막는 Gate가 아니다.
G7도 구현 통합 검증을 막지 않으며 외부 배포 권한만 별도로 취급한다.

필요한 review package는 final source/call 또는 승인 전 primitive prototype, before/after state,
focused numerical/structural 검증, 기존 behavior 영향, declarations/문서 변경안으로 구성한다.
외관이 바뀌는 경우 렌더 이미지와 정확한 public 호출 및 primitive 대응을 추가한다.
원칙은 [impl/AGENTS.md](../AGENTS.md)가 소유하며 이 문서는 추가 승인 요구를 만들지 않는다.

## 최종 호환성 분류

1. **잘못된 입력의 교정:** 없는 field의 묵시적 빈 결과 → 명확한 오류. valid input 결과는 유지.
2. **명시적인 기능 확장:** interval false, predict, follow, flatten/sort, inspection entry.
3. **옵트인 정책:** missing/empty/range boundary. omission의 동작은 기존 fixture로 고정.
4. **저장 형식 확장:** schema 1을 읽고 새 형식을 쓰는 단방향 migration. 과거 runtime이 새
   snapshot을 읽을 수 있다고 보장하지 않는다. payload/data version과 package version을 분리한다.
5. **조건부 미래 범위:** E01/E02는 승인 전 별도 설계이며 core F 완료와 구분한다.

기본값을 변경해야 목표 의미를 제공할 수 있는 추가 사례가 발견되면 영향받는 정확한 호출과
새 기대 결과를 제시한다. 과거 0.0.16 릴리즈 승인으로 다른 결과 의미를 자동 승인 처리하지 않는다.
