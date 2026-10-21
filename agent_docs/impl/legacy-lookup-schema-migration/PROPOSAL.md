# 이전 editable 형식의 lookup schema 복원 순서

공개 이슈 [#257](https://github.com/ggaction/ggaction/issues/257).

## 진행 상태

- [x] 기존 전체 coverage에서 persistence 함수95%를 확인하고 누락 callback을 식별했다.
- [x] raw 두 표와 정확한 lookup 결과를 가진 schemaVersion1 payload의 복원 실패를 재현했다.
- [x] 현재 문서가 약속한 missing schema 추론/복원 계약과 구현 순서 차이를 확인했다.
- [x] 사용자의 모든 기존/향후 in-scope 질문 승인을 아래 정확한 수정에 재사용한다.
- [x] 구체적 재현·설계 `3170a347`을 commit/push했다. 이후 수정한다.
- [x] 집중 저장17개/lookup·axis32개 회귀와 persistence 함수100%·줄100%를 통과했다.
- [ ] 전체 coverage 및 통합 후보 검증의 기존 floors를 그대로 통과한다.

## 승인과 수정 범위

사용자는 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”라고
직접 지시했다. 기존 저장 형식 호환 동작을 복구하는 아래 구현·검증에 이를 재사용한다.
새 public API, 저장 형식, 데이터 변경이나 렌더링 변경은 없다. 시각 목표 변경 Gate는 적용하지 않는다.
번역 환경과 공개 버전은 유지하고 검증된 #255/#256 후보와 함께 사용 전 전체 현재1307개를 순차
재검증한다. 공개 배포는 완료1413개 시점이다. School 호출은 없다.

## 재현과 기대 결과

reference는 `{id:1,value:"013"}`, `{id:"1",value:"020"}` 두 행이다.
source는 key가 순서대로 `"1"`, `1`, `9`인 세 행이다.
lookup은 현재 공개 API로 `joinedValue`를 복사하며 결과는 `"020"`, `"013"`, `null`이다.
현재 editable state에서 schema metadata만 제거해 기존 format1로 표현하면
`Lookup dataset "reference" requires schema.`로 migration 전에 실패한다.
문서 `docs/data-updates.md#snapshot-formats`는 format1의 missing schema 추론/복원을 약속한다.

## 선택한 검증 순서

기존 `restoreState`의 `requireSchemas` 문맥을 재사용한다. format1 prepass에서만 private
`validateProgramState`에 `allowMissingLookupSchemas:true`를 전달한다. 이때 lookup의 세 schema
중 하나라도 없다면 **schema equality만** 마지막 pass로 미룬다. 이미 셋 다 있으면 기존처럼 검증한다.

Envelope/trace/stack/ID/참조/순환/원본 값 shape/중복 lookup key/typed key matching과 실제 lookup
결과의 정확한 값·순서 검증은 prepass에서도 유지한다. 그 뒤 현재 `migrateStateSchemas`가 양쪽
입력의 schema를 추론/검증하고 derived schema를 계산한다. 마지막 pass는 항상 기존 strict 검증과
required schema 검사를 모두 수행한다. 제공된 schema를 고치거나 잘못된 참조/행을 복구하지 않는다.
현대 format2/3와 정상 직렬화의 기본 경계는 계속 strict다. nested child도 같은 문맥을 재사용한다.

기존 persistence module/state/codec/renderer 소유권과 이미 존재하는 prevalidate→migrate→strict
validate 흐름을 유지한다. 새 macro architecture나 codec format을 도입하지 않는다.

## 검증

원본 표의 key/type/order, 숫자와 문자열 key 구별, leading-zero 문자열, missing match null,
양쪽 schema와 lookup lineage, 편집 가능한 v3 재저장, 원본 program 불변성을 확인한다.
변조된 derived rows, unknown/cyclic reference, 중복 key, 잘못되거나 호환 안 되는 제공 schema는
계속 거부해야 한다. 기존 일반/저장/lookup/nearest-axis 검사와 전체 coverage를 재실행하고
persistence 함수100%와 모든 기존 floors를 유지한다. 실패 로그는 남기며 한도를 완화하지 않는다.
