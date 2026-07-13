# 차트 개발 사이클

## 목적

이 문서는 하나의 목표 차트를 선택하고, 최종 user-facing action API와 그 내부
구현을 완성하는 반복 가능한 개발 절차를 정의한다.

새 차트 개발 사이클을 시작할 때 사용자는 최소한 다음을 제시한다.

- 목표 차트 또는 참고 specification
- 사용할 데이터셋
- 반드시 표현해야 하는 encoding, guide, layout
- 원하는 최종 user-facing API의 방향

이 정보를 바탕으로 차트 문서가 확정되면 agent는 아래 사이클을 순서대로 진행할 수
있다. 하나의 Phase는 1개부터 수십 또는 수백 개까지 여러 차트 개발 사이클을 포함할
수 있다. 차트의 specification은 개별 차트 문서에서 관리하고, Phase의 범위와 실행
순서는 Phase별 `GOAL.md`와 `STEPn.md`에서 상황에 맞게 관리한다.

## 차트 문서와 산출물

각 목표 차트는 다음 경로에 하나의 구현 계약 문서를 둔다.

```text
agent_docs/impl/chart/<chart-name>.md
```

차트 이름은 기능을 식별할 수 있는 kebab-case를 사용한다. 예를 들어 histogram은
`agent_docs/impl/chart/histogram.md`, grouped bar chart는
`agent_docs/impl/chart/grouped-bar.md`에 기록한다. Phase가 여러 차트를 포함하더라도
각 차트의 설명, 최종 API, hierarchy는 서로 독립된 문서에 유지한다.

Phase 운영 문서는 기존 구조를 계속 사용할 수 있다.

```text
agent_docs/impl/phaseN/GOAL.md
agent_docs/impl/phaseN/STEP1.md
agent_docs/impl/phaseN/STEP2.md
...
```

다만 Phase마다 차트 수와 공통 기반 작업이 다르므로 `GOAL.md`의 형식, STEP의 수,
각 STEP의 범위는 고정하지 않는다. Phase 문서는 포함할 차트 문서를 링크하고 전체
방향과 실행 순서를 관리한다. 차트 문서는 Phase 문서와 별개로 해당 차트의 완전한
specification을 유지한다.

완료된 차트 개발 사이클은 다음 실행 가능한 결과를 남긴다.

- Public browser example
- `examples/<chart>/program.js`의 canonical public program
- `test/charts/<chart>/primitive.program.js`의 primitive baseline
- 같은 chart directory의 public/primitive/reference contract tests
- Unit tests
- 같은 chart directory의 `png.render.js` high-resolution regression
- Public tutorial과 API documentation

## 1. 차트 계약 확정

구현 전에 `agent_docs/impl/chart/<chart-name>.md`를 먼저 작성한다. 이 문서는 단순한
아이디어가 아니라 해당 차트의 구현 계약과 완료 조건이다.

### 목표 차트

다음을 명시한다.

- 데이터셋과 사용할 field
- mark와 encoding 의미
- aggregate, bin, stack, group 같은 상호 의존 규칙
- axes, grid, legend, title의 목표
- 기본 배치와 사용자가 바꿀 수 있는 옵션
- 이번 차트 사이클에서 제외하는 기능

### 최종 user-facing API chain

사용자가 실제로 작성할 전체 action chain을 먼저 고정한다.

```javascript
chart()
  .createCanvas({ width, height, margin })
  .createData({ id: "values", values })
  .createBarMark({ id: "bars" })
  .encodeHistogram({ field: "value" })
  .encodeColor({ field: "category" })
  .createGuides()
  .createTitle({ text: "Distribution" });
```

이 chain에는 구현 편의를 위한 private helper나 raw graphic 조작을 노출하지 않는다.
필수로 넣어야 하는 값만 요구하고, 나머지는 저장된 state에서 infer하거나 문서화된
기본값을 사용한다.

### 중요한 action hierarchy

최종 chain의 aggregate action이 어떤 reusable child action을 호출해야 하는지도 함께
계약으로 작성한다.

```text
encodeHistogram
├─ encodeX
└─ encodeY

createGuides
├─ createAxes
├─ createGrid?       # applicable할 때
└─ createLegend?     # categorical encoding이 있을 때
```

Hierarchy에는 다음만 기록한다.

- Public 또는 advanced domain action
- 반드시 재사용해야 하는 meaningful wrapped child action
- 결과에 영향을 주는 호출 순서
- 조건부로 실행되는 child action과 그 조건

단순 structural copy나 계산 helper까지 모두 기록하지 않는다. 반대로 trace에서 보여야
할 의미 있는 작업을 untraced helper로 숨기지 않는다. `?`는 조건부 action을 뜻하며,
순서가 중요한 경우 tree의 순서가 실제 호출 순서다.

