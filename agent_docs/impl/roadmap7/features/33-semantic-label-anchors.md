# R33 — 의미 기반 라벨 anchor와 배치 정책

원래 감사 번호: **33**. Primary owner: **Phase 7**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

사용자가 “막대 끝 바깥”, “원호 안쪽”이라고 지정한 의도를 데이터·크기 변경 후에도 보존한다. 범용 자동 디자인/최적 label 배치 탐색이 아니라 명시적 anchor+기존 collision system 확장이다.

현재 파일(저장소 root 상대 경로):
- `src/actions/marks/text/layout.js`
- `src/layout/labels.js`
- `src/grammar/polar.js`
- `src/actions/marks/text/index.js`

관련 항목: R27, R29, R32. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
createMarkLabels({...,
  placement?: {anchor: "center"|"insideStart"|"insideEnd"|"outsideStart"|"outsideEnd",
    gap?:number, overflow?:"hide"|"outside"|"allow",
    leader?:false|{stroke?:string,strokeWidth?:number}}})
editMarkLabelPlacement({target: string, placement: Placement | "auto"})
// 기존 Line start/end anchor API를 유지; 아래 family table과 일치시킨다.
```

## 값·기본값·오류 계약

- 기존 placement 생략은 지금 동작 유지. 새 placement에서 gap 기본4px nonnegative, overflow 기본hide, leader 기본false. auto 편집은 새 placement override를 지워 기존 기본으로 돌아간다.
- Bar: start는 baseline 또는 stacked segment 시작, end는 값 방향 끝. vertical positive end는 위, negative end는 아래; horizontal은 오른쪽/왼쪽. inside/outside는 그 경계에 대한 위치이며 부호/scale reverse 후 최종 geometry tangent로 결정한다.
- Rect/interval: 명시적 interval axis로 시작/끝을 정하고 부호 없는 일반 Rect는 center만. stacked Bar는 각 segment 시작/끝이며 total stack 끝으로 잘못 해석하지 않는다.
- Arc/Pie/Rose: angular midpoint ray에서 insideStart/End는 inner/outer radius 안쪽, outsideStart/End는 inner/outer 밖. annulus hole을 넘어 반대편으로 뒤집지 않는다. Radar vertex label/Polar Point는 center와 outsideEnd(radial outward)만.
- Point는 center만 새 anchor로 지원하고 기존 dx/dy를 유지. Line은 현재 endpoint anchor를 사용하고 새 placement의 center/start/end 해석을 혼합하지 않는다. Parallel은 현재 series endpoint label을 유지; arbitrary interior anchor는 오류.
- inside text의 measured bounding box가 해당 item geometry에 안 들어가면 hide(기본), outside(해당 경계 밖 재배치), allow(overflow 허용). Arc는 annular sector에 text bbox 전체가 포함되는지 모서리와 edge/inner-hole 교차를 검사; 긴 text 자동 축소 금지.
- collision layout은 anchor 후보 뒤에 적용. leader는 displaced visible labels에만 draw; hide/empty label은 line도 없음. explicit dx/dy는 semantic anchor 계산 뒤 더한다. 지원 불가능한 family/anchor/overflow 조합은 사전 오류.

## 저장 결과와 생명주기

requested placement는 label owner config, resolved point/tangent/text align은 materialized result. source bounds/stack/range/orientation/polar frame가 변하면 다시 계산한다. leader는 label-owned graphic이며 source mark가 아니다. text metrics는 renderer마다 임의 추정하지 않고 현재 common text metrics를 사용한다.

## 구현 순서와 action 계층

1. family별 supported anchor 표를 validators와 테스트 data로 고정.
2. source final item → anchor point/outward vector/allowed geometry를 pure adapter로 계산.
3. text measurement → edge-gap anchor → dx/dy → inside-fit policy → existing collision solver 순으로 배치.
4. leader ownership/remove/theme/style/Canvas/facet lifecycle 연결.

## 독립 oracle와 인수 테스트

- vertical bars +5/-5: outsideEnd가 각각 value end에서 위/아래4px. reverse y에서도 final geometry에 맞음.
- stacked segments[2,3]는 두 segment에 각각 center/end; total5 끝에 두 라벨을 겹치지 않음.
- donut inner40 outer80 theta[0,90]의 outsideEnd의 gap anchor는 theta45 ray radius84이며 text center는 bbox support distance만큼 더 바깥이다. polar center 이동에도 같이 이동.
- 아주 작은 segment: hide → graphic0, outside → 바깥, allow → 기존 anchor. leader false/true와 R31 cleanup.
- text font 크기 edit 후 fit 재판정, collision solver 이동 후 leader endpoint 갱신; unsupported Point insideEnd 오류.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 구현 고정 명세 — anchor geometry와 text fit

### anchor 지원표

| source | center | insideStart/insideEnd | outsideStart/outsideEnd |
| --- | --- | --- | --- |
| Cartesian Bar / 명시 방향 interval Rect | 지원 | 지원 | 지원 |
| 방향 없는 Rect / Cartesian Point | 지원 | 오류 | 오류 |
| Arc/Pie/Rose | 지원 | 지원 | 지원 |
| Polar Point / 지원되는 Radar vertex item | 지원 | 오류 | outsideEnd만 |
| Line/Parallel series | 기존 endpoint label API 유지 | 새 placement object 오류 | 새 placement object 오류 |
| Text/독립 annotation/기타 미지원 | 오류 | 오류 | 오류 |

Bar의 start/end는 최종 item의 semantic baseline/endpoint다. scale reverse와 negative 값은 이 두 점의 projected vector로 처리한다. 길이0은 center를 허용한다. start/end가 같을 때 inside/outside의 방향은 해당 quantitative axis의 증가 방향(final scale의 domain/range 방향)을 사용한다. 길이가0인 내부에는 text가 fit하지 않으므로 기존 overflow 정책을 적용한다. 0값 한 개 때문에 전체 레이블 생성을 실패시키지 않는다. Rect는 x/x2 또는 y/y2의 유일한 interval role이 필요하다.

### gap과 text 기준점

각 item에서 boundary point P와 outward unit vector u를 얻는다. gap은 **boundary와 text bbox의 가장 가까운 edge 사이의 px 거리**다. Bar처럼 cardinal direction이면 text align/baseline을 선택해 edge를 P±gap*u에 붙인다. arbitrary ray는 centered measured text bbox의 support distance h=(abs(ux)*textWidth+abs(uy)*textHeight)/2를 사용해 outside center=P+(gap+h)*u,inside center=P-(gap+h)*u로 배치한다. rotation이 있으면 rotated bbox의 support distance를 쓴다.

따라서 donut outer80,gap4의 boundary anchor는 radius84지만 text center가 항상84인 것은 아니다. 기존 예제의84는 gap anchor를 의미한다. 이 구별 없이 text center를84에 놓으면 긴 레이블이 원호와 겹친다.

Arc: angular midpoint를 wrap-aware하게 구하고 inner boundary outward=-radial,outer boundary outward=+radial. center anchor는 mean radius+angular midpoint. insideStart는 inner boundary에서 sector 방향, outsideStart는 hole 방향이다. hole쪽 offset이 center를 넘는 경우 반대 ray로 뒤집지 않고 hide 또는 explicit allow로 처리한다.

### 배치 파이프라인

1. 기존 common text metrics로 bbox/rotation 계산.
2. semantic anchor+edge gap으로 후보 생성, explicit dx/dy 적용.
3. inside/center의 fit 검사. Bar/Rect는 full bbox containment. Arc는 annular-sector 경계와 bbox edge 교차까지 검사한다. 네 corner만 안에 있어도 bbox edge가 inner hole을 가로지르면 fit 실패다.
4. overflow hide면 숨김, outside면 동일 start/end 경계 밖으로1회만 fallback(center는 end로 fallback),allow면 유지. outside anchor는 추가 outside fallback을 반복하지 않는다.
5. 기존 collision solver 적용. 이동 후 내부 containment가 필요하면 재검사하고 선택 policy를 적용하되 무한 재배치하지 않는다.
6. leader는 최종 visible bbox에만 생성, source boundary에서 bbox의 가장 가까운 점까지. 이동0/숨김/빈 text에는 leader0. placement.leader가 기존 layout leader와 중복이면 두 선을 만들지 말고 명시 충돌을 거부한다.

### 고정 인수 사례

- R33-N01: vertical positive bar end(50,20),bbox20×10,gap4 → outside bbox bottom16. negative end(50,100) → bbox top104.
- R33-N02: stacked [2,3]는 segment별 baseline/end를 사용; 두 labels가 total5 끝을 공유하면 실패.
- R33-N03: donut inner40/outer80,theta0..90 → boundary anchor angle45,r84; text center는 support distance를 더한 값.
- R33-E01: Point insideEnd,Line placement object,gap<0 → 오류.
- R33-L01: font-size edit→fit 재판정;source reverse/Canvas/frame edit→vector 재계산.
- R33-L02: hide 또는 R31 removal 뒤 leader graphics/config0.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
