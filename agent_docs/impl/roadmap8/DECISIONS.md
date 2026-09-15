# Roadmap 8 결정·호환성·Gate 원장

모든 구현 결정은 후속 사용자 승인에 따라 확정·적용됐다. 릴리즈 tag, npm publish, 문서 배포는 실행되지 않았다.
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
| D08 | **제외 확정** — 사용자 요청으로 F06(flatten) 삭제 | 2026-09-15 “flatten은 빼자”; 재승인 요청이나 후속 구현 의무 없음 | 해당 없음 |
| D09 | 독립 sorted dataset, multi-key stable order, 명시 null placement | window에 더미 연산을 넣어 sort를 흉내 내거나 pathOrder를 dataset sort로 재해석하지 않음 | G4 |
| D10 | browser-safe read-only inspection entry, shared normalize/validation에 기반한 describeAction | 문서 string parser나 앱 추천기 내장 제외. Full/Basic/extension 검사 coverage를 구분 | G5 |
| D11 | conservative structural/semantic change report, unknown 가능 | 일반적인 semantic-equivalence prover나 lossless action log를 추가하지 않음 | G5 |
| D12 | owner-aware graphic inspection, 수행한 검사와 한계 공개 | data item/primitive/visible ink를 구분; renderer success를 의미 validation success로 오인하지 않음 | G5 |
| D13 | 측정 후 hotspot 최적화, output/work caps 유지, 신규 async/worker API는 증거 기반 | limit 상향·자동 sampling·데이터 의미 변경으로 속도를 맞추지 않음 | G6 |
| D14 | 모든 feature의 docs/types/persistence/package 동기화, 버전/배포는 별도 | 이번 계획을 main merge/PR/npm/docs publish 승인으로 재사용하지 않음 | G7 |

## 개정 2 상세 명세와 권위

사용자가 flatten 제외와 다른 구현자를 위한 상세화를 요청했다. 범위 제외는 승인된 결정이다.
후속 승인으로 남은 새 API도 구현됐다. [IMPLEMENTATION_SPEC.md](IMPLEMENTATION_SPEC.md),
[INSPECTION_SPEC.md](INSPECTION_SPEC.md), [PROPOSED_TYPES.d.ts](PROPOSED_TYPES.d.ts)가 계획 시점의 구체안을
보존한다. 모든 non-excluded D는 현재 구현과 해당 명세에 매핑한다.

## G1/G3의 구체 계약

개정 2에서 다음과 같이 권장안을 고정했다. 정확한 schema/알고리즘은
[IMPLEMENTATION_SPEC.md](IMPLEMENTATION_SPEC.md), 타입은 [PROPOSED_TYPES.d.ts](PROPOSED_TYPES.d.ts)를 따른다.

- D01: dataset.schema는 version/completeness/origin/fields를 가진다. declared source는 closed fields,
  inferred는 모든 row key union, schema 없는 0행은 unknown이다.
- D02: editable writer는 schemaVersion2, reader는1/2다. graphic-only 형식은 기존 schemaVersion1 유지다.
- D03: scale.emptyDomain에 opt-in policy를 두고, 같은 의미의 이전 domain만 보존한다.
  resolvedScales에 signature만 추가하며 domain 값은 중복 저장하지 않는다. 새 domain을 결정할 수 없으면 명확히 거절한다.
- D04: 계산 report는 materializationConfigs.calculations의 typed owner에 저장하며 summary measure별
  eligibility를 구별한다. null 두 행의 count는2이며 empty identity가 이를0으로 바꾸지 않는다.
- D05: range edit는 같은 field/mode일 때 부분 merge, field/mode 변경 시 새 complete mode를 요구한다.
  edit-only false 경계는 삭제이고 create에서는 거절한다.
- D06: interval:false와 band:false를 분리한다. predict:false는 edit-only observed grid 복귀다.
- D07: source point layer의 derivedBindings.regression에 follow 의미를 저장한다. fixed는 entry 부재다.
  기존 materialization recipe는 실행/appearance owner로 유지하며 follow mode를 이중 저장하지 않는다.
- D09: sort의 stable key 비교, null 배치, temporalUnit year/timestamp만의 명시 normalization을 사용한다.
- D10–D12: inspection entry는4개 read-only function이며 report version1, typed target, unknown/coverage를 제공한다.

이 선택은 승인 뒤 구현됐으며 runtime/types/current contract와 자동 생성 문서로 검증했다.

## Gate 상태와 패키지

| Gate | 현재 상태 | 구현 전 검토할 범위 | 승인 근거 |
| --- | --- | --- | --- |
| G0 | approved | 11개 기능(F06 제외) 순서, E01/E02 경계, 이 계획의 API | 상세 계획 이후 사용자의 전체 구현 승인 |
| G1 | approved | schema/empty/nullable 정책, persistence migration fixture, public calls | 전체 구현 승인 및 unit/persistence 검증 |
| G2 | approved | per-family default 영향표, missing/empty/filter 타입, raw numeric oracle | 전체 구현 승인 및 정책 fixture 검증 |
| G3 | approved | interval/grid/follow 계약, 관계 state, source 변경 전후 curve | 전체 구현 승인 및 regression lifecycle 검증 |
| G4 | approved | sort source/output/schema/lineage, create/edit/remove 호출 | 전체 구현 승인 및 generated lifecycle 검증 |
| G5 | approved | read-only entry export/types, 반환 schema, descriptor coverage, unknown 사례 | 전체 구현 승인 및 browser/package 검증 |
| G6 | approved | workload와 기존 자원 cap 안의 성능 경계 | 전체 구현 승인 및 runtime benchmark 실행 |
| G7 | approved | 최종 호환성·범위·통합 검증 | 전체 구현 승인; 외부 publish/deploy는 실행하지 않음 |

사용자의 후속 전체 구현 승인을 G0–G7에 연결했으며 각 Phase에서 반복 승인을 요구하지 않았다.
G7의 완료는 구현 통합 검증까지이며 외부 배포는 별도 운영 작업으로 취급한다.

필요한 review package는 final source/call 또는 승인 전 primitive prototype, before/after state,
focused numerical/structural 검증, 기존 behavior 영향, declarations/문서 변경안으로 구성한다.
외관이 바뀌는 경우 렌더 이미지와 정확한 public 호출 및 primitive 대응을 추가한다.
원칙은 [impl/AGENTS.md](../AGENTS.md)가 소유하며 이 문서는 추가 승인 요구를 만들지 않는다.

## 최종 호환성 분류

1. **잘못된 입력의 교정:** 없는 field의 묵시적 빈 결과 → 명확한 오류. valid input 결과는 유지.
2. **명시적인 기능 확장:** interval false, predict, follow, sort, inspection entry.
3. **옵트인 정책:** missing/empty/range boundary. omission의 동작은 기존 fixture로 고정.
4. **저장 형식 확장:** schema 1을 읽고 새 형식을 쓰는 단방향 migration. 과거 runtime이 새
   snapshot을 읽을 수 있다고 보장하지 않는다. payload/data version과 package version을 분리한다.
5. **조건부 미래 범위:** E01/E02는 승인 전 별도 설계이며 core F 완료와 구분한다.

기본값을 변경해야 목표 의미를 제공할 수 있는 추가 사례가 발견되면 영향받는 정확한 호출과
새 기대 결과를 제시한다. 과거 0.0.16 릴리즈 승인으로 다른 결과 의미를 자동 승인 처리하지 않는다.
