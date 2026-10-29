# 단일 Y 정책

## 진행 상태

- [x] 기존 승인 [AUTHORIZATION](../AUTHORIZATION.json)의 STEP-050 범위를 재사용
- [x] 독립 순수 검증과 기존 상태의 frame 수집기 구현
- [x] literal 경계·facet/concat·원본 불변 시험12개와 두 owner coverage 검증
- [ ] create/edit/schema/composition/load의 다섯 공개 진입 경계 연결
- [ ] 기존 conditional Y·named Y·조합 consumer와 공개 문서 동기화
- [ ] STEP-035 responsive/composition 이후 최종 통합

`grammar/framePolicy.js`가 scope-qualified coordinate와 scale identity, 실제 plot region,
y/y2 bindings와 guide visibility를 받아 하나의 Y scale·최대 하나의 보이는 Y guide를 검사한다.
별도 coordinate에 독립 scale을 넣고 같은 영역에 겹치는 우회도 거부한다.
숨긴 guide도 scale identity 검사에서 빠지지 않으며 y2의 같은 scale endpoint는 허용한다.

`materialization/frameState.js`는 기존 semantic layer·guide, coordinate bounds, namespaced child
Canvas를 읽어 이 순수 검증으로 전달한다. Facet 부모의 보관 template은 실제 child frame과
중복 집계하지 않는다. Semantic-only 호출에서는 child-local 범위끼리 섞지 않고, concrete
호출에서는 실제 parent offset을 합산해 nested concat의 겹침을 검사한다. Canvas가 아직 없는
unit은 scale identity부터 검증한다. Polar/Parallel/Geo와 Y binding 없는 annotation은 제외한다.
새 persisted state·public action·자동 materialization은 없다. guide visibility의 단일 판정 함수를
기존 paint owner와 공유하며 기존 visibility 동작은 유지한다.

현재 체크포인트는 내부 foundation이다. 다섯 공개 진입점은 아직 연결하지 않았으므로
현재 사용자 API의 새 제약으로 문서화하거나 STEP-050 완료로 주장하지 않는다.
후속 공개 preflight는 최종 후보를 검사하고, action 결과와 editable import도 같은 owner로
검증한다. 중간 primitive 작성 순서가 합법적인 최종 재바인딩을 막지 않도록 경계를 둔다.

검증: `node --test --experimental-test-coverage --test-coverage-include=src/grammar/framePolicy.js --test-coverage-include=src/materialization/frameState.js test/unit/grammar/frame-policy.test.js test/unit/frame-state.test.js`.
순수 owner100/100/100, 상태 adapter100/97.33/100(lines/branches/functions).
공통 architecture/visibility/package55개 통과, capability 정렬 수정 후 discovery16개 통과.
문서 provenance18개 통과. [증거](single-y-foundation-evidence/summary.json)에 최초 실패와 수정 결과를 함께 보존한다.


## 공개 연결 작업 중

기존 remainingApproval 범위에서 다섯 경계의 admission을 연결했다. top-level action의
최종 immutable candidate에 read-only class 등록 validator를 적용하며 결과 교체·trace 추가·
materialization은 수행하지 않는다. `editSemantic`은 최상위 후보를 먼저 검사하고,
composition child snapshot과 editable import도 같은 owner를 호출한다. 아직 source 전체와
설치·문서 검증 중이므로 이 작업을 완료 checkpoint로 기록하지 않는다.

주석은 기존 facet family의 literal text 분류를 공통 helper로 재사용한다. 분리 overlay의
normalized plot geometry를 데이터 Y와 구분할 명시 intent가 기존 state에 없었으므로,
`derivedBindings.plotSnapshot`에 x/y의 snapshot field를 기록한다. geometry는 기존과 같으며
ordinary position encoder는 바뀐 channel의 intent를 wrapped semantic action으로 제거한다.
실제 field·quantitative·linear `[0,1]`·zero/nice false를 검증하고 잘못된 snapshot이나 import는
거부한다. 새 API action은 없으며 허용된 persisted-schema 결정으로 기록한다.

독립 Y척도를 허용하던 이전 테스트와 공개 예시는 STEP050의 명시 정책으로 대체한다.
Generic named owner/legend/field ambiguity 검사는 shared Y 또는 독립 X로 유지하며,
left/right facet edge 검사는 각각 하나의 Y를 가진 두 variant로 모든 edge를 검증한다.
초기 compatibility1614/1641과 수정1640/1641을 보존하고 마지막 named-owner fixture를 수정했다.

