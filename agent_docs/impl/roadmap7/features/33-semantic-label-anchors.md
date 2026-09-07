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
- inside text의 measured bounding box가 해당 item geometry에 안 들어가면 hide(기본), outside(해당 경계 밖 재배치), allow(overflow 허용). Arc는 bounding rectangle이 아니라 annular sector 안에 text bbox의 모서리가 있는지 검사; 긴 text 자동 축소 금지.
- collision layout은 anchor 후보 뒤에 적용. leader는 displaced visible labels에만 draw; hide/empty label은 line도 없음. explicit dx/dy는 semantic anchor 계산 뒤 더한다. 지원 불가능한 family/anchor/overflow 조합은 사전 오류.

## 저장 결과와 생명주기

requested placement는 label owner config, resolved point/tangent/text align은 materialized result. source bounds/stack/range/orientation/polar frame가 변하면 다시 계산한다. leader는 label-owned graphic이며 source mark가 아니다. text metrics는 renderer마다 임의 추정하지 않고 현재 common text metrics를 사용한다.

## 구현 순서와 action 계층

1. family별 supported anchor 표를 validators와 테스트 data로 고정.
2. source final item → anchor point/outward vector/allowed geometry를 pure adapter로 계산.
3. text measurement → inside-fit policy → dx/dy → existing collision solver 순으로 배치.
4. leader ownership/remove/theme/style/Canvas/facet lifecycle 연결.

## 독립 oracle와 인수 테스트

- vertical bars +5/-5: outsideEnd가 각각 value end에서 위/아래4px. reverse y에서도 final geometry에 맞음.
- stacked segments[2,3]는 두 segment에 각각 center/end; total5 끝에 두 라벨을 겹치지 않음.
- donut inner40 outer80 theta[0,90]의 outsideEnd는 theta45 ray radius84. polar center 이동에도 같이 이동.
- 아주 작은 segment: hide → graphic0, outside → 바깥, allow → 기존 anchor. leader false/true와 R31 cleanup.
- text font 크기 edit 후 fit 재판정, collision solver 이동 후 leader endpoint 갱신; unsupported Point insideEnd 오류.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
