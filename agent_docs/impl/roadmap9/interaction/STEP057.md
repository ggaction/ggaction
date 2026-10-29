# STEP057 — 영속 선택 상태 연결

## 진행 상태

- [x] 원 카드·interaction/core 계약과 기존 selection 리소스 owner 확인
- [x] 전체 잔여 구현 사용자 승인 [AUTHORIZATION](../AUTHORIZATION.json) 재사용
- [x] A: logical item keys, 다섯 집합 update mode, empty 정책, scoped identity 구현
- [x] A: 조건부 인코딩·라벨·필터·복합 하이라이트·resize·revision·codec 회귀
- [x] A: 패키지·타입·Current·generated docs 및 독립 realistic qualification 완료
- [x] B1: typed range의 독립 endpoint inclusive flags 및 단일 경계 구현
- [x] B1: focused/realistic/타입·패키지·Current·문서 qualification
- [x] B2: 이름 있는 AST predicate/parameter closure 및 qualification
- [ ] C: linked targets의 union/intersection/global와 명시 owner/child projection
- [x] D1: select/setParameter/clearSelection session command 원자 commit 및 qualification
- [ ] D: nearest screen/data metric, delete/hidden reconciliation·event, 자동 bindings
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

## B1 개별 범위 endpoint

Source `3df72643e`는 기존 data FilterRange를 MarkSelector에도 적용한다. 하나 이상 endpoint를 요구하며
minInclusive/maxInclusive 또는 기존 inclusive shorthand를 받는다. 새 계산 owner는 data filter의 기존 정책을
추출해 재사용한다. 기존 양끝 inclusive selector의 normalized 저장 형태를 보존하여 legacy codec 의미를 바꾸지 않는다.
Immutable final-item selection과 기존 resource revision·label·conditional·filter·child scope 경로를 유지한다.

[B1 qualification](range-evidence/qualification.json): final focused21, legacy/graph/selection 회귀138,
계약46 및 경계27, package7, 실제 데이터5종×3 recipe에서 네 endpoint 형태와 ledger16 통과.
Ordered range owner는100/100/100, 기존 selector는95.16/95/100이며 floor는95/90/100와90/90/100을 유지했다.
동일 archive `2cc2a80752c3306eee8719403029f686fb7365958849fea4fa93e4b257e39036`의
Node20/22/24에서 실행2·strict 타입·4 browser entry가 모두 통과했다. Package909entries/최대1,309,847packed/
6,003,484unpacked로909/1,310,000/6,004,000을 적용하며 browser/search 한도는 올리지 않았다.
문서180, build164페이지/1,410 selective artifacts, 수정 페이지4폭 containment·Axe0 및390px 시각 확인을 마쳤다.
전체 runtime/renderer/installed sweep 완료로 확대하지 않는다. B2 및 C/D는 계속 구현 대상이다.


## B2 이름 있는 AST 선택

기존 포괄 승인 AUTHORIZATION을 재사용한다. 구체 public shape는 `selectMarks`/`editMarkSelection`의
`where: ComputedExpressionV2`와 persistent selection을 생성하는 `highlightMarks.select`다.
`MarkSelectionSelector`를 별도 union으로 두어 inline label/markFilter/graph view의 기존 MarkSelector에
추적되지 않은 parameter 의존성을 열지 않는다. 해당 인라인 확장은 원 카드의 이름 있는 predicate state 요구에
포함하지 않으며, 라벨은 기존 `selection: id`를 통해 같은 AST 선택을 사용한다.

Pure grammar는 최종 item.fields만 평가하고 모든 AST branch의 parameter refs를 첫 출현 순서로 저장한다.
기존 persistent-selection resource revision 전파를 재사용하고 parameter action이 조건부·data·mark·label·highlight
후속을 명시적으로 호출한다. Full resolver는 class별 once-only private registration으로 연결하여 Basic import를
보존한다. 소비자가 없는 nullable predicate도 editParameter에서 원자 평가 오류로 거부한다.

첫 focused 검사 오류 세 개는 테스트 fixture의 존재하지 않는 bar facade명, codec payload 경로,
diagnostic WeakMap accessor 오용이었다. 그 다음 bar fixture가 기존 point linear scale을 상속하는 오류는
독립 bar program으로 바꿔 집계 grain 반례를 명시했다. 이 최초 로그와 최종 검증을 별도 evidence로 보존한다.
현재 새 owner 두 개는100/100/100이다. 최종 installed/docs/source qualification은 진행 중이다.
C/D, linked target resolve·nearest·orphan/drop·session command 및 STEP077은 완료하지 않았다.

