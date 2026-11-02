# Hit circle의 private 표현 감사

## 상태와 원칙

2026-11-02 root 요청에 따른 후속 설계 감사다. 691dfd archive의 same-call circle 명령 재사용은
이미99개 명령/state/query/work 동등성 및1162개 focused 검증을 통과했지만, Node20 원100k는
아직 준비를 완료하지 못했다. 처음에는 읽기 감사로 시작했고, 아래 private container assembly만
root의 구체 채택 뒤 구현했다. Analytic 대체나 typed buffer는 채택하지 않았다. Global core ownership,
원 geometry/clip/transform/asset/current-scene 검증, scalar 순서와 보수적 work charge는 유지한다.

## 실제 commands 소비자

| 소비자 | 실제 필요 |
| --- | --- |
| `hitShapes.compilePath` | 원 tolerance0.125 CSS subdivision, incomplete/point/command 한도 검증, 실제 point 수 과금, path bounds |
| `hitShapes.contains` | circle fill만 inverse transform+radius로 analytic 판정; 다른 geometry와 clip은 path 판정 |
| `hitShapes.boundaryDistance` / `nearestHitShape` | circle 밖의 거리도 현재 flattened commands를 `pathStrokeDistance`에 전달 |
| `hitShapes.hitShapeAnchor` | 중심이 clip 밖이면 실제 boundary와 clip 교점에서 native focus anchor를 선택 |
| `hitClipDistance.visitClippedBoundary` | commands 길이의 기존 과금, segment 순서, clip membership, 교점/중점 순서를 사용 |
| outline/stroke | 원 circle 경로에서 native stroke parts를 생성; fill의 analytic 판정으로 대체 불가 |
| shadow | hit footprint에서 원래 제외. 변경 근거가 아님 |

## 단순 analytic 대체가 달라지는 실제 수치

반지름10, 중심(0,0), identity transform, query(11,9):

- 현재 nearest: `4.2127080495498`
- analytic radial distance: `4.212670403551897`

transform `[1,.3,.7,2,0,0]`의 broad bounds(원0.25 padding 포함):

- 현재 right `12.453687754162667`, bottom `20.450976574112993`
- analytic ellipse right `12.456555615733702`, bottom `20.473748416156685`

따라서 현재 pure circle의 commands/compilePath를 analytic 수치만으로 지우는 것은 동등하지 않다.
Clip `[8,-8,2,16]`에서 현재 focus anchor는 실제 boundary `(10,0)`이고 중심은 clip 밖이다.
원 receipt는 `.artifacts/hit-circle-consumers.json`에 보존한다. 새 수식을 도입하거나 기존값을
느슨한 tolerance로 비교해 통과시키지 않는다.

## 다음 좁은 검토 경계

`compilePath`는 이미 native forward 계산으로 finite flat points를 만든 뒤 M/L/Z commands를
새로 만들고, `prepareHitShape` 마지막 `cloneAndFreeze`에서 private tree를 다시 복사한다.
최종 tree는 `states` WeakMap에만 있고 public `ChartProgram`/scene/state/codec에 노출되지 않는다.
따라서 거리나 boundary 수학을 바꾸기보다 이 한 private 표현의 container proof 및 immutable
격리를 보존하면서 수백만 하위 객체의 중복 복사/ownership 등록을 줄이는 것이 다음 감사 대상이다.

Root의 제안인 flat numeric buffer와 container proof를 비교하되 다음을 먼저 증명해야 한다.

1. 최초 입력 own-data/finite/transform/clip 검증과 subdivision/command/point 한도·진단 순서가 동일하다.
2. Prepared private container가 caller 입력과 alias하지 않고 외부에서 변조/복원할 수 없다.
3. 거리·clip·anchor가 원 command와 같은 scalar 연산 및 segment/closing-point 순서를 소비한다.
4. 숫자0/-0, 접두/종료점, degenerate/empty/cubic/outline/weighted union의 원 결과와 cost가 정확히 같다.
5. 현 query·snapshot·selection·animation 정책을 우회하지 않고 최초/재사용 모두 원 charge를 유지한다.
6. `core/immutable.js`와 public program ownership은 바꾸지 않는다. 별도 일반 registry도 만들지 않는다.

원100k의 미완료는 SLO 성공이 아니다.

## 채택한 private container assembly

