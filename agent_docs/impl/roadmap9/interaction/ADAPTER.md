# Concrete item hit adapter

## 진행 상태

- [x] 전체 승인 AUTHORIZATION.json과 STEP047–049 계약 재사용
- [x] 실제 CanvasScene node와 concrete graphic item의 읽기 전용 연결
- [x] stored final-grain identity, row/resource revision, nested childPath 보존
- [x] 기존 Text metrics·path·clip·stroke·outline 계산 재사용
- [x] focused consumer 및 critical coverage 검증
- [ ] guide/title/header 의미 adapter
- [ ] 공개 interaction entry/types/session/browser/animation 연결
- [ ] STEP035 및 AT33/34 전체 통합

이 기록은 실제 마크 소비자 연결 checkpoint다. 공개 interaction 지원이나 STEP047–049/077 전체 완료를
뜻하지 않는다. API 질문을 반복하지 않고 승인된 후속 구현을 계속한다.

## 소유권

`sceneSnapshot.js`가 기존 scene identity 계산과 `collectTransitionGraphics.onNode` 결과를 한 번 보유한다.
공개 CanvasScene은 같은 version2 shape와 key를 유지하고 source association은 ephemeral private snapshot에만
있다. SVG와 Canvas는 같은 identity 계산을 재사용한다. 기존 Canvas shadows 옵션의 uncached reference
동작도 보존한다. Renderer는 여전히 graphicSpec만 읽고 semantic state를 해석하지 않는다.

`interaction/hitProgram.js`는 immutable closed-stack ChartProgram의 실제 materialized item.identity만 읽는다.
데이터를 다시 grouping하거나 selection을 실행하지 않는다. Resource item의 exact revision과 데이터 item의
logicalDataId/revision/rowKeys는 그대로 반환하며 의미 중복은 기존 hitIndex가 접는다. Tree link와 node는
서로 다른 logical key이므로 겹쳐도 모두 후보로 남는다. 이름이 같은 자식 마크도 namespace와 childPath로
구별한다. 자식 snapshot의 ID encoding은 기존 namespaceGraphicId owner를 재사용한다.

`interaction/hitConcrete.js`는 scene의 실제 rect/circle/line/path/Text/Image와 clip을 기존 hit shape로 변환한다.
Text는 기존 resolved metrics의 줄별 영역을 회전하며 줄 사이 빈 공간을 합치지 않는다. glyph-alpha hit를
주장하지 않는다. Text outline은 그 metrics 영역을 실제 폭의 절반만 확장한다. 다른 도형은 최종 outline
edge를 ordinary stroke 대신 사용한다. Shadow occupied bounds는 source geometry로 대체하지 않는다.
Image는 실제 placed rectangle과 viewport/owner clip의 교집합이며 alpha sampling을 하지 않는다.

Primitive-only extension graphics에는 domain identity가 없으므로 의미 후보를 임의로 만들지 않는다.
Owner-scoped 가이드 역할은 다음 adapter에서 연결한다. 그래프 filter도 현재 materialized identity만
소비하므로 별도 예외를 추가하지 않는다. 숨겨진 선택의 orphan/drop event는 후행 session 책임이다.

## 경계와 증거

Program 상태 descriptor를 읽기 전에 확인하여 forged accessor를 호출하지 않는다. 최대100,000 graphic
items, 누적10,000,000 preparation work, composition depth1024를 적용한다. ID namespace 문자열과 geometry
query cost도 work에 합산하며 실패하면 원본 program/trace와 이전 frame은 그대로다. Shape/index 자체의
독립 budget은 유지한다.

`test/unit/hit-program.test.js`는 Full/Basic 실제 points, nested concat, revision+editable codec,
hierarchy body/label/link, exact stroke dash/outline/path hole/clip, rotated multiline metrics, Image viewport,
opacity0, malformed/empty/oversize/own-data 입력을 검사한다. 제품 테스트는 이 기록을 import하지 않는다.
증거와 최초 실패는 `adapter-evidence/`에 보존한다. 최초 실패는 rowKey inspection 필드, 실제 중첩 tree link,
정규화 font weight, primitive fixture 생성 호출의 oracle 오류이며 각 기대값을 계약대로 수정했다.
Package 최초871>868 실패는 새 private source3개에 의한 실제 증가다. 최종 caps와 Node별 실측은 evidence에
따로 기록한다. Public entry는 추가하지 않으며 private hit owners는 기존 authoring/renderer entry에 유입되지 않는다.