마감 중 실제 파생 데이터 edit 반례를 추가 발견했다. 시각 소비자가 없는 AST 선택이 읽는 computed field를
number→string으로 바꾸면 edit 자체는 성공하고 이후 선택 조회만 실패했다. 기존 reviseData는 final selection을
검증하므로 정상 거부했다. Shared derived revision 종료에도 같은 private final-item resolver로 영향받는 AST
선택을 검사하도록 연결해 원자 실패와 유효한 변경 후 membership을 검증했다. 최초 source 후보 be214bab1와
그 tar는 최종 qualification과 구분한다.


### B2 검증 checkpoint

최종 source `6a581f204`의 [qualification](expression-evidence/qualification.json)과
[독립 expected/actual/diff](expression-evidence/expected-actual-diff.json)를 저장했다.
새 owner 두 개100/100/100, 기존 selection action96.44/87.90/100을 유지한다. 기존 선택/parameter104,
조건부127, 최종 derived-revision hook 후58 검사와 실제 데이터5종×3 grain/ledger16이 통과했다.
문서181, Jekyll164페이지/1411 selective artifacts, 모바일 포함4폭 Axe0·overflow0와390px 시각 확인을 마쳤다.

동일 최종 archive `a7f0c0a5f571f8620bca7743dc6e3df4249df92416a298d3e1cea96734082a25`의
Node20/22/24에서 각각2개 실행·strict 타입·4 entry bundle이 통과했다. 전수 설치 sweep은 반복하지 않았다.
실측 최대 package911entries/1,312,374packed/6,013,768unpacked에911/1,313,000/6,014,000 한도,
Full651,656/Basic366,102에652,000/367,000 bundle 한도를 적용했다. 최초 실패와 후보 tar는 최종 증거와 분리했다.
최종 수정과 무관한 기존 source/renderer/UI 증거만 명시적으로 재사용했으며 전체 suite green으로 보고하지 않는다.
C/D와 모든 후행 인수 조건은 계속 남아 있다.


## D1 원자 session command 선행 연결

C linked target이 같은 commit 경계를 사용해야 하므로 원안 승인 AUTHORIZATION 범위에서 D의 최소 공통
경로를 먼저 구현한다. 공개 select(target,payload{id,select,mode}), setParameter(target,payload{value}),
clearSelection(target,payload{id})를 기존 domain action에 위임한다. 기존 선택 resource 및 codec를 재사용하고
선택 clear는 제거가 아니라 empty:none 집합으로 대체해 dependent label/highlight/conditional을 유지한다.

하나의 immutable candidate와 hit frame을 모두 준비한 뒤 program/frame/revision을 교체한다.
성공은 commit→settled, action 실패는 error만이며 이전 program/scene/revision을 보존한다.
세션은 그림을 그리지 않고 host가 commit의 current를 renderer에 제공한다. 동기 settled는 host asset 준비를
완료했다고 주장하지 않는다. 최초 검사는 fixture의 잘못된 hconcat 호출과 Basic editor 지원 추정을 찾았다.
기존 hconcat public shape로 바로잡고 Basic은 createParameter만 가능하므로 세 편집명령을 모두 명시 거부한다.

Focused20, 기존+신규 interaction owner4개100 lines/최저94.59 branches/100 functions 통과했다.
추가 타입/discovery/browser/installed/docs qualification은 진행 중이다. C linked resolve와 D의 nearest,
orphan/drop, 자동 selection binding·gesture·history는 이 선행 checkpoint에 포함하지 않으며 계속 남아 있다.


D1 qualification 중 최초 metadata 검사는 신규 test capability 등록 누락과 stale provenance만 실패했다.
각 소유 manifest/generator를 갱신했다. Package는 신규 input/selection owner2개 때문에913>911 entry로
실패했다. 최초 실측 Node20 1,314,968packed/6,024,076unpacked에913/1,315,000/6,025,000 한도를 적용한다.
Interaction bundle은 같은 archive에서 Node22 88,360, Node20 88,433으로83,000을 넘어89,000으로만 높인다.
Full/Basic/SVG 한도와 모든 기존 critical coverage floor는 유지한다. 최종 고정 archive는 아래 evidence에서 구분한다.


### D1 검증 checkpoint

Source `4959ad7ce`의 [qualification](command-evidence/qualification.json)과 독립
[expected/actual/diff](command-evidence/expected-actual-diff.json)를 보존했다. 최종21 focused에서
4 owner 모두100 lines/100 functions, selection98.65·session96.90 branch이며 floor95/90/100을 유지한다.
타입·source boundary·discovery28, package13, 실제 데이터5종×3 recipe/ledger16, 실제 browser4가 통과했다.
문서182, build164페이지/1411 selective artifacts, 수정 페이지4폭 Axe0·overflow0와390px 시각 확인을 완료했다.

