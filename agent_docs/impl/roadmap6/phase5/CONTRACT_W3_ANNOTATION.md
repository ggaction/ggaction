# W3 D — createAnnotation

[전체 실행 승인](../APPROVAL.md) 아래 `createAnnotation`을 기존 Text, position scale, mark label layout owner의
create-only facade로 추가한다.

## 공개 계약

공통 option은 `id?`, 필수 `text`, `format?`, Text appearance와 `layout?`이다. Anchor는 다음 세 branch 중
정확히 하나다.

- Mark anchor: x/y/space 없이 `source?`. Explicit source, current eligible mark, unique eligible mark 순서로
  선택하며 final source item마다 constant text를 만든다. Filtered/aggregated mark의 실제 final grain과 anchor를
  `createMarkLabels`에서 재사용한다.
- Data anchor: 기본 `space:"data"`, 필수 x와 y, `source?`. Explicit/current/unique complete Cartesian layer 하나가
  data, coordinate, 두 scale과 field type/temporal unit을 공급한다. x/y datum은 automatic domain에 참여한다.
  source는 생성 시 binding 선택이며 owned child relation이 아니다.
- Plot anchor: `space:"plot"`, 필수 x와 y의 finite [0,1] fraction, `data?`, `coordinate?`. x=0은 왼쪽,
  y=0은 아래다. `<id>-x`와 `<id>-y` linear [0,1] named scale을 만들고 existing empty data도 허용한다.
  source는 받지 않는다.

기본 ID는 `annotation`. Layout omission/false는 명시적 anchor를 보존하고 object는 target을 제외한
`layoutLabels` option이다. Facade는 complete lower child chain을 discarded immutable branch에서 먼저 검증한다.
후속 content/position/style/layout/scale/removal은 `encodeText`, `encodeX/Y`, `editTextMark`, `layoutLabels`,
`removeLabelLayout`, `editScale`, `removeMark`가 소유하며 별도 registry나 editAnnotation을 만들지 않는다.

## 오류와 검증

Text가 없거나 x/y가 한쪽만 있는 입력, anchor branch option 혼합, data anchor의 incomplete/ambiguous/non-Cartesian
source, plot 범위 밖 값, source/data/coordinate 충돌, layout target, invalid style/content는 child effect 전에 거부한다.
Source-owned Text aliases는 data binding 후보에서 제외한다. Caller option, source dataset과 이전 program은 불변이다.

Primitive target은 data anchor (8,9), dx=8, dy=-16인 `Peak · 9.0`이며 W3 Text datum target과 같은 (368,48)이다.
Mark/data/plot branch, aggregate final grain, scale/domain/reverse/resize, category/time, layout replay/leader cleanup,
lower edits/removal, literal semantic/graphic/order/Canvas/PNG, package/types/MCP/browser/docs를 검증한다.
