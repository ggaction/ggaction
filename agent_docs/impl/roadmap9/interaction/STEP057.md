# STEP057 — 영속 선택 상태 연결

## 진행 상태

- [x] 원 카드·interaction/core 계약과 기존 selection 리소스 owner 확인
- [x] 전체 잔여 구현 사용자 승인 [AUTHORIZATION](../AUTHORIZATION.json) 재사용
- [x] A: logical item keys, 다섯 집합 update mode, empty 정책, scoped identity 구현
- [x] A: 조건부 인코딩·라벨·필터·복합 하이라이트·resize·revision·codec 회귀
- [ ] A: 패키지·타입·Current·generated docs 및 독립 realistic qualification 완료
- [ ] B: typed range의 독립 endpoint inclusive flags와 AST predicate/parameter closure
- [ ] C: linked targets의 union/intersection/global와 명시 owner/child projection
- [ ] D: nearest screen/data metric, delete/hidden reconciliation·event, session commands/bindings
- [ ] STEP057 AT37 및 후행 058–060/065–068 통합 완료

STEP050–056은 다른 원안 카드이며 이 기록의 완료 범위가 아니다. STEP077 전체 목표는 계속 진행 중이다.

## A 최소 공개 통합 설계

새 createSelection API 또는 resource 종류 없이 기존 `selectMarks`와 `editMarkSelection`을 확장한다.
`MarkSelector`는 `{items: logicalKey[], empty?: "none"|"all", grain?}`를 추가한다. Existing predicates와
row keys는 기존 live 동작을 보존한다. `editMarkSelection.mode`의 replace는 complete replacement,
add/toggle/subtract/intersect는 명시한 시점의 effective set 조합 뒤 logical key 집합을 저장한다.

`empty`는 명시 빈 items에만 적용한다. Zero-match predicate나 숨긴 nonempty keys를 all로 바꾸지 않는다.
숨긴 key 보존이 기본이며 drop/event는 D의 명시 후속이다. 연산 중 기존 set의 순서를 유지하고 새 key를
incoming 순서대로 뒤에 붙인다. 각 입력의 중복은 첫 출현으로 정규화하며 count+UTF-16 length 총 작업은
기존 10,000,000 한도다. Logical keys의 실제 문법은 공개하지 않는다.

Stored resource는 algorithmVersion1의 추가 closed mode `item-keys`만 사용한다. Exact key list와 empty
정책은 resource.options에 저장하고 target/grain/ref는 기존 materializationConfigs owner를 유지한다.
Selectors는 resource lookup만 담당하고 grammar import를 추가하지 않는다.

현재 검사에서 public inspection key와 hit itemKey가 같음을 확인했다. Nested composition key는 부모
namespace를 포함하므로 action dispatch가 명시 childPath와 일치하는 prefix만 제거한다. Local key 저장과
snapshot namespace 재적용은 기존 identity 정책이다. Root/child facade 조합은 row projection owner를 재사용한다.

## 현재 검증과 남은 의무

- 최초 focused16/16, 기존 selection/conditional/revision/legacy codec 포함139/139 통과.
- 타입·source boundary12/12 통과. Source hash가 고정된 최종 qualification은 별도 evidence에 기록한다.
- realistic 최초 실행은 캐시 환경변수 미지정으로 실패했고 `.artifacts/selection-items-realistic.log`를 보존했다.
  정본 cache를 read-only로 지정한 canonical runner 재실행으로 결과를 판정한다.
- A는 selection 저장/연산 개념만 완료하며 session selection command, parameter binding,
  linked resolve, orphan/drop events, transaction/history를 구현했다고 주장하지 않는다.
