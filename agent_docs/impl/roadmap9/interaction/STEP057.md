# STEP057 — 영속 선택 상태 연결

## 진행 상태

- [x] 원 카드·interaction/core 계약과 기존 selection 리소스 owner 확인
- [x] 전체 잔여 구현 사용자 승인 [AUTHORIZATION](../AUTHORIZATION.json) 재사용
- [x] A: logical item keys, 다섯 집합 update mode, empty 정책, scoped identity 구현
- [x] A: 조건부 인코딩·라벨·필터·복합 하이라이트·resize·revision·codec 회귀
- [x] A: 패키지·타입·Current·generated docs 및 독립 realistic qualification 완료
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

## A 검증 checkpoint

Source `e40f9fba0`를 고정한 [qualification](selection-evidence/qualification.json)과 압축 원본 로그를 보존했다.
신규 19, 기존 회귀 139, 계약 53, 실제 데이터 5종×3 recipe 및 ledger 16, 기존 selection 액션 owning coverage 151 검사가 통과했다.
새 집합 owner는 100/100/100, 선택 액션은 96.38/88/100으로 해당 floor를 유지했다.

동일 SHA256 `c1a37425c4bbdd5143f0564d4fb42bfa18304d4ecfa7c95cab5c0dcb60d219e4` tar의 Node20/22/24 각각 새 실행2·strict 타입·4 entry browser bundle을 확인했다.
전체 설치 sweep은 이 checkpoint에서 반복하지 않았다. 최초 Node20/24 Full/Basic bundle cap 실패를 원본 로그에 보존하고,
실제 최대635,846/360,009를 근거로636,000/361,000으로만 높였다. Package 최대880 entries·1,282,975 packed·5,887,693 unpacked에
880/1,283,000/5,888,000 한도를 적용했다. Search 실제946,372에947,000 한도다. 변경은 신규1파일과 확장된 선택 타입/문서/공유 selector 경로다.

문서179/179, Jekyll162페이지·1,392 selective artifacts, 해당 수정 페이지320/390/768/1440의 containment 및 Axe0 통과.
모바일390px 결과를 시각 확인했다. 전체 UI/CSS가 그대로인 페이지의 이전 전수 browser 증거는 `121acb6c6`에서 재사용한다.
초기 캐시·snippet·metadata 동시변경·임시 browser probe 오류와 수정 결과를 분리했으며 전체 suite green으로 확대 보고하지 않는다.
B/C/D 및 다른 STEP 인수 조건은 계속 남아 있다.

### 최신 통합본 반영

`c078f06db`와의 source 병합은 `46272ba30`이다. Graph recompute의 필터 옵션과 공통 selector 목록을 함께 유지했고,
기존 state에서 분리된 `resolveItemSelection` owner로 logical item 분기만 옮겼다.
59 focused와 graph/recompute 동작 검사가 통과했다. 두 브랜치가 각각 추가한 realistic 파일 수를 41로 합치고
discovery owning 검사를 다시 통과시켰다. 합산 docs는 source commit 고정 후 180/180 통과했다.
[병합 qualification](selection-evidence/merged/qualification.json)은 Node20 최소 설치·타입·4 bundles 실측,
초기 한도 실패와 최소 조정, 이전 두 checkpoint에서 재사용한 검증 범위를 구분한다.