Aggregate action은 hierarchy에 적힌 child action의 validation, inference,
materialization을 다시 구현하지 않고 실제 wrapped child action을 호출해야 한다.

### 저장 결과 계약

최종 `semanticSpec`과 `graphicSpec`에서 보장할 핵심 결과를 간결하게 적는다.

- `semanticSpec`: chart의 의미, inferred semantic decision, resource 관계
- `graphicSpec`: renderer가 바로 그릴 수 있는 backend-neutral concrete 값
- Context: 다음 action 해석에 필요한 일시적인 convenience만 저장

Semantic 변경이 graphical 결과에 영향을 주면 담당 action hierarchy 안에서 모든
consumer를 명시적으로 rematerialize해야 한다. Semantic에서 graphic으로 자동
compile되는 단계는 두지 않는다.

## 2. Primitive baseline 작성

기존 action으로 재사용할 수 없는 부분을 먼저 primitive program으로 표현한다.

- 기존 `createCanvas`, `createData`, mark, encoding, guide action은 재사용한다.
- 아직 없는 기능만 `editSemantic`, `createGraphics`, `editGraphics`로 명시한다.
- Primitive program은 helper로 호출을 숨기지 않은 하나의 읽을 수 있는 chain으로 쓴다.
- 계산된 geometry와 style은 concrete `graphicSpec`으로 완성한다.
- Canvas renderer와 high-resolution PNG로 목표 차트가 실제 그려지는지 확인한다.

Primitive baseline은 목표 output과 graphical contract의 기준이다. 이후 high-level
action program이 같은 차트를 설명한다면 concrete `graphicSpec`, rendering order,
renderer calls가 baseline과 일치해야 한다.

Primitive baseline과 해당 test는 `test/charts/<chart>/`에 함께 둔다. Public program은
`examples/<chart>/program.js`를 유일한 원본으로 유지하고 chart test와 render test가
이를 import한다. 통계 계산의 expected values가 필요하면 production 계산을 재사용하지
않는 독립 `reference-values.js`를 같은 directory에 둔다.

## 3. Action 의존성 분해

Primitive chain에서 domain action으로 대체할 부분을 가장 낮은 책임부터 나눈다.

```text
graphical component
→ semantic/graphical atomic action
→ aggregate encoding 또는 guide action
→ 최종 chart chain
```

Action별로 다음을 결정한다.

- 사용자가 반드시 제공할 parameter
- infer 가능한 parameter와 library default
- 읽어야 하는 stored semantic state
- 생성하거나 수정할 semantic path
- 생성하거나 rematerialize할 graphic consumer
- wrapped child action과 trace hierarchy
- invalid, ambiguous, duplicate state의 오류

상호 의존하는 encoding을 따로 호출하면 불완전하거나 오해하기 쉬운 chart가 되는
경우 atomic aggregate action을 제공한다. 예를 들어 histogram은 `encodeX(bin)`과
`encodeY(count, stack)`을 `encodeHistogram` 아래에서 함께 호출한다.

## 4. Phase 계획에 사이클 배치

차트 문서에는 차트 설명, 최종 user-facing API, 중요한 action hierarchy와 저장 결과
계약을 기록한다. Phase의 구현 계획과 진행 상태는 `phaseN/GOAL.md`와 `STEPn.md`에서
관리한다.

```markdown
# Phase N — Step M

## 목표

이번 STEP에서 완료할 Phase-level 결과.

## 진행 상태

- [ ] 작업 단위 1
- [ ] 작업 단위 2
- [ ] Test와 documentation

## 관련 차트

- `../chart/example-a.md`
- `../chart/example-b.md`
```

Phase 문서와 차트 사이클 사이에 고정된 1:1 관계를 만들지 않는다. STEP은 공통 기반
기능, 하나 또는 여러 차트, 통합 검증이나 정리 작업을 다룰 수 있다. 반대로 차트의
완전한 specification을 STEP별로 잘라 분산시키지 않는다. STEP이 어떤 범위를 가지든
관련 차트의 최종 계약은 항상 `chart/<chart-name>.md`에서 한 번에 읽을 수 있어야 한다.

## 5. Bottom-up 구현

각 구현 단위는 다음 순서로 진행한다.

1. 실패하거나 아직 없는 behavior를 test로 명시한다.
2. 필요한 validation과 inference를 책임 action에 구현한다.
3. Semantic state를 immutable하게 저장한다.
4. Wrapped graphical action으로 concrete output을 materialize한다.
5. 기존 consumer가 있으면 명시적으로 rematerialize한다.
6. Action trace의 parent-child 구조와 순서를 검증한다.
7. 관련 public documentation을 같은 변경에서 갱신한다.
8. 전체 test와 필요한 PNG/browser 결과를 확인한다.
9. 관련 Phase STEP의 진행 상태를 갱신하고 하나의 conceptual commit으로 push한다.

