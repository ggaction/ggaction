# Phase 5 W1 — 축 구성요소 lifecycle 계약

[전체 실행 승인](../APPROVAL.md)에 따른 세부 계약이다. 기준은 [52개 baseline 재현](BASELINE.md)이다. W1을 Polar focused 생성, optional component 정렬, Parallel dimension 편집으로 나누어 검증·커밋한다. 이 문서만으로 W1 완료를 주장하지 않는다.

## A1 — Polar focused 생성 공개

구현·검증 결과: [RESULTS_W1_CREATE.md](RESULTS_W1_CREATE.md). 다음 A2/A3와 구분한다.

Full의 기존 wrapped 생성 owner 8개를 direct user-facing Mutable resource로 공개한다. Basic에는 추가하지 않는다. 기존 complete axis의 내부 호출과 standalone 호출이 같은 semantic/config/graphic owner를 사용한다. 별도 semantic schema·자동 compiler·renderer 분기는 없다.

| 공개 액션 | 옵션 |
| --- | --- |
| createThetaAxisLine | scale?, coordinate?, color?, lineWidth? |
| createRadialAxisLine | 위 옵션 + angle? |
| createThetaAxisTicks | scale?, coordinate?, count? 또는 values?, length?, color?, lineWidth? |
| createRadialAxisTicks | 위 옵션 + angle? |
| createThetaAxisLabels | scale?, coordinate?, count? 또는 values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? |
| createRadialAxisLabels | 위 옵션 + angle? |
| createThetaAxisTitle | scale?, coordinate?, text?, offset?, color?, fontSize?, fontFamily?, fontWeight? |
| createRadialAxisTitle | 위 옵션 + angle?, position?: inside/outside |

- 모든 인자는 생략 가능한 단일 옵션 객체다. 기존 guide binding이 있으면 이를 우선하고, 없으면 unique compatible encoding에서 scale/coordinate를 추론한다. 모호한 경우 명시적 ID가 필요하다.
- 생성 대상 component는 없어야 한다. `edit…`는 existing component를 요구한다. `removeThetaAxis`/`removeRadialAxis` 후 독립 생성으로 전체 또는 일부를 복원할 수 있다. Component별 false 제거는 다음 A2에 남는다.
- Tick/label 기본 count, typography, offset, title 추론, 축과 mark의 draw order는 기존 complete axis의 값을 유지한다. Count와 values는 mutually exclusive다.
- Radial angle은 degrees이며 첫 component에서 지정하거나 기본값 90을 사용한다. 뒤에 생성하는 component는 저장된 angle을 따르고 다른 explicit angle은 거부한다. 각도 변경은 기존 `editRadialAxis({angle})`가 모든 component에 적용한다. Theta focused create는 angle과 radial-only title position을 거부한다.
- Title을 먼저 생성해도 요청한 radial angle로 bounds를 검사하고 같은 angle로 렌더해야 한다. Existing aggregate가 먼저 line을 만드는 순서에 의존하지 않는다.
- Incompatible bindings, duplicate component, count/values 충돌, unknown options, invalid style/angle/space는 원자적으로 실패한다. 이전 program과 caller options를 보존한다.

예정 공개 chain:

```javascript
const restored = polarProgram
  .createThetaAxis({ title: false })
  .createThetaAxisTitle({ text: "Direction" })
  .editThetaAxisTitle({ fontWeight: 600 });
```

이는 `polarProgram`이 Canvas와 complete Polar point/line/arc를 이미 가진 fragment다. 정확한 실행 source는 capability test와 public docs에 함께 둔다.

### A1 검증과 visual 범위

기존 완성 축과 똑같은 옵션의 독립 4-component chain을 semantic/config/graphic 및 Canvas/SVG 결과로 대조한다. 두 family, 생성 순서, 생략 title 복원, 전체 remove/recreate, scale/Canvas replay, standalone angle을 검사한다. 기존 모양을 바꾸지 않는 공개 승격이므로 신규 visual target은 N/A이며 기존 Polar guide render pair를 회귀 검사한다. 새 API 선언·Current/index/internal 목록·card·docs·direct-root 실행과 설치 패키지도 동기화한다.