Root는 기존 전체 승인 범위에서 아래 한 지점의 중복 clone/global-owned 등록 제거를 채택했다.
Typed buffer·새 format·analytic 대체·core 일반 ownership 변경은 없다. `compilePath`의 계산/검증은
그대로이며 최종 결과 외피의 `cloneAndFreeze`와 기존 `states` WeakMap authentic gate도 보존한다.

| Private field | 생성/입력 출처 | 최종 격리 |
| --- | --- | --- |
| fill/strokes/clips 및 각 part 배열 | 이번 호출의 map/local 배열 | 고정 깊이 assembly에서 Object.freeze |
| part.commands 및 M/L/Z command | compilePath→flattenedCommands가 이번 호출에 만든 새 값 | 명령 및 배열을 직접 freeze; 외부 입력을 담지 않음 |
| part.bounds | resolvePathCommandBounds가 반환한 새 record 또는 undefined | 직접 freeze |
| part.fillRule, opacity, work | 검증된 primitive 값 | 값으로 보존 |
| part.circle | geometry가 만든 새 x/y/radius record 또는 prepareHitStroke의 기존 immutable native part | 직접 freeze; caller circle 자체를 저장하지 않음 |
| part.transform, state.transform | caller/기존 owned transform | 기존 cloneAndFreeze로 복사·격리; 외부 값을 직접 freeze하지 않음 |
| result bounds/diagnostics | 외피의 기존 cloneAndFreeze | 변경 없음 |

Private tree는 이 모듈의 WeakMap에만 보관한다. 외부 반환은 type/bounds/diagnostics 외피이며
commands/transform/circle/parts를 반환하는 public 경로가 없다. `hitShapeWork`, hit/nearest/anchor와
union은 기존 WeakMap membership으로만 이 tree를 얻는다. Lookalike/frozen/clone 외피는 권한이 없다.
Union이 이미 private parts를 보유하는 현재 경계와도 일관된다.

Assembly는 고정된 field/배열 깊이만 순회한다. 원 shape parts30000, clips1024, path command/point
guard, geometry 누적 work와 compile 실패 원자성이 선행하며 새 무제한 재귀를 도입하지 않는다.
Alias가 있는 내부 circle은 같은 불변 값으로 공유해도 되고, 외부 transform의 반복 참조는 기존처럼
각 실제 저장 위치에서 clone한다. 이후 준비가 이전 private 값을 수정하지 않는다.

검증은 이전99개 전체 state/command/query/work 비교 외에 shared transform/path/clip alias,
caller의 radius/commands/clip/stroke 변경, 연속 준비의 이전 결과 보존, clone/frozen/가짜 외피,
weighted union 및 원 cap+1/inactive-invalid 회귀를 포함한다. 다음100k는 CPU 슬롯 조율 뒤
원 Node20/default heap으로 검증하고, 이전 미완료와 별도 receipt로 남긴다.

구현 뒤 원99개 전체 private state/commands/query/work는 정확히 동일했다. 이 matrix의
prepareHitShape 영역 ownedAdds는38183→12254, object clone allocations는32294→8161이다.
외부 transform의 각 저장 위치 격리를 유지하므로 clone 함수 호출 횟수 자체는 줄었다고 주장하지 않는다.
새 alias/caller mutation/연속 준비/forgery를 포함한 literal14개도 통과했다.
후속 matrix JSON SHA256은 `755e0b27f27b7b5e0608178208edbfa18253f6363bf9de2d97408238fcd1a909`다.
실제100k 새 archive는 Point의 직렬 예약이 끝난 뒤 검증한다. 이 수치 비교는 P95가 아니다.

추가 source 검증은 focused1164/1164, 변경10owner 전부95/90/100 floor를 통과했다.
HitShapes는100/95.38/100, 해당10owner aggregate는100/95.78/100이다.
원 명령/guard/charge 동등성의 증거이며 whole-repository coverage나100k 완료 증거는 아니다.

## 6849 중단 후 다음 concrete proposal: path 임시 계산 결과

6849 Node20도 원100k 첫 사례를10:17/CPU10:10.00까지 완료하지 못했다. 원 heap/fixture/GC 정책을
바꾸지 않고 exact child만 종료했다. OSsample은 WeakSet.add→Ephemeron Rehash까지 보이지만
호출자의 JIT 이름은 unknown이므로 그 표본만으로 global ownedValues와 cloneAndFreeze의
per-call ancestors 중 어느 Set인지 단정하지 않는다.

