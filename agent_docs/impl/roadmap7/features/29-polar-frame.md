# R29 — Polar 중심과 frame 반지름·배치

원래 감사 번호: **29**. Primary owner: **Phase 6**. 상태: **Proposed / 구현 전**.
선택된 기능의 구현 의도는 확인되었으나 아래 세부 API/수치 정책의 승인·구현·검증 완료를 뜻하지 않는다.

## 목적과 현재 연결점

Polar frame의 배치를 coordinate 의미로 저작한다. 이미 가능한 theta range/reverse와 구분해 API 중복을 막고, 마크만 이동하고 가이드가 남는 불완전한 구현을 예방한다.

현재 파일(저장소 root 상대 경로):
- `src/grammar/polar.js`
- `src/grammar/polarPaths.js`
- `src/grammar/polarGuides.js`
- `src/actions/charts/polar.js`

관련 항목: R27. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
editCoordinate({target: string, polarFrame: "auto" | {
  center?: {x:number,y:number}; // effective bounds 기준 비율, 각각0..1
  radius?: {unit:"fraction",value:number} | {unit:"px",value:number};
}})
// center 기본 {.5,.5}; radius 기본 fraction1
```

## 값·기본값·오류 계약

- Polar coordinate에만 적용. 다른 coord이면 오류. radius fraction은 중심에서 bounds 네 변까지 최소 거리(availableRadius)의0..1 배수. px는0<value<=availableRadius. center가 경계에 있어 availableRadius0이면 오류.
- 중심 값은 Canvas 전체가 아니라 R27 이후 effective plot bounds 기준. x0=left+width*x, y0=top+height*y. fraction1은 원 전체가 frame에 들어가는 최대 반지름.
- semicycle이라고 자동으로 중심을 경계로 옮기거나 반지름을 늘리지 않는다. 잘리는 원을 허용하는 overflow/viewport 정책은 범위 밖. 반원 사용자도 양수 availableRadius를 가진 중심을 선택한다.
- radius scale range는 [0, availableFrameRadius] 내에 검증하고 theta range/reverse는 기존 scale이 소유한다. 시작/끝 각도 API를 중복 생성하지 않는다.
- polarFrame:auto는 requested center/radius override를 제거하고 기존 center/min-dimension 기본으로 돌아간다. editCanvas 후 fraction은 비례, px는 유지되며 새 bounds에 안 맞으면 atomic error.

## 저장 결과와 생명주기

requested polarFrame은 coordinate가 소유. resolvePolarFrame을 유일한 center/available radius resolver로 확장하고 point/line/arc/radar/rose/axis/grid/label/reference callsites 전체에 전달한다. graphic만 옮기는 post-translation 금지. R43 각 child는 자기 local plot bounds로 재해석한다.

## 구현 순서와 action 계층

1. resolvePolarFrame signature와 모든 callsites inventory 확보.
2. shared resolver를 pure 함수로 확장하고 coordinate validation 통합.
3. 각 polar materializer/guide/semantic anchor R33의 frame 입력을 동일하게 변경.
4. Canvas resize/facet reflow/aspect edits에서 재생성.

## 독립 oracle와 인수 테스트

- bounds[0,0,400,200], center(.25,.5) → (100,100), available100; fraction.8 → radius80.
- theta0, r80는(100,20), theta90 → (180,100); arc와 radial grid도 같은 중심.
- center(.9,.5)는 available40; explicit radius80 거부. 잘못된 center/negative radius/type 오류.
- 기존 auto frame pixel parity, theta range/reverse 보존, aspect+frame 합성, labels/leaders/polar axes 동반 이동.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 완료 조건

- [ ] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [ ] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] 기존 consumer와 새 consumer에 scale/mark/guide/label/selection/facet/Canvas replay를 검증했다.
- [ ] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [ ] 미지원 cell은 이유를 적었다. 이 문서에 명시한 필수 cell을 임의 제외하지 않았다.
- [ ] 해당 Phase의 승인/검증 근거를 기록했다. 추측으로 완료 표시하지 않았다.