## A2 — Cartesian/Polar optional component 정렬

구현·검증 결과: [RESULTS_W1_OPTIONAL.md](RESULTS_W1_OPTIONAL.md).

기준은 A1 commit `5c9c79df`다. 기존 complete/focused owner를 유지하고 다음 어휘를 네 axis family에 적용한다.

| 호출 | 옵션과 동작 |
| --- | --- |
| createXAxis / createYAxis / createThetaAxis / createRadialAxis | `line?: false \| style`, `ticksAndLabels?: false \| group`, `title?: false \| titleOptions`. 생략/`{}`는 기본 생성, `false`는 해당 구성요소 생성 생략 |
| editXAxis / editYAxis / editThetaAxis / editRadialAxis | `line`, `ticks`, `labels`, `ticksAndLabels`, `title`의 `false`는 기존 구성요소 제거. 객체는 기존 구성요소 편집. 생략은 보존 |
| 마지막 구성요소 제거 | 기존 전체 remove owner로 axis semantic/config/layout을 정리. Grid와 mark는 유지 |
| 복원 | 공개 focused create를 사용. Editor는 없는 component를 만들지 않음 |

- Complete 생성에서 line/ticksAndLabels/title을 모두 false로 두는 요청은 생성할 component가 없으므로 오류다. 축 전체를 생략하려면 `createAxes({x:false,...})`의 상위 선택자를 사용한다. Empty guide/config나 trace child를 만들지 않는다.
- `ticksAndLabels:false` 편집은 ticks와 labels 둘 다 존재해야 한다. 하나만 남았을 때에는 `ticks:false` 또는 `labels:false`를 쓴다. Group과 개별 ticks/labels 동시 지시는 충돌 오류다.
- Group 내부 `ticks`/`labels`는 기존 스타일 객체다. 내부 false를 새로 추가하지 않는다. 독립 생략은 group 전체를 false로 생성한 뒤 원하는 focused component를 생성하는 공개 경로로 표현한다.
- Radial `angle` 편집은 하나 이상의 existing component를 요구한다. 빈 chart의 `editRadialAxis({angle:45})`가 보이지 않는 layout config만 만들던 baseline 오류를 제거한다. 각도 변경과 제거를 함께 요청하면 유지되는 component만 새 각도로 rematerialize한다.
- Theta complete 생성의 의미 없는 `angle`도 focused create와 동일하게 runtime/type에서 거부한다. Radial만 angle을 가진다. 기존 무시되던 Theta 옵션을 오류로 바꾸는 명시적 migration이다.
- Facade의 guide 재사용도 disabled component를 생성하지 않는다. 이미 존재하는 component를 `false`로 선언하면 기존 Polar title 규칙처럼 conflict이며, 삭제하려면 editor를 쓴다. 기존 관계없는 guide/mark를 몰래 삭제하지 않는다.
- Geometry/default/renderer는 유지한다. Visual 목표는 기존 axis에서 선택한 graphic을 제거한 결과이며 새로운 모양은 N/A다. Default render 회귀와 각 family의 partial/restore/replay 및 facade chain을 검증한다.
- Cartesian/Polar component 제거의 primitive/state cleanup은 같은 작은 owner를 사용한다. Root·nested type, Current/docs/cards, trace·atomicity·installed consumer를 함께 갱신한다.

## A3 — Parallel field 축 lifecycle

구현·검증 결과: [RESULTS_W1_PARALLEL.md](RESULTS_W1_PARALLEL.md).

선행 검증에서 dimension 재배치 뒤 axis title/tick/scale binding이 남는 오류를 확인했다. [기존 재계산 교정](RESULTS_PARALLEL_REPLAY.md)을 먼저 검증하며 새 공개 field lifecycle과 구분한다.

기준은 선행 수정 `0ecb462d`다. Full에 다음 다섯 public entry를 제공한다. Basic에는 추가하지 않는다.

