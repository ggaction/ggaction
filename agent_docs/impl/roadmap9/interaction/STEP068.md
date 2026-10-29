# STEP068 접근성 항목과 키보드 수명

## 진행 상태

- [x] A: `format: "items"`의 구체 계약·기존 승인 재사용
- [x] A: native final items, scoped identity, authored selection membership, logical visibility 구현
- [x] A: source/type/package/docs qualification과 원격 checkpoint
- [x] B: exact current-frame clip/opacity를 사용하는 keyboard focus/restore
- [x] B: native selection activation·hierarchy navigation
- [ ] C: tooltip/touch/control 접근 경로
- [ ] D: public animation/reduced-motion 합산 및 AT53 전체 matrix
- [ ] STEP074–077 최종 통합

[기존 포괄 승인](../AUTHORIZATION.json)의 remainingApproval과 root의 2026-10-29 구체 지시를 재사용한다.
기반 `e4571d277`의 session 수명 검증을 보존한다. 이번 A는 새 visual target, persisted schema,
renderer 또는 자동 DOM authoring을 추가하지 않는다. 정확한 공개 계약은
[ACCESSIBILITY](../../../contract/current/ACCESSIBILITY.md), 공개 예는
[Rendering](../../../../docs/api/rendering.md#native-item-alternatives)이 소유한다.

## A: native logical snapshot

기존 `exportAccessibleData`의 table default/결과 shape는 유지한다. `format:'items'`만
flat leaf-owner views와 명시 `childPath`를 반환한다. native selection policy의 final grain을 읽고,
기존 fixed Full resolver로 named membership를 평가한다. sourceSelection이 있는 composite
assignment는 원 authored ID로 표현하며, 단순 owner 관계만으로 미저장 selection을 추정하지 않는다.

opaque item/representation key는 `namespaceItemKey`와 inspection의 ancestor 순서를 그대로 사용한다.
Hierarchy navigation은 원 node key이므로 graphic key로 재해석하지 않고 component/childPath와 함께
반환한다. visible은 native logical 값이며 filtered item은 사라지고 focused hidden node는 false로
남는다. opacity/clip/current frame은 후행 exact frame 후보의 책임으로 분리한다.

전체 export 100,000 items, 10M work units 상한을 둔다. ownership scan·nested path copy·namespace·
selection membership 비용을 누적한다. readonly helper는 action registration/Node/node_modules를
import하지 않는다. renderer·semantic resource 계산을 복제하지 않고 기존 immutable snapshot만 읽는다.

검증은 aggregate literal, 모든 named selection, composite projection, nested repeated scope,
Basic/standalone Text, Partition hidden/focus, Geo typed LOD aliases, graph roles, filtered/opacity 구분,
codec fresh process, callback0 옵션검증, 누적 item/work 제한을 포함한다.
이 목록은 A의 범위이며 keyboard/tooltip/touch/animation 전체가 끝났다는 뜻이 아니다.

## A 검증 메모

- 새 adapter coverage: lines 100%, branches 95.92%, functions 100%; 기존 entry 98.93/94.29/100.
- 정상 접근성 21개, Node20/24 신규+타입 각11개, source/discovery/package/type 41개 통과.
- pinned 실제 데이터 5종×3 recipes+집계 16개, 실제 Chromium의 공개 문서→host table/Canvas/SVG 1개 통과.
- 고정 tar `5787d20f4b885ce0e799742ee804e5d2648cdcbb5868bfa8b0df284b4c164b65`를
  Node20/22/24에서 각3 runtime+strict types+문서 snippet+5 기존 entry bundle로 확인했다.
- 새 entry import graph는 actions/Node/node_modules를 금지한 기존 browser bundle 검사를 통과한다.
- Node20 canonical staging 실측은1062 entries/1507408 packed/6853746 unpacked bytes.
  새 adapter 한 파일과 선언 증가에 맞춰1062/1507500/6854000으로 최소 올림했다.
  1062>1061 최초실패를 보존하며 측정용 inspector 자체를 검증 성공으로 세지 않는다.
- source 없는 동일 archive의 기존5 entry bundle은 이전 한도를 통과했다. 접근성 entry 자체는
  금지 dependency 검사로 확인했으며 별도 임의 size floor를 만들지 않았다.
- 문서 source49개와 등록된 runnable 예제1개 통과. search payload1038771 bytes를 기준으로
  한도1038800으로 올렸다. 초기 snippet 미등록/search 한도/Ruby PATH 오류를 보존했다.
- 최초 테스트 fixture의 잘못된 editScale/encodeX/layoutGraph/반복 filter 호출, 미연결 composite
  selection 추정, concrete 좌표 없는 Text 가정을 native 계약에 맞게 수리했다. runtime 결함으로
  보고하지 않는다. 전체 repository/전체 renderer/전체 installed suite를 새로 실행했다고 주장하지 않는다.

최종 source `147a49b388eb89ee0c6ffbe1290d0b815927046e`; [machine evidence](accessible-items-evidence/qualification.json)에 명령·원본 실패·tar·설치·커버리지·화면 증거를 보존했다. Source pin 후49 docs,172 pages/1535 LLM hashes,320/390/768/1440 overflow0/Axe0을 통과했고320/1440 화면을 확인했다. B 이후와 전체077은 미완료다.

## B: current-frame keyboard focus

A의 논리 item export를 실제 현재 frame의 paint/clip/opacity와 교차한다. `keyboard` binding은
1–256개의 명시 leaf mark target과 선택적인 native selection/partition activation만 받는다.
`focus` command는 scoped opaque key 또는 명시 이동을 사용하고 `activate`는 기존 command
reducer·prepare lease·history를 통과한다. `state.focus`는 runtime snapshot이며 저장 schema를
추가하지 않는다. 세부 signature·closed option·event·host DOM 책임은 Current INTERACTION과
`types/interaction.d.ts`가 소유한다.

포커스는 final item grain과 정확한 hit shape에 공통으로 존재하는 painted point를 사용한다.
기존 path flatten/dash/clip owner를 재사용하며 circle의 좁은 clip 교차만 기존 analytic ellipse
표현에서 계산한다. slop/opacity 대체나 첫 후보 추론은 없다. authored key는 scoped LOD alias를
통해 단일 representation으로만 복원된다. 숨김·제거·clip·투명·다중 해석이면 같은 owner의
container로 돌아가며 재등장 시 임의 item을 자동 선택하지 않는다. work10M/items100k를 유지한다.

native hierarchy navigation은 원 key/path를 전달한다. keyboard와 camera binding이 함께 있으면
keyboard가 키를 소유하고 camera wheel/pointer는 유지한다. Escape는 진행 중 capture를 먼저
취소한다. host는 명시 surface·safe text·roles·active descendant·focus ring을 소유하고 Tab 및
nested control을 가로채지 않는다. Canvas/SVG 공개 예는 같은 native state를 사용한다.

B의 remainingApproval을 재사용한다. 새 visual target/renderer/자동 DOM/공개 animation은 없다.
C의 tooltip/touch/control 전체 경로, public animation/reduced-motion과 AT53 전체 matrix,
STEP074–077 합산은 계속 남아 있다. 이 체크포인트를 전체 카드 완료로 세지 않는다.

### B source qualification

- 최종 변경 owner/기존 interaction hit 집중344/344; 네 owner lines/functions100%.
  keyboardFocus branches93.62%, session95.59%, hitShapes95.02%, hitClipDistance100%.
- Node20/24 신규 geometry/keyboard/type 각18개, 실제5datasets×3recipes+집계16개,
  실제 Chromium Canvas/SVG 각각 Tab/Arrow/Enter/escape/host filter/teardown와 Axe0 확인.
- 최초 package1063>1062 실패 보존 후 Node20 staging1063/1512460/6873313 bytes를 실측,
  한도1063/1512500/6873400으로 최소 조정한다. search1039320 bytes는1039400으로 올린다.
- 최초 docs5실패는 새 search 크기와 아직 갱신하지 않은 provenance/LLM 출력이었다.
  기존 parser/문서 검증을 바꾸지 않고 canonical 순서로 재생성한다.
- 초기 fixture의 존재하지 않는 hierarchy format/id, 숨긴 synthetic root의 이동 기대,
  highlight 후 host option 순서, 검증용 input이 다른 host button을 덮은 배치를 수리했다.
  이 실패들은 runtime 결함으로 주장하지 않는다. 원본 로그는 최종 evidence에 보존한다.

최초 직접 policy import는 interaction 번들을214113 bytes로 늘렸다. 이 실패를 보존하고
Full/Basic exact constructor의 고정 native reader 등록으로 수리했다. 미등록·중복등록·
파생 constructor 권한 상속 금지 회귀와 reader100/100/100을 확인했다. 공개 registry는 없다.
최종 Node20 staging1064/1512831/6874696 bytes를 한도1064/1512900/6874700으로 반영했다.
교정된 archive의 Node20 bundle은 Full732895/Basic385729/SVG20196/interaction126826/graph44045.
Full732900과 interaction126900만 최소 올림하고 나머지 기존 한도는 보존한다.
초기 source 경계 회귀는 과거부터 guide→theme palette→policy로 이어지는 tree-shakable 경로까지
거부했으므로 새 keyboard owner의 transitive imports를 검사하도록 정확히 한정했다. 실제 설치
bundle의 actions/Node 금지와 실측검사는 별도로 유지한다.

고정 tar `7cab0f5b1ee890ee76526f0c5e620a6abd75f149ee8a037d30e76411a9a77fad`는
Node20/22/24 각3runtime+strict types+5bundle 검사를 통과했다. 최종 boundary/package/type/docs91,
reader12회귀, 기존 interaction/hit344, Node20/24 각18, 실제16 및 browser2도 통과했다.
Source pin/build/화면 evidence는 후속 qualification commit으로 연결한다.

B source `d2441294413d13de40fc545f070489645c038276`를 고정했다.
[최종 machine evidence](keyboard-focus-evidence/qualification.json)에 초기 실패, 수정 이유,
고정 tar,3Node consumers,critical coverage와 실제 화면을 보존했다. source pin 후49 docs,
172 built pages/1535 LLM hashes,320/390/768/1440 overflow0/Axe0을 확인했다. 320/1440 화면을
직접 확인했고 두 코드 블록의 공통 host 안내를 명료화했다. C/D와 전체077은 계속 미완료다.

화면 확인에서 정적 HTML 앞의 이전 수동 안내 한 줄이 남아 있어 제거했다. 실행 JavaScript의
공통 안내만 유지하고 owning49/build172/1535 hashes/4폭 Axe0을 재확인했다. Runtime/type와
고정 tar는 변하지 않았다.
