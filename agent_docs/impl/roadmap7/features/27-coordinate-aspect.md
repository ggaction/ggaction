# R27 — 좌표 frame 종횡비와 데이터 단위비

원래 감사 번호: **27**. Primary owner: **Phase 6**. 상태: **Implemented-primary**.
아래 세부 API·수치 정책은 `ded3b073`에서 구현됐다. R29와 합친 Polar·renderer closeout은 Phase 6에 남아 있다.

## 목적과 현재 연결점

동일 단위를 같은 길이로 보이게 하는 분석적 필요와 단순 frame 모양을 구분한다. viewport/clipping(#28), transpose(#26), responsive host 관측(#46)을 포함하지 않는다.

현재 파일(저장소 root 상대 경로):
- `src/grammar/coordinates.js`
- `src/layout/aspect.js`
- `src/materialization/coordinateBounds.js`
- `src/actions/coordinates/edit.js`
- `src/materialization/dependencies.js`
- `src/actions/scales/preview.js`
- `src/actions/scales/edit.js`

관련 항목: 공통 계약 C01–C12만 선행. 파일이 후속 작업에서 이동하면 역할 owner를 찾아 경로를 갱신하고 비슷한 이름의 구현을 새로 중복 생성하지 않는다.

## 권장 공개 API

아래는 설계용 TypeScript다. 참조 타입은 [공통 계약](../COMMON_CONTRACT.md) 또는 current `types/program.d.ts`에서 가져오고, 실제 export 타입 이름은 API 동결 Gate에서 기록한다. API 예제를 현재 라이브러리에서 실행 가능하다고 문서화하지 않는다.

```ts
editCoordinate({target: string, aspect:
  "auto" | {mode:"frame", ratio:number, alignX?:Align, alignY?:Align}
         | {mode:"data", ratio:number, alignX?:Align, alignY?:Align}})
// ratio: frame에서는 width/height, data에서는 pxPerXUnit/pxPerYUnit
// Align="start"|"center"|"end"; 기본 center
```

## 값·기본값·오류 계약

- target은 coordinate ID. ratio finite>0. aspect:auto는 기존 allocated plot bounds를 그대로 사용하며 기존 기본을 바꾸지 않는다.
- frame 모드는 할당 plot rectangle 안에 largest-fit rectangle을 넣는다. ratio2, allocated400×300이면400×200이며 center y 여백50.
- data 모드는 Cartesian linear quantitative x/y만. 사용 중인 모든 positional consumers가 단일 일관된 x/y scale pair를 가져야 한다. domain span dx, dy>0이면 required frame ratio=ratio*dx/dy. temporal/nonlinear/nominal/parallel/polar와 서로 다른 scale pairs는 data-mode 오류.
- domain reverse는 span의 절댓값으로 계산하고 domain 자체는 변형하지 않는다. nice가 반영된 실제 materialized domain 기준. plot에 맞춰 frame을 줄이며 Canvas를 임의 확대하거나 data를 자르지 않는다.
- frame 모드는 Cartesian/Polar 지원, Parallel도 할당 rectangle 비율에 적용 가능. 좌표 배치 → scale range → marks/guides로 흐르며 title/legend padding은 plot 밖에 유지.
- 한 coordinate의 multiple layers는 같은 effective bounds를 공유한다. layer마다 독립 aspect를 추론하지 않는다.

## 저장 결과와 생명주기

requested aspect는 semantic coordinate definition에 저장. allocated bounds와 effective bounds는 분리하고 후자는 계산 결과다. Canvas/axis/legend layout 편집 후 같은 requested aspect로 재계산한다. shrink → guides → shrink 무한 반복을 막기 위해 기존 layout pass의 plot allocation을 입력으로 하는 단일 결정 함수로 구현한다.

## 구현 순서와 action 계층

1. coordinate option whitelist/schema/types 확장, 현재 bounds resolver를 식별.
2. pure resolveAspectBounds(allocated, requested, effectiveDomains)와 모든 coordinate consumers 연결.
3. scale ranges와 polar frame/parallel dimension ranges가 effective bounds 사용.
4. Canvas resize/domain edit/guide layout rematerialization에서 재실행.

## 독립 oracle와 인수 테스트

- data domain x[0,100], y[0,50], ratio1, allocated400×300 → frame400×200, 두 단위 모두4px.
- ratio2이면 frame400×100, pxPerX4/pxPerY2=2. reverse domain에도 동일 bounds.
- frame ratio1 allocated300×200 alignX=end → 200×200 x=100. auto 복구는 original allocated rect.
- log axis/zero span/multiple incompatible xy pairs data-mode 오류. style/header edits로 ratio 유지.
- 점 x+1 이동 거리와 y+1 이동 거리의 비율을 graphic 좌표로 측정.

모든 성공 사례에 입력 options deep-freeze와 이전 program semantic/graphic/trace 불변성을 확인한다. 오류 사례는 입력 state와 trace가 동일함을 확인한다. 시각 변화가 있으면 승인된 primitive/public 동일 실행의 graphic·Canvas·PNG parity 및 SVG/PDF 경로를 [검증 계획](../VALIDATION.md)에 따라 검증한다.

## 구현 고정 명세 — aspect bounds resolver

### 저장·타입

baseline에는 createCoordinate만 있고 editCoordinate는 없다. **editCoordinate는 이 Phase에서 추가하는 신규 Full public action**이다. EditCoordinateOptions={target:string,aspect?:CoordinateAspect,polarFrame?:PolarFrameOptions}로 제안하며 적어도 하나의 patch가 필요하다. type/layers/id 교체는 받지 않는다. R29에서 polarFrame branch를 완성한다. 등록·타입·action contract/card를 기존 옵션 확장으로 누락하지 않는다.

CoordinateAspect="auto"|{mode:"frame"|"data",ratio:number,alignX?,alignY?}를 export하고 editCoordinate의 해당 옵션으로 연결한다. mode가 바뀌거나 aspect object를 전달하면 이전 object와 merge하지 않는다. object 내부 생략 align은 center. aspect 생략은 이전 요청 유지, "auto"는 override 제거다.

requested aspect는 semantic coordinate 하나가 소유한다. layout의 allocated plot과 aspect 결과인 effective plot을 구분한다. 계산된 effective bounds를 다음 실행의 allocated input으로 사용하지 않는다.

### 정확한 수식

allocated={left:L,top:T,width:W,height:H}, requested frame ratio q:
w=min(W,H*q), h=w/q.
align fraction은 start0,center.5,end1.
effective.left=L+(W-w)*ax, effective.top=T+(H-h)*ay.

data mode는 final nice-resolved x/y continuous linear domains의 절대 span dx,dy로 q=ratio*dx/dy. dx/dy와 q가 finite positive여야 한다. reverse는 domain span을 바꾸지 않는다. domain을 늘이거나 mark coords만 scale하지 않는다.

### 적용 범위

frame는 Cartesian/Polar/Parallel. data는 Cartesian의 모든 active positional consumers에서 유일하게 결정되는 linear quantitative x/y pair만. incomplete coordinate나 pair ambiguity, temporal/log/sqrt/band, explicit range가 요청한 unit ratio와 충돌하는 경우 오류다. data-mode의 auto ranges가 effective frame에 맞아야 한다. explicit ranges는 같은 px/unit ratio와 방향을 검증하며 조용히 덮어쓰지 않는다.

layout은 먼저 기존 guide/title/legend occupied allocation을 계산하고 그 결과에 aspect를1회 적용한다. aspect 변경으로 guide measurement가 달라지는 기존 제한 재배치는 original allocation을 다시 입력으로 사용하며 축소된 frame에 재귀 적용하지 않는다. 두 동일 final requests의 Canvas/coordinate edit 순서가 달라도 같은 graphicSpec여야 한다.

### 고정 인수 사례

- R27-N01: allocated(0,0,400,300),x[0,100],y[0,50],data ratio1 → (0,50,400,200), px/unit 4/4.
- R27-N02: 위 ratio2 → (0,100,400,100), px/unit 4/2.
- R27-N03: allocated(10,20,300,200),frame ratio1,alignX:end → (110,20,200,200).
- R27-L01: object→auto → 원래 allocation. 작은→큰 Canvas 왕복 후 최초 frame 동일.
- R27-E01: ratio0,span0,multiple distinct scale pairs,nonlinear axis → 원본 유지 오류.

## 완료 조건

- [x] 위 API의 최단 호출과 explicit 대상 호출, 누락/auto/false/empty 경계를 타입과 runtime으로 동기화했다.
- [x] 위 수치 oracle를 실제 capability test에 구현했고 계획 예제를 기대값 생성기로 재사용하지 않았다.
- [ ] R29와 합친 Polar mark/guide 및 Canvas/SVG/PNG/PDF closeout은 WP6.3에서 검증한다.
- [x] Full 등록·타입 export·Current 계약·catalog·card·관계 trace·MCP·문서·installed consumer를 갱신했다.
- [x] data-mode의 temporal/nonlinear/incomplete/multiple-pair/explicit-range 미지원 cell을 사전 오류로 고정했다.
- [x] 해당 Phase의 승인과 R27 primary 검증 근거를 `phase6/STEP1.md`에 기록했다.
