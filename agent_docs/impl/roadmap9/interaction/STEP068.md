# STEP068 접근성 항목과 키보드 수명

## 진행 상태

- [x] A: `format: "items"`의 구체 계약·기존 승인 재사용
- [x] A: native final items, scoped identity, authored selection membership, logical visibility 구현
- [x] A: source/type/package/docs qualification과 원격 checkpoint
- [x] B: exact current-frame clip/opacity를 사용하는 keyboard focus/restore
- [x] B: native selection activation·hierarchy navigation
- [x] C1: hover/focus/Escape tooltip와 touch native activation
- [x] C2: 현재 native edit/history control의 keyboard/touch matrix
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

## C1: hover/focus tooltip와 touch native activation

기존 승인과 B의 공개 commands를 재사용한다. 새로운 tooltip runtime/binding/DOM library 없이
완전한 host 예제를 추가한다. safe text와 native item snapshot, 정확한 inspect/focus key만 읽고
click/tap→focus→activate를 기존 reducer로 전달한다. hoverable tooltip의 Escape는 host capture
listener가 우선 처리하며 이전 selection/program/history를 바꾸지 않는다. 외부 layout에 영향을
주지 않도록 설명 영역을 고정하고 DOM/window listener를 명시적으로 제거한다.

실제 Canvas/SVG 각각 keyboard 및 touch4개 검증에서 태그 모양의 원 데이터가 textContent로
표시되고 실행되지 않음을 확인한다. pointer→tooltip 이동, Escape, native toggle, filter로 focus
container 복구, disabled 중복 filter control, dispose 후 event0을 검사한다. 최초4실패는 tooltip
닫기와 함께 버튼 위치가 이동하는 host 배치 결함으로 재현했으며 설명 영역 고정 후4/4 통과다.
Library source/types/package는 B와 동일하다. Graph의 inferred origin/rule/ruleId/metric 및 실제
endpoint/degree를 literal로 추가 확인한다. 모든 native control의 keyboard/touch matrix와 public
animation/reduced-motion은 C2/D 의무로 남긴다.

C1 최종 입력에서 Canvas/SVG 각각 keyboard/touch4개와 마크 제거 후 빈 설명·container 복구를
확인했다. Native item literal와 discovery26, owning docs31+18, built172pages/1535hashes,
320/390/768/1440 overflow0/Axe0을 통과했다. 320/1440 화면을 직접 확인했다. Search 실측
1039911 bytes에 따라 한도1040000으로 최소 조정했으며 최초47/49 실패를 보존했다.

B의 동일7cab archive를 Node22/Vite/Chromium에서 source-free 설치해 최신 문서 예제의
keyboard/touch/native selection/filter fallback/teardown/Axe0을 검증했다. 새 라이브러리 코드나
타입이 없으므로 B의 동일 runtime/types fingerprint와3Node 검증을 재사용한다. 최초 Vite의
macOS realpath 경로 오류 및 임시 테스트 host의 h1 누락은 harness 수리이며 runtime 결함이 아니다.
Root의 최신 native dependency loader와 연결하도록 두 browser fixture에 repository dependency
옵션을 명시한다. 이 branch의 이전 loader는 옵션을 사용하지 않으므로 최신 loader 합산 검증은
root가 소유한다. C2/D와 AT53·전체077은 계속 미완료다.

C1 source `27ce21d20`와 [최종 machine evidence](tooltip-accessibility-evidence/qualification.json)에
실제 명령·고정 tar 재사용 근거·source/type fingerprint·원본 실패·화면을 보존한다.
Repository dependency 옵션 추가 뒤 B2+C1 browser4의 합산6개도 통과했다.

## C2 선행 수리: paired HTML 실행 정본

