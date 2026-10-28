# STEP047 — CSS 좌표와 exact hit 준비

## 진행 상태

- [x] 원안 STEP047–049, interaction 계약 및 기존 path/clip/scene owner 확인
- [x] [전체 승인](../AUTHORIZATION.json)을 재사용한 private 좌표 kernel
- [x] 회전·음수 scale·중첩 행렬·변환 clip의 독립 literal과 수치 경계
- [x] Node20/22/24 각8개, source/discovery/package33개와 owner100% coverage
- [x] private source `23a493c48`에 맞춘 provenance·docs19/19·built154/1310 고정
- [x] private geometry별 hit, CSS stroke slop/dash/cap/join, 변환 clip/opacity 검증
- [ ] current scene index, 의미 role/lineage 및 concrete scene adapter 연결
- [ ] STEP035 중첩 composition과 공개 interaction entry·선언·소비자 통합
- [ ] STEP048 broad phase/guide roles 및 STEP049 synthetic/current frame bridge

Shadow source와 검증은 `ccbce6a6b`로 먼저 push했다. 이 기록은 STEP047의 private 계산만 소유하며
STEP047/048/049 또는 AT33/34 완료를 뜻하지 않는다. Root가 Image/H/Partition/GraphPlot P2 합산과
전체 source 검증을 계속 소유한다.

## 최소 owner와 explicit 입력

기존 `grammar/pathGeometry.js`가 path flatten(.25 CSS px), winding/evenodd, 선분 거리와 work bound를
소유한다. `grammar/schemas/graphicClip.js`는 clip 구조와 bounds, `graphicTree.js`는 순서와 parent,
selection/items는 의미 identity, `scene.js`는 현재 program의 exact scene identity를 소유한다.
동등한 일반 affine 좌표 owner는 없으므로 새 `grammar/hitCoordinates.js`에 순수 값 계산만 둔다.

Private `resolveHitCoordinates({point:{x,y},rect:{left,top,width,height},rootTransform,childTransforms})`
는 모든 값을 명시적으로 받는다. Matrix는 `[a,b,c,d,e,f]` local→parent 변환이다.
Client point에서 rect 원점을 뺀 screenPoint는 CSS px이며 root inverse, 저장된 parent→child 순서의
child inverse를 차례로 적용한다. Rect의 CSS 크기나 backing canvas에서 scale/DPR을 추측하지 않는다.
`transformHitPoint(matrix,point)`는 같은 명시 matrix의 forward map이다. 공개 package export는 없다.

성공 결과는 frozen `{screenPoint,localPoint,diagnostics:[]}`다. Singular matrix와 표현 범위를 넘는
계산은 localPoint:null과 단계 index가 있는 diagnostic을 반환한다. CSS subtraction 자체가 overflow면
screenPoint도 null이다. Width/height0 viewport는 명시 empty diagnostic을 반환한다. 원점·행렬·폭의
NaN/Infinity, 음수 크기, extra fields, accessor, 희소 배열은 계산 전에 닫힌 오류로 거부한다.
Singular root 뒤의 잘못된 child도 검증한다. Child matrix는 최대1024개이며 반복문으로 처리한다.

행별 정규화한 2×2 inverse는 determinant 곱의 overflow/underflow를 피한다. 매우 다른 축 크기
1e308/1e-308과 큰 translation 차이도 유한한 해를 유지한다. 모든 출력은 유한하거나 진단이며
이전 program과 caller-owned point/rect/array를 수정하거나 freeze하지 않는다.

## 독립 검증과 남은 경계

Client(120,80), rect원점(30,40), 90도 root회전×2와 음수 child scale의 literal local(2,1)을 고정했다.
별도 translated grandchild도 literal로 검증한다. 일반행렬 구현을 expected로 재사용하지 않고
100개의 명시 삼각함수 rotation/axis scale/translation으로 생성한 점이 원래 좌표로 돌아오는지 확인한다.
원안 OR09의 literal outer/hole/island를 durable test에 직접 두고 변환된 CSS 점에 기존 fill owner를
적용해 hole/outside miss와 두 분리영역 hit를 확인한다. 테스트는 roadmap 파일을 import하지 않는다.

