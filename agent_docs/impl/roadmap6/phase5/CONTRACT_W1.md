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

## A2 / A3 — 이후 W1 범위

Cartesian/Polar optional component의 false 생략·제거·복원 어휘를 정렬하고, Parallel에는 field로 선택하는 persistent dimension axis 편집과 생성·제거 경로를 제공한다. 이 두 변경의 exact signature와 visual target은 구현 전에 이 문서에 덧붙인다. A1만으로 D07/F17이나 W1 전체를 완료 처리하지 않는다.