추가 작은99-case AST 계측은 두 add 지점을 별도 이름으로 셌고, 기존 전체 state/query/work와
deep-equal을 확인했다. 원 sample/큰100k 계측을 이 작은 계측으로 대체하지 않는다.

| 현재 호출 범위 | 호출 수 | global owned adds | ancestors adds |
| --- | ---: | ---: | ---: |
| compilePath→flattenCommands | 1448 | 28343 | 0 |
| prepareHitShape stroke 준비→flattenCommands | 33 | 936 | 0 |
| circleCommands→arcToCubicCommands | 667 | 17644 | 0 |
| prepareHitShape 나머지 exclusive | 99 | 11318 | 10568 |

Query/outside의 flattenCommands46280회/global adds627144는 위 준비와 분리한다. 이 경로까지
변경하는 제안은 아니다. `.artifacts/hit-ownership-site-context.{json,log}`가 원본이며 runtime
`core/immutable.js`는 변경하지 않았다. 선택된 path 계산의 실제 add는 global owner임을 이 계측과
source가 증명하지만, 중단된 원100k의 특정 JIT frame까지 귀속됐다고 주장하지 않는다.

Root가 요청한 최소 분리는 같은 `grammar/pathGeometry.js` 계산식 한 곳을 그대로 유지한다.

1. 내부 `calculateFlattenedPathCommands(commands, options)`는 기존 flattenCommands의 입력 검증,
   topology, transform, tolerance/maxDepth/maxPoints, subdivision·closing point·diagnostic 순서를
   그대로 실행하고 이번 호출에서 만든 numeric tree만 반환한다. 기존 `flattenPathCommands`와
   variable-width facade는 그 결과를 기존 freezeOwned 형태로 조립한다.
2. 내부 `calculateArcCubicCommands(input)`는 기존 arc 검증·삼각함수·분할·command limit과
   부동소수 연산 순서를 그대로 실행한다. 기존 `arcToCubicCommands`는 원 exact result shape의
   모든 command/diagnostic/container를 freezeOwned로 반환한다. 외부 동작/immutability는 같다.
3. 두 계산 helper는 public package entry/type에서 export하지 않는다. `hitShapes`의 compilePath,
   같은 호출의 circleCommands 및 stroke 준비만 raw 계산 결과를 소비한다. Stored private
   commands는 앞서 승인된 bounded assembly가 직접 freeze하고 caller transform은 계속 clone한다.
   Path fill/distance/renderer/다른 caller는 기존 frozen facade를 유지한다.
4. Raw points/commands/diagnostics는 모든 scalar를 읽어 새로 만든 tree다. 닫힌 subpath의 first-point
   alias도 같은 호출의 새 point이며 caller command/transform/width record를 보관하지 않는다.
   이 계산 결과 자체에는 authority/cache를 부여하지 않고 기존 topology/guard도 우회하지 않는다.
5. Source 예상 변경은 pathGeometry의 계산/기존 frozen facade 분리와 hitShapes의 세 직접 호출뿐이다.
   기존 pathGeometry/Trail 검증, 공개 반환의 deep frozen/owned·입력 격리, invalid/cap/diagnostics,
   99 exact matrix와 실제 hit/clip/outline/negative-zero/원work를 검증한다. 이후 root 슬롯 조율하에
   새 archive의 원100k로 효과를 확인한다. query/scene/asset/source epoch/정책/수학/core는 변경하지 않는다.

Root는 이 구체 seam을 기존 remainingApproval 범위로 채택했다. 실제 source는 위 두 raw 계산
helper와 기존 facade의 deep freeze/owned assembly, hitShapes 세 소비자만 변경했다. 새 public
export/type/core 변경은 없다. 원99 전체 private state/commands/query/work exact와 기존 path/Trail/
hit literal61개가 먼저 통과했다. 이후 owner coverage와 동일 새 archive 검증은 별도 기록한다.

원99 matrix의 최신 receipt SHA256은 `d5690114ef6e771dd039fbe0c3daa0baa27f299b26be5610088038626506c5ad`다.
Compiled path의 global-owned 등록은 topology 같은 기존 소비자에 필요한2896개가 남고,
circleCommands 영역은0이다. Query/outside 영역의 frozen facade는 유지한다. 원 수학·work는
정확히 동일하지만 이것만으로 원100k 준비시간이나 P95가 해결됐다고 주장하지 않는다.