현재 pure test의 DPR1/2/3은 backing dimensions가 입력에 관여하지 않는 불변성이다. Browser element,
실제 renderer 좌표계 또는 DOM CSS transform 전체를 통과했다고 주장하지 않는다. Exact geometry,
stroke/slop/dash, text/image 정책, clips traversal, guide role, semantic dedupe, scene revision cache,
resource refs 및 animation frame은 후속 통합 의무다. 이 kernel은 의미 identity를 만들거나 재정렬하지 않는다.

Package에는 private source가 한 파일 늘지만 public import graph에는 아직 들어가지 않는다.
검증 명령·최초 cap 실패·실측 minimum 증분과 expected/actual은 `coordinate-evidence/`에 보존한다.

## 측정 결과

새 pure owner는95/90/100 critical family에 자동 포함되며 actual lines/branches/functions가100%다.
Full/Basic/SVG public import graph에 이 파일이 없음을 확인했으므로 앞선 public bundle 검증을 재사용한다.
Packed contents는 source1개 추가로816 entries, unpacked5,520,464bytes다. Node22 packed1,200,158,
Node20/24 packed1,202,819bytes를 실제 측정했다. 최초 cap 실패를 보존한 뒤 cap만816/1,203,000/5,521,000으로
최소 올림했다. 이 private checkpoint에서 새 public renderer/설치 지원을 주장하지 않는다.


## 도형과 painted stroke 계산 checkpoint

`grammar/hitStroke.js`는 기존 stroke defaults와 path 거리/면적 판정을 재사용하여 실제 painted dash run,
segment rectangle, cap, join의 local footprint를 만든다. Odd dash 반복, zero dash, closed seam,
subpath reset, miter limit을 명시 처리한다. 호출별 최대100만 work를 넘거나 유한한 진행이 불가능한
수치 입력은 부분 결과 없이 거부한다. `grammar/hitShapes.js`는 이 footprint를 명시 affine transform으로
CSS 공간에 옮긴다. 변환된 선 폭에 mouse/pen3px, touch6px 또는 명시 slop을 추가한다.

Filled circle/rect/path는 내부를 판정하고 slop으로 fill hole을 메우지 않는다. Path는 기존 winding/evenodd,
curve flatten owner를 사용한다. 곡선의 판정은 원 계약의 최대.25 CSS px subdivision 정책이며 임의 확대의
raster boundary와 수학적 동일성을 주장하지 않는다. Clip은 rect/path의 실제 fill 교집합이고 slop으로
벗어나지 않는다. Opacity0은 기본 제외, hitInvisible:true에서도 clip은 유지한다. Transparent fill은
adapter가 fill:true, none은 false로 전달한다. Shadow/halo occupied bounds로 source를 대체하지 않는다.

Text는 측정 owner가 제공한 개별 line box의 변환 사각형을 사용하며 줄 사이 간격과 회전 후 AABB 모서리를
hit로 만들지 않는다. Glyph alpha 판정이나 font 추측은 하지 않는다. Image는 배치 viewport를 사용한다.
아직 concrete scene→입력 adapter가 없으므로 이 정책의 public consumer 완료를 뜻하지 않는다.
모든 branch와 accessor/희소 배열/수치 overflow는 preparation에서 검증하고 caller input은 변경·freeze하지 않는다.

Node20/22/24 각각27개, source/discovery/package33개, native Canvas의 cap×join×dash와 affine 내부표본을
통과했다. 세 owner의 coverage는100 lines/95.38 branches/100 functions이며 기존95/90/100 floor를 유지한다.
Literal hole/island expected/actual/diff와 최초 실패는 `shape-evidence/`에 보존한다.
새 source 두 파일을 포함한 실측은818 entries/5,541,801unpacked, Node22 packed1,205,871,
Node20/24 packed1,208,456bytes다. 최소 cap은818/1,209,000/5,542,000이다. Public import graph는 그대로다.
