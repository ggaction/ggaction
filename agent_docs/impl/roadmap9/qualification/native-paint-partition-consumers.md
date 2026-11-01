# Compound·Pattern·Partition 소비자 근거

## 범위와 승인

기존 [전체 잔여 승인](../AUTHORIZATION.json)을 재사용한다. `compound-path`, `pattern`,
`partition-cartesian`, `partition-polar` 네 행의 Current와 실제 발견 가능한 시험을 대조했다.
Runtime, public API, 선언, 저장 문법, 계산 정책과 shared animation owner는 수정하지 않았다.
새 시각 target 없이 기존 canonical 공개 프로그램과 독립 primitive를 재사용한다.
다른 행·AT group·required/N/A·candidate 결과는 변경하지 않는다.

## 실제 의미와 신규 회귀

Compound에는 두 경계를 구별했다.

- Native Line의 concrete commands를 두 닫힌 사각 subpath로 바꾼 작은 fixture에서 evenodd
  구멍과 owner clip이 실제 session inspect를 제한한다. 데이터 두 행은 계속 한 series item이며
  선택·accessible items·concat namespace·codec가 같은 원행 의미를 유지한다. 명시 color,
  Y domain, axis, source revision 뒤에는 native commands를 다시 생성하되 fillRule과 owner clip을
  보존한다. 처음부터 `groupBy: "group"`을 지정하므로 color field 추가 전후 series grain도 같다.
- Highlight replay는 기존 `rebuildTargetHighlights`가 native baseline을 재생성한다. 임시
  `editGraphics` commands/fillRule의 영구 보존을 이 경로의 새 요구로 만들지 않는다.
  실제 compound selection 근거는 **native GeoShape**로 추가했다. 한 MultiPolygon feature의
  외곽·구멍·섬이 evenodd path와 `M` 세 개를 만들며 한 logical key를 유지한다. Highlight 제거는
  원 graphic과 exact 일치한다. Geometry revision 1에서 구멍을 축소하고 projection을 이동해도
  원 feature key·정확 resource ref·강조·codec·accessible selectedBy가 유지된다. 독립 literal
  outer/island 점은 같은 feature를 hit하고 hole 점은 hit하지 않는다.

Pattern은 독립 dataset family가 아니다. 기존 `structured-fill.test.js`의 실제 Point/Rect/Bar/
Area/Arc/Text create·edit·source·conditional·범례·facet/repeat/concat·highlight 복원과 선언을
그대로 사용한다. 새 Point fixture는 명시 x domain을 `[0,4]`에서 `[0,8]`로 바꾸면 중심이
`[25,150]`, `[75,50]`이고 radius 10의 object paint origin이 `[15,140]`, `[65,40]`임을 검증한다.
Tile 수가 논리 item 수를 늘리지 않으며 실제 hit·원 row indices·accessible selectedBy가 일치한다.

Partition은 숫자 `1`과 문자열 `"1"`을 다른 leaf로 만드는 같은 원본을 두 좌표 방식에서
검증한다. 값 3/1은 Cartesian 폭 300/100, polar 3/4·1/4 원을 차지하며 literal 위치가 정확한
leaf key를 hit한다. Source revision 뒤 값 6/1·원행 revision 1·key를 유지한다. Focus는 다른
leaf의 geometry만 숨기고 선택을 보존하며 reset 뒤 강조가 복원된다. 두 concat 자식의 동일
mark/resource 이름은 childPath와 6개의 고유 item key로 구별되며 한쪽 edit는 다른 child를
교체하지 않는다. Editable codec와 accessible items도 일치한다.

새 `compound-path-types.test.js`는 여러 closed subpath, cubic command, evenodd/nonzero,
path/rect clip을 검증한다. 잘못된 op/close 좌표/fill rule/clip 문법과 Basic의 extension-authoring
호출은 type error다. Generic `editGraphics`의 모든 값이 선언에서 닫힌다고 확대하지 않는다.

## Renderer와 animation

Pattern의 기존 backend fixture는 primitive-only여서 실제 native Rect 공개 프로그램까지
확인하는 새 `structured-paints/renderer.render.js`를 추가했다. 7개 pattern 모두 Canvas의
전체 drawing calls와 RGBA가 독립 primitive와 exact 같다. SVG는 정의 ID와 정확히 한 참조를
확인한 뒤 독립 identity에서 유래한 **ID만** 정규화하고 나머지 전체 문자열을 비교한다.
각 pair를 native PDF로 따로 출력하고 72 dpi로 해독한 모든 pixel도 exact 비교한다.