Root의 전체 문서 검사에서 B `interaction-keyboard`가 `#item-focus`를 Canvas-only scaffold로
실행해 실패했다. C1도 같은 경계였다. 이 실패를 실제 HTML+JavaScript를 함께 실행하는 문서
계약으로 수리한다. Registry의 `host: "paired-html"`은 같은 section의 유일한 선행 HTML block을
요구하며 scripts·128KiB 초과·다른 execution environment·모호한 host는 거부한다. 새로운
runtime/API나 임의 selector mock은 없다. Normal docs와 설치 tutorial은 기존 tutorial consumer의
Vite/Chromium owner를 공유하며 semantic result·실제 Canvas ink·console/HTTP 오류도 검사한다.
HTML과 JavaScript hash가 모두 일치해야 실행 receipt를 인정한다.

집중 두 실제 browser 문서와 preparation/hash receipt4개, parser/소유문서/discovery68개가
통과했다. 동일7cab archive의 source-free Node22 canonical tutorial consumer도 두 paired 예제를
통과했다. 최초 전체 executable+support129개 중126개 통과, 나머지는 이 branch의 이전
navigation/arbitration scaffold의 `canvas.setAttribute` 부재2개 및 새 테스트의 잘못 기입한
SHA literal1개였다. Literal을 Python 독립 SHA 계산으로 교정해 owning 검사를 통과했다.
Root가 최신 scaffold 수리를 이미 가진 경우 두 baseline 실패는 합산 후 제거된다. 이 기록은
전체129 또는 전체 문서가 green이었다고 주장하지 않는다. 기존 C1 페이지/코드/renderer/package
입력은 같으므로 그 build·4폭·Axe 및3Node runtime 증거는 그대로 재사용한다. 실제 native control
전체 matrix와 reduced-motion/public player는 아직 남아 있다.

## C2: 현재 native control 대안

[정적 접근성/AT53 책임 matrix](ACCESSIBILITY_MATRIX.md)에 원 요구와 후행 소유자를 연결했다.
현재 edit10+history3 명령은 모두 canonical host button/input과 실제 keyboard/touch witness를
갖는다. 새 category controls는 A/B 선택·숨김·복구와 user filter·순서·이력을 동일 reducer에
전달하고 native snapshot의 `selectedBy`와 visible items만 읽는다. Tab은 모든 활성 button을
통과해 외부 control로 나간다. Parameter의 context action은 명시 item a의 exact frame focus
point를 사용하므로 right-click/hover 없이 keyboard/touch로 같은 selection에 접근한다.
Graph 예제는 두 node 모두 native button 대안을 제공한다. 새 공개 runtime/타입/저장 상태는 없다.

새 browser7개와 기존 parameter/partition/camera/node/annotation5개가 통과했다. 최초 parameter
두 실패는 native revision 후 dataset id를 고정 문자열로 가정한 테스트 오류였다. Public final-item
fields를 읽어 literal computed 값을 비교하도록 고쳤다. 최초 inventory는 기존 node snippet ID의
오기1개였고 정본 ID로 수리했다. 첫 owner docs66 중64개가 통과했고 두 실패는 search 증가뿐이었다.
실측1040495bytes에 최소1040500 한도를 적용해66/66 통과했다. 원본 실패는 보존한다.

C2의 실제 host 코드는 라이브러리 source/type fingerprint를 바꾸지 않는다. B의 동일7cab archive와
3Node native/typing/bundle 검증은 유효 입력에 한해 재사용하고, 새 문서3종의 source-free 실제
keyboard/touch 동작은 Node22/Vite/Chromium에서 다시 실행한다. Public player/reduced-motion과
AT53 전체 및074–077 합산은 계속 미완료다.

C2 source `cae13ebe4`와 [machine evidence](native-controls-evidence/qualification.json)에 정확
fingerprint·같은tar·명령·기존/신규 검증·실패·문서 화면을 보존했다. 마지막 입력 기준 browser7+5,
owning66, executable3, source-free 문서3, build172/1535 및4폭 overflow0/Axe0을 확인했다.
320/1440 화면을 직접 확인했다. Library source/type 및 B package는 그대로다.