동일 최종 archive `48d4ef6a53782157cbdff09a6cef1960d64e510650535269a70e0922458b41ef`의
Node20/22/24 각각3 runtime·strict public types·4 entry browser bundle을 검증했다. Package최대
913entries/1,314,971packed/6,024,096unpacked, interaction88,433gzip이며 위의 최소 한도를 충족한다.
전체 sweep이나 C/D 잔여 기능 완료로 확대 보고하지 않는다. 최초 실패와 final metadata 재패킹은 구분했다.


## C 연결 선택의 구체 최소 설계

기존 포괄 승인과 parent의 방향 확인을 재사용한다. 기존 `bindings` 배열에
`{type:"linkSelection",id,sources:[{target,selection,projection}],target,selection,resolve}`를 추가한다.
Endpoint는 기존 이름 있는 selection과 일치하는 명시 mark/child target이다. `resolve`는
union/intersection 또는 정확히 한 source를 갖는 global(owner scope)이다. Target selection은
binding이 소유하므로 같은 session의 직접 select/clear로 덮어쓰지 않는다.

각 source의 projection은 `{type:"rows",sourceData,targetData}` 또는
`{type:"fields",sourceFields,targetFields}`다. Rows는 명시한 두 원본 dataset의 logicalId가 같고
실제 final-item lineage가 그 원본에 닿아야 한다. 이름·행 index·item key의 우연한 일치로 연결하지 않는다.
Fields는 길이가 같은 1~64개 명시 필드의 typed tuple이며 모든 final item에서 고유하게 정의되어야 한다.
null/undefined/nonfinite 또는 모호한 aggregate field는 거부하고 string/number/boolean/bigint/date의
기존 row-key 인코더를 재사용한다. 서로 다른 item이 같은 tuple을 가지는 many-to-many 연결은 허용한다.

Session은 초기화/updateProgram에서 DAG·모든 endpoint·source별 projection set을 검증하며 authoring하지 않는다.
성공한 편집의 후보 상태에서 영향받은 DAG를 순서대로 실행하고 target owner마다 한 번 기존 editMarkSelection을
호출한다. 기존 source별 투영 집합과 최종 logical target key 집합을 runtime state에 명시 보관한다.
원본 command와 모든 linked changes 및 hit frame은 하나의 atomic commit이며 실패 시 모두 이전 참조로 남는다.
Bindings와 투영 cache는 codec에 저장하지 않으며, 복원된 selection resource에 host가 같은 bindings를 다시 설치한다.

순환·같은 target owner의 중복 writer·unknown/ambiguous dataset·missing selection/field·지원하지 않는 Basic은
사전 거부한다. B2의 class-scoped frozen resolver 등록을 재사용하여 interaction에서 Full mark policy를
static import하지 않는다. 256 binding/source 및 누적 10M work 한도로 configuration/계산을 제한한다.
자동 click/gesture/nearest/orphan/drop는 후속 D에 그대로 남긴다.


C 구현 중 명시 DAG 밖의 실제 feedback 반례를 확인했다. A의 opacity property 선택이 B selection에
연결되고, A의 conditional opacity가 B를 읽으면 A→B binding은 DAG이지만 후보 materialization 후
A 선택이 바뀐다. 같은 누적 work budget으로 최종 projection을 다시 검사하고 달라지면 전체 candidate를
거부한다. 고정점 반복·숨은 transaction 없이 old program/scene/cache identity를 보존하는 public 회귀를 추가했다.
FacetSource는 기존 source-only grain resolver를 사용하므로 concrete-property endpoint만 명시 거부한다.


C 소스 후보는 최종 focused/기존 선택 회귀121개를 통과했다. Pure projection100/97.50/100,
link owner100/95.83/100, session100/97.01/100, expression resolver100/96.67/100,
selection state100/100/100이며 기존보다 낮은 floor를 만들지 않았다. Source boundary/types/discovery28,
package13, 실제 데이터5종×3 recipe/ledger16, browser5를 통과했다. 마지막 nested namespace work-accounting의
보수적 상계 조정 후 owning121을 재검증했다. 최종 동일 tar 설치와 문서 qualification은 아직 진행 중이다.
최초 callback 인자 오류와 nested fixture cardinality 오류, entry/bundle cap·snippet 등록/provenance 실패를 보존한다.