Icicle와 Sunburst는 기존 primitive의 동일 geometry·labels·drawing order를 재사용하여
Canvas calls/pixels, SVG 구조/pixels, native PDF decoded pixels를 추가 비교했다. 기존 hierarchy
helper는 attribute 없는 구조 group/save/restore 차이만 제외하며 실제 pixel equality로 그
정당성을 독립 확인한다. 서로 다른 backend의 antialias 차이를 정규화하지 않는다.
기존 Compound 네 backend·PNG, Pattern PNG, Partition PNG와 animation renderer도 실행했다.

Partition scene-animation owner는 기존 실제 bend/focus/다양한 방향/100회 interruption/
rebase/offline/current-frame session 및 Canvas/SVG 브라우저 증거를 그대로 보존했다.
Pattern의 animation owner는 실제 pattern-filled Partition의 **명시 appearance fallback과
original-plan offline replay**다. Structured paint를 typed 보간한다고 주장하지 않는다.

Compound의 실제 native Line override는 `crossfade/edited-position`을 반환하며 최초 계획의
0/40/100 ms offline 결과가 exact 같다. 현재 frame rebase의 0 ms 객체도 동일하다. 그러나 이
branch의 interrupted offline restore는 `decision.reason`을 `sampled-concrete`에서
`unsupported-family`로 바꾼다. Graphic/scene는 같고 reason assertion만 실패한다. 재현 source와
원본 로그를 보존하며 scene-animation 셀은 pending으로 둔다. 앞선 profile 감사에서 root의
retained-vector 수리가 보고됐지만 이 branch에 병합하지 않았으므로 여기서 통과로 소급하지 않는다.

## 매핑과 남은 의무

| 행 | 지정 | Pending |
| --- | ---: | --- |
| compound-path | 17/19 | interrupted animation offline transport, package |
| pattern | 18/19 | package |
| partition-cartesian | 15/19 | encodings, scales, guides, package |
| partition-polar | 15/19 | encodings, scales, guides, package |

기존 22개 owner를 유지하고 43개를 추가했다. Pattern/Partition의 SVG·Canvas·PDF owner에는
새 public/primitive renderer 시험만 추가했다. Partition의 native mapping과 labels를 일반
field encoding/scale/guide 근거로 바꾸지 않는다. 패키지는 발견 가능한 실제 installed runtime
test owner가 필요하며 generic AST나 source 실행은 대체하지 않는다. 임의 N/A는 추가하지 않는다.

네 행의 owner/assignedOwners만 이전 값으로 되돌리면 전체 manifest가 deep-equal이다.
이 branch의 요구 30/group 79/target 577과 결과는 그대로다. Root 합산의 574 required+
Image N/A 3은 root가 이 네 행 delta만 합쳐 보존한다. Assigned owner는 candidate pass가 아니다.

## 검증

Node 22.23.1, macOS arm64. [명령·해시·로그](native-paint-partition-consumer-evidence/summary.json).

- 최종 관련 normal/type/animation와 manifest/discovery **91/94**. 실패 3개는 모두 새 Pattern
  owner의 중복 `MARKS` contract였다. 중복을 제거한 뒤 owning manifest/discovery **32/32**.
  나머지 91개를 전체 재실행했다고 보고하지 않는다.
- 새 renderer 9개와 compound declaration **10/10**.
- 기존 renderer **28/29**. Compound browser 서버가 `geographic-math` bare dependency를 제공하지
  않은 1건은 canonical `dependencies:"repository"` 옵션으로 수리 후 해당 네 backend **1/1**.
- 실제 Partition/structured paint browser **4/4**, 문서 catalog/index 및 실행 가능한 Partition
  tutorial **3/3**. 미등록 inline snippet 모두를 실행했다고 주장하지 않는다.
- 준비 중 잘못된 Point facade/radius 옵션, axis margin, Basic extension type expectation,
  독립 SVG definition ID, Line groupBy fixture 수정과 원본 로그를 따로 보존한다.
- native completion은 candidate null, group 79/target 577 전부 pending을 유지한다.

Packed runtime 입력은 바뀌지 않아 새 archive/3Node 설치/source coverage/P95는 실행하지 않았다.
이 기록은 소비자 근거 checkpoint이며 native 최종 candidate, 전체 STEP077 또는 release 완료가 아니다.
