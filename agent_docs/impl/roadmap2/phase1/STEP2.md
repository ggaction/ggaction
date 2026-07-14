# Roadmap 2 — Phase 1 Step 2: Scale, Shape and Palette Primitives

## 목표

첫 implementation batch의 목표 output을 raw semantic/graphic action으로 만들고 네 primitive variant를
한 번에 검토할 수 있게 gallery에 올린다.

## 진행 상태

- [ ] `scale-reverse` reference values와 primitive program
- [ ] `point-shape-diamond` geometry와 primitive program
- [ ] `shape-vocabulary` 12-category fixture와 primitive program
- [ ] `categorical-palette` resolved color fixture와 primitive program
- [ ] 각 variant의 exact target user-facing call chain metadata
- [ ] Primitive-only PNG generation과 gallery status
- [ ] Browser desktop/mobile, image load와 console/page error 확인
- [ ] Gate A 사용자 visual confirmation
- [ ] STEP 상태, conceptual commit와 push

## Primitive variants

### `scale-reverse`

Baseline의 x domain은 유지하고 final x range만 뒤집는다. Points, x ticks, labels와 vertical grid가 같은
scale direction을 사용해야 하며 y와 categorical color는 바뀌지 않는다.

### `point-shape-diamond`

모든 point를 동일한 diamond path로 만든다. Radius/size 의미는 circle과 동일 target area로 정규화하고
position, fill과 opacity는 보존한다.

### `shape-vocabulary`

유효한 첫 12개 row와 unique `Name` domain을 사용해 canonical 12개 shape를 모두 표시한다. Primitive는
semantic shape token이 아니라 circle/rect/path로 완전히 materialize된 heterogeneous children을 저장한다.

### `categorical-palette`

Origin domain order는 유지하고 `set2` palette의 concrete colors를 points와 categorical legend에 동일하게
적용한다. Public target은 palette option을 최초 `encodeColor`에 전달하므로 reassignment 구현에 의존하지
않는다.

## 검증 기준

- 아직 없는 user-facing action을 primitive helper로 숨기지 않는다.
- Reference value 계산은 production resolver를 호출하지 않는다.
- Shape/palette legend variant는 충분한 explicit right margin을 사용하고 Canvas를 자동 확장하지 않는다.
- Gallery는 네 variant 모두 `Awaiting visual confirmation`으로 표시한다.
- Approval 전에는 public declaration, action 구현 또는 user-facing PNG를 추가하지 않는다.

## 승인 게이트

네 primitive를 한 gallery에서 사용자에게 제시한다. 하나라도 수정되면 해당 primitive/reference/metadata를
먼저 갱신하고 Gate A를 다시 통과한다.
