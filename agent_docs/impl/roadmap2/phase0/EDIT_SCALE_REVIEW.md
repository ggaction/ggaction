# `editScale` Contract Review

## 상태

사용자 검토 대기. 이 문서는 아직 accepted Planned contract가 아니며 구현을 승인하지 않는다.

## 필요한 이유

Roadmap 2 Phase 1의 `encodeColor`, `encodeShape`, `encodeSize`, `encodeX`와 `encodeY` reassignment는
같은 named scale의 domain/range/policy를 안전하게 변경할 공통 action이 필요하다. 각 encoding이
scale edit validation과 rematerialization을 복제하면 shared consumer가 서로 다르게 처리된다.

## 권장 첫 계약

```typescript
editScale({
  id?: UserId;
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly unknown[];
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
  unknown?: unknown;
}): ChartProgram;
```

### Selection

- `id`가 있으면 existing named scale을 선택한다.
- 생략하면 current scale 또는 eligible scale이 정확히 하나일 때만 추론한다.
- 후보가 없거나 여러 개면 explicit ID를 요구한다.

### Editable properties

- 첫 implementation은 existing scale type을 유지하고 domain, range와 mapping policies만 수정한다.
- `type` 변경은 허용하지 않는 것을 권장한다. Type 변경은 consumer compatibility와 semantic meaning을
  함께 바꿀 수 있으므로 새 scale을 만들고 encoding reassignment로 명시적으로 rebind하는 편이 안전하다.
- Empty edit는 오류다. `undefined`는 property 삭제 의미로 사용하지 않는다.
- Auto resolution으로 돌아가려면 domain/range에 명시적으로 `"auto"`를 전달한다.

### Precedence

- Explicit domain은 `zero`와 `nice`보다 우선하며 stored policy는 유지하되 explicit bound를 바꾸지 않는다.
- Domain을 `"auto"`로 되돌리면 stored `zero` 다음 `nice` 순서로 resolved domain을 다시 계산한다.
- Explicit range는 Canvas/palette auto resolution보다 우선한다.
- `reverse`는 최종 auto/explicit range resolution 뒤 적용한다.
- `clamp`와 `unknown`은 domain/range를 변경하지 않고 mapping behavior만 바꾼다.

### Atomic validation and effects

- 전체 patch를 먼저 normalize하고 모든 shared consumer/channel compatibility를 검증한다.
- 실패하면 이전 `ChartProgram`의 semantic, graphic, context와 trace를 그대로 유지한다.
- 성공하면 scale semantic state를 한 번 수정하고 registered materialization plan을 호출한다.
- Plan은 scale consumers, related axes/grids와 legends를 순서대로 deduplicate해 rematerialize한다.
- Existing named scale과 consumer를 자동 삭제하거나 다른 scale로 자동 rebind하지 않는다.

## 사용자 결정이 필요한 항목

1. 첫 계약에서 `type` 변경을 금지하고 새 scale + rebind만 허용할지.
2. `unknown`을 첫 implementation에 포함할지, Phase 10 scale vocabulary와 함께 구현할지.
3. `id` 생략 시 current scale inference를 허용할지, 항상 explicit ID를 요구할지.
4. Domain/range에 `"auto"`를 전달하는 방식으로 reset을 통일할지.

이 네 항목이 승인되면 canonical Planned scale contract와 ACTION_INDEX를 갱신하고 Phase 1에서 구현한다.
