# STEP 1 — 핵심 primitive와 Canvas scatterplot

## 목표

Immutable `ChartProgram`을 만들고, 세 primitive action으로 cars scatterplot을
구체화한 뒤 Canvas에 렌더링하는 가장 작은 end-to-end 구현을 완성한다.

이번 단계에서는 x, y, color 값을 미리 계산한다. Scale, encoding, guide와
상위 domain action은 이후 STEP에서 구현한다.

## 프로젝트 구조

```text
src/
  index.js
  core/        # ChartProgram, immutability, action trace, validation
  actions/     # editSemantic, createGraphics, editGraphics
  renderers/   # Canvas renderer
test/
  acceptance/  # 전체 cars scatterplot program
  unit/        # core, primitive, renderer test
  helpers/     # mock Canvas와 scatterplot 값 계산
  programs/    # test가 불러 실행하는 독립된 사용자 작성 코드
examples/      # 브라우저 Canvas 예제
docs/          # 현재 public API와 core concept
data/cars.json
```

JavaScript ESM과 Node 내장 test runner를 사용한다. 현재 필요성이 확인되기
전에는 runtime dependency를 추가하지 않는다.

## 구현 순서

1. **프로젝트 기반을 만든다.** Package, module 경계, test command와
   placeholder export를 만들되 실제 동작은 구현하지 않는다.
2. **전체 test program을 먼저 작성한다.** `cars.json`을 읽고 x 또는 y가
   없는 행을 제거한 뒤 x/y/color를 미리 계산한다. 전체 primitive chain과
   예상 semanticSpec, graphicSpec, trace, Canvas 호출을 정의하고 acceptance
   test는 통합이 끝날 때까지 skip한다. 실제 사용자 작성 코드는
   `test/programs/`의 독립 파일에 두고 acceptance test가 import해 실행한다.
3. **Immutable program과 action trace를 구현한다.** Canonical empty spec,
   structural copy, 저장 값 freeze, virtual trace root, `action()`과 nested
   action 기록을 구현한다.
4. **Primitive를 하나씩 구현한다.** `editSemantic`, `createGraphics`,
   `editGraphics` 순서로 구현하고 각각 validation, immutability, trace를
   test한다.
5. **최소 Canvas renderer를 구현한다.** Concrete `canvas`와 `circle`만
   지원하며 renderer는 `graphicSpec`만 읽는다.
6. **Vertical slice를 완성한다.** Acceptance test를 활성화하고 392개 circle,
   세 가지 Origin 색상과 브라우저 Canvas 예제를 확인한다.

## 진행 상태

- [x] 프로젝트 기반과 module 구조
- [x] 전체 acceptance test program
- [x] Immutable program과 action trace
- [ ] `editSemantic`
- [ ] `createGraphics`
- [ ] `editGraphics`
- [ ] 최소 Canvas renderer와 vertical slice

각 항목은 관련 test와 문서를 함께 갱신하고, 하나의 집중된 commit으로
push한 뒤 다음 변경을 시작한다. 세 primitive는 각각 별도로 commit한다.

## Test program 구조

```text
chart()
├─ editSemantic(dataset[cars].values)
├─ editSemantic(layer[points].mark.type = point)
├─ editSemantic(layer[points].data = cars)
├─ createGraphics(canvas)
├─ editGraphics(canvas.width)
├─ editGraphics(canvas.height)
├─ editGraphics(canvas.background)
├─ createGraphics(points, circle, length = 392)
├─ editGraphics(points.x = 미리 계산된 값)
├─ editGraphics(points.y = 미리 계산된 값)
├─ editGraphics(points.fill = 미리 계산된 값)
└─ editGraphics(points.radius = 3)

render(program, canvasContext)
```

값 계산 helper는 test와 example에만 두고 library API로 노출하지 않는다.
`render()`는 authoring action이 아니므로 trace에 기록하지 않는다.

## 문서화

- 영어 `README.md`: 프로젝트 목적, 설정, cars 예제, user-facing `chart()`와
  `render()`를 설명한다.
- 영어 `docs/` 위키: 문서 홈과 `ChartProgram`, `action()`, 세 primitive, trace,
  immutability와 semantic/graphic 경계를 설명한다.
- 모든 내부 helper를 개별 문서화하지 않는다.
- `agent_docs/INITIAL_ARCHITECTURE.md`는 초기 설계 기록으로 유지한다.
- 구현과 관련 문서의 갱신은 항상 같은 conceptual change에서 병행한다.

## 제외 범위

- `createCanvas`와 다른 domain-specific authoring action
- Scale과 encoding action
- Axis, legend, guide
- Semantic-to-graphic 자동 컴파일
- SVG와 다른 rendering backend

## 완료 조건

- Skip된 acceptance test 없이 모든 test가 통과한다.
- 모든 update가 이전 `ChartProgram`과 caller input을 보존한다.
- Trace 순서가 primitive program과 일치하고 큰 값 배열은 기록하지 않는다.
- `graphicSpec`에 circle의 최종 concrete property가 저장된다.
- Renderer가 semantic state, context, trace를 읽지 않는다.
- 브라우저 예제에 392개 circle이 세 가지 색상으로 렌더링된다.
- 모든 집중된 commit이 push되고 명시적으로 보존한 사용자 변경 외에는
  worktree가 clean하다.
