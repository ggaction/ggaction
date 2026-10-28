# STEP047 — CSS 좌표와 exact hit 준비

## 진행 상태

- [x] 원안 STEP047–049, interaction 계약 및 기존 path/clip/scene owner 확인
- [x] [전체 승인](../AUTHORIZATION.json)을 재사용한 private 좌표 kernel
- [x] 회전·음수 scale·중첩 행렬·변환 clip의 독립 literal과 수치 경계
- [x] Node20/22/24 각8개, source/discovery/package33개와 owner100% coverage
- [ ] private source commit에 맞춘 provenance 고정·push
- [ ] geometry별 exact hit와 current scene index, 의미 role/lineage 연결
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