| API | 정확한 범위 |
| --- | --- |
| `createParallelAxes({target?, coordinate?}?)` | 기존 internal owner 공개. Stored Parallel line이 유일하면 target 추론. 전체 guide owner가 없어야 하며 모든 dimension의 기본 축을 생성 |
| `createParallelAxis({field, target?, line?, ticks?, labels?, ticksAndLabels?, title?})` | Existing encoded field의 missing component 생성. line/group/title은 false로 생략 가능. 최소 하나를 생성하며 existing selected component는 오류 |
| `editParallelAxis({field, target?, line?, ticks?, labels?, ticksAndLabels?, title?})` | 해당 field의 existing component를 편집. false는 제거, 객체는 편집, 생략은 보존. Group과 개별 ticks/labels 혼합 금지 |
| `removeParallelAxis({field, target?})` | 해당 field의 모든 existing component 제거. 다른 dimension·mark·scale 보존 |
| `removeParallelAxes({target?, coordinate?}?)` | 전체 axis semantic/config/4개 graphic collection 제거. Selector는 stored owner와 일치해야 함 |

Field는 실제 encoded dimension name이며 최소 두 dimension 중 하나를 골라야 하므로 항상 필수다. 공백·점·`__proto__` 같은 field 이름을 resource ID로 취급하지 않는다. Target 생략은 existing guide owner를 우선하고 없으면 unique encoded Parallel line을 추론한다. 다른 owner를 덮어쓰지 않는다.

Line은 `{color?,lineWidth?}`, ticks는 `{count?,values?,length?,color?,lineWidth?}`, labels는 `{count?,values?,offset?,format?,color?,fontSize?,fontFamily?,fontWeight?}`, title은 `{text?,offset?,color?,fontSize?,fontFamily?,fontWeight?}`다. Group은 `{count?,values?,ticks?:tickStyle,labels?:labelStyle}`이며 count/values는 배타적이다. Edit group false는 둘 다 existing이어야 한다. Group 안의 false는 받지 않는다. Create도 group과 개별 ticks/labels 혼합을 금지한다. Individual component 복원은 createParallelAxis에서 나머지 세 component를 false로 지정하므로 sibling style을 보존한다.

현재 defaults를 유지한다: line width1.25, ticks count5/length8, labels left offset9/font11, title above offset20/font13/weight600. Quantitative/ordinal local scale과 기존 mapping을 재사용한다. Auto formatter는 기존 1000단위 k 표기를 유지하고 explicit format은 공통 axis formatter의 지원 값과 검증을 사용한다. Ordinal values는 scale domain member여야 하며 explicit count는 quantitative에서만 지원한다. 값 배열·count는 기존 10,000 item 한도를 적용한다.

`guide.axis.parallel`은 target/coordinate/전체 encoded scales를 유지한다. 새 `titles` 배열에는 explicit field/text override만 저장하고 스타일에는 text를 중복 저장하지 않는다. Materialization config의 field별 component recipe는 style/tick/visibility를 소유한다. 외부 field를 object property key로 쓰지 않는다.

Reencoding에서 field가 유지되면 style/explicit title을 보존하고 순서만 encoded dimension 순서로 재배치한다. 사라진 field의 recipe/title은 제거한다. 전체 생성으로 시작한 axes는 새 dimension도 기본 생성하고, 개별 생성으로 시작한 axes는 선택한 field만 유지한다. 이 생성 범위는 guide config에 한 번 저장한다. 마지막 visible component 제거는 전체 remove owner로 정리하므로 빈 축 상태가 남지 않는다.

Materializer는 기존 네 ordinary collection을 사용하고 field별로 필요한 item만 생성한다. Renderer는 field/axis 의미를 읽지 않는다. Default chart는 기존 primitive/public equality를 유지한다. 새 style 목표는 기존 Cars Parallel chart에서 첫 field의 line color/width와 title text/weight를 변경한 primitive이며, API 구현 전에 작성·render한다. 나머지 lifecycle/count/value/format/ordinal/overflow·오류는 concrete geometry와 state tests로 검증한다.

W1 전체 완료는 A3의 public/type/card/docs/discovery·기본/새 시각 목표·replay/consumer 검증까지 필요하다. 이 계약 작성만으로 D07/F17이나 W1 완료를 표시하지 않는다.