High-level action은 얇게 유지한다. Child applicability와 호출 순서는 결정할 수 있지만,
child가 소유한 validation, inference, materialization을 복제하지 않는다.

## 6. Public vertical slice 완성

하위 action이 준비되면 차트 문서에 정의한 최종 API chain으로 public example을
작성한다.

다음 네 결과는 같은 API flow를 사용해야 한다.

- Browser example
- Standalone public program
- Chart-local public contract test
- Tutorial

Public contract test는 최소한 다음을 검증한다.

- 최종 semantic contract
- Concrete mark와 guide cardinality 및 핵심 properties
- 중요한 action hierarchy
- Caller-owned data와 이전 `ChartProgram`의 immutability
- Primitive baseline과 public result의 동등성

PNG regression은 `test/charts/<chart>/png.render.js`에 두며 파일 생성 여부뿐 아니라
physical dimensions, `pixelRatio`, 실제 ink pixel, 대표 색상을 검사한다. 생성물은
gitignored `.artifacts/test/png/`에 쓴다. Browser 검증은 logical Canvas size와
console/page error를 별도로 확인한다.

## 7. 차트 사이클 완료 정리

개별 차트 사이클 완료 전에 다음을 수행한다. 같은 Phase의 다른 차트가 진행 중이어도
완료된 차트는 독립적으로 정리하고 검증하며, 관련 Phase STEP의 진행 상태를 함께
갱신한다.

- 해당 `agent_docs/impl/chart/<chart-name>.md`가 최종 구현 계약과 일치하는지 확인한다.
- 관련 `agent_docs/impl/phaseN/STEPn.md`의 진행 상태를 갱신한다.
- Public action reference, 관련 API page, tutorial, `docs/llms.txt`를 갱신한다.
- 해당 차트 개발 중 사용한 intermediate program과 snapshot test를 제거한다.
- 차트별 public example과 primitive baseline만 대표 프로그램으로 남긴다.
- Phase나 단계 번호가 들어간 test 이름을 기능 중심 이름으로 바꾼다.
- Generated PNG output을 정리하고 최종 regression set만 다시 생성한다.
- `test`, `test:coverage`, `test:render`, CI를 모두 통과시킨다.

## 중요한 결정에서 진행 멈추기

Agent는 다음 사항은 독립적으로 결정할 수 있다.

- 기존 public contract를 바꾸지 않는 private helper와 파일 배치
- 명백한 validation과 오류 메시지의 세부 표현
- 목표 hierarchy를 유지하는 세부 구현 순서
- Test fixture와 regression helper의 구성

다음과 같은 중요한 결정이 발견되면 agent는 추측으로 결정하지 않는다. 현재 구현
진행을 잠시 멈추고, 결정해야 할 내용과 가능한 선택지 및 trade-off를 간결하게 정리해
사용자에게 질문한다. 사용자의 답을 받기 전에는 그 결정에 의존하는 구현, 문서화,
commit을 진행하지 않는다.

- 최종 user-facing API chain 변경
- 중요한 action hierarchy 변경
- `semanticSpec` 또는 `graphicSpec` schema 변경
- 여러 타당한 해석 중 하나가 chart의 의미를 바꾸는 경우
- 현재 차트 범위를 크게 확장하는 새로운 public abstraction
- 기존 규칙과 목표 차트가 충돌하는 경우
- Agent가 중요하다고 판단하고 되돌리기 어렵거나 후속 API 설계에 영향을 주는 결정

Minor하고 reversible한 구현 세부사항은 가장 단순하고 기존 규칙과 일관된 방향으로
진행할 수 있다. 중요한지 확신하기 어렵다면 중요한 결정으로 취급하고 먼저 사용자에게
묻는다.

## 완료 체크리스트

- [ ] 목표 차트와 제외 범위가 명확하다.
- [ ] 최종 user-facing API chain이 구현되었다.
- [ ] 중요한 action hierarchy가 trace에서 그대로 확인된다.
- [ ] Semantic과 graphical 책임이 분리되어 있다.
- [ ] 모든 graphical consumer가 필요한 시점에 rematerialize된다.
- [ ] Primitive baseline과 public example이 남아 있다.
- [ ] Unit, contracts, chart, docs, browser, PNG regression이 통과한다.
- [ ] Public documentation이 현재 구현과 일치한다.
- [ ] 해당 차트의 intermediate artifact가 정리되었다.
- [ ] Conceptual commit이 모두 push되고 CI가 통과한다.
