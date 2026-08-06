# Phase 3 Current Recipe Inventory

## 쉽게 보는 결론

현재 public recipe 19개는 좋은 출발점이지만 action 173개를 task 순서로 설명하기에는 부족하다. Registered public
chart 47개 중 compound-data dashboard를 제외한 46개를 실제 실행했을 때 top-level public call로 직접 등장한 action은
52개였다. Composite action 내부 wrapped trace까지 포함하면 117개지만, 내부에서 실행됐다는 이유만으로 LLM에게 그
action을 직접 호출한 step처럼 설명하면 안 된다.

Exact count와 domain gap은 [`CURRENT_RECIPE_INVENTORY.json`](./CURRENT_RECIPE_INVENTORY.json)이 소유한다.

## 재사용할 canonical task

기존 19개 recipe는 basic relationship/comparison, distribution/statistics, Polar/multivariate, composition/facet,
annotation과 path ordering을 이미 complete runnable program으로 설명한다. 이 source를 structured recipe의 첫
catalog로 재사용한다.

Public chart/example 중 recipe page가 없지만 별도 task 가치가 있는 다음 workflow도 canonical program을 우선 쓴다.

- Polar scatter and donut authoring
- Time-unit and moving-window derivation
- Category ordering and reset
- One-dimensional tick distribution and directional tick comparison
- Point jitter
- Selection, highlighting and release
- Multi-legend layout
- Scale mapping and transforms

## focused recipe가 필요한 gap

다음 항목은 action 하나당 recipe를 만들지 않고 관련 lifecycle을 하나의 recognizable workflow로 묶는다.

- Cartesian axis/grid creation, focused editing, removal and recreation
- Polar axis/grid creation, focused editing, removal and recreation
- Legend/title focused editing and removal
- Mark appearance, encoding and complete-resource teardown
- Ranged/secondary/offset encodings
- Statistical owner revision after initial chart creation
- Facet guide/scale policy revision
- Extension-authored domain action using semantic/graphic primitives

이 분류는 recipe 수를 늘리기 위한 것이 아니다. 각 focused recipe는 ordered actions가 모두 실행되는 complete program과
trace evidence를 가져야 하며, 같은 결과를 설명하는 public recipe와 겹치면 alternative나 lifecycle step으로 합친다.