Rug의 edge와 단일 measure Strip의 center는 독립 데이터 Y가 아닌 고정 plot 위치다.
`derivedBindings.plotAnchor`의 x/y finite `[0,1]` constants로 이를 기록하며 `plotSnapshot`과
같은 `grammar/plotPosition.js`에서 닫힌 구조를 정규화한다. 실제 datum·fixed linear `[0,1]`·
zero/nice false·reverse false를 대조하고 같은 축의 snapshot 중복, active overlay와 conditional을
거부한다. 일반 position/conditional 재인코딩은 해당 축 intent를 제거한다. 기존 plot 위치는 유지된다.
초기 chart 조합943개 중48개 실패, anchor 및 독립 panel/explicit primitive 작성 순서 수정 후
936개 통과와7개 fixture 실패를 기록했다. 마지막7개 수정의 focused22개는 통과했으며 전체 재검증은 진행 중이다.

## 공개 진입 사전검사 source 동결

프레임 정책을 façade·named/complete/focused guide·bulk encoding·coordinate attachment/aspect의
순수 최종 후보에 연결했다. 후보 계산은 기존 native definition/position owner를 공유하며 hidden
action이나 별도 dry-run class를 추가하지 않는다. top-level action의 최종 결과 guard는 유지한다.
합법적인 nested 임시 상태와 plotAnchor/plotSnapshot·overlay·source-owned text를 보존한다.

마지막 소유 검증은 집중799, 추가 chart64, coordinate44, critical485, boundary/discovery27이다.
새 세 owner의 critical floor는 charts/frame100/94.12/100, axes/frame100/100/100,
conditionalRequest100/98.18/100으로 통과했다. 기존799 선택 전 owning2195 중 Violin title1개
실패는 native explicitGuides 판정 공유로 수리했으며 원 기록을 보존한다.
[동결 증거](single-y-preflight-evidence/summary.json)는 source49개와 나머지 Current·test hash를 소유한다.

미해결 한 건은 최신 main 통합에서 root가 닫는다. 독립 aspect frames 두 개의 Canvas width를100으로
줄이면 최종 guard는 겹침을 거부하지만 그 전에 editGraphics11개가 관찰된다. 이전 program은
불변이지만 first-child rejection은 아직 충족하지 않는다. width600 분리 유지와 normalized plot
annotation의 resize는 통과한다. latest responsive/Routes/nested prospective bounds와 동일한
후보에서 검사하도록 연결한 뒤 패키지·문서·전체 source 및 실제 corpus 검증을 실행한다.

기존 corpus owning 실행은58분49초 시점에 의도적으로 중단했고 exit143·1 complete/3 pending의
중단 영수증을 보존했다. 이를 성공이나 최종 common27 실행으로 세지 않는다.


## main 합산 회귀 수리 checkpoint

Canvas의 prospective responsive bounds를 최초 그래픽 child 전에 검사하는 경계는
`4191986ce`에서 수리했다. 독립 scale 재배치·normalized annotation·중첩 responsive/Routes
집중120개가 통과했다. 이후 전체 unit 6584 중7, contracts754 중16, chart955 중1의 실패를
보존하고 소유 경계에서 수리했다. 이를 최종 전체 green으로 바꿔 기록하지 않는다.

Bulk transpose는 이전 layer의 scale identity를 후보 계산에 전달한다. Source 통계 reference는
실제 native encoding과 같은 순수 projection을 사용한다. Layered ECDF는 exact constructor
argument에 한해 최종 공유 scale ID를 private WeakMap scope로 전달하고 finally에서 제거한다.
이 정보는 공개 옵션·context·저장 state에 들어가지 않으며 edit/revise/codec도 같은 identity를 유지한다.
Precomputed interval은 descriptor에서 center field를 먼저 투영해 native 작성 전에 Y를 공유한다.
Rug의 plotAnchor 작성은 기존 encoding owner로 이동해 façade의 primitive 직접 호출을 제거했다.

집중77·소유91·native/primitive21·중첩 scale4·마지막 metadata10개를 통과했다. 새 private
position scope는 lines/branches/functions100/100/100이다. 이전 실패 로그와 수정 후 소유 검증을
[수리 증거](single-y-repair-evidence/summary.json)에 별도로 보존한다. 최신 Geo·interaction·native
chart 합산 후 전체 source/corpus·문서·동일 패키지3Node 검증은 여전히 후행 의무다.
