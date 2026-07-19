# Roadmap 4 Phase 1 — 기존 runtime 계약 안정화

## 목표

신규 기능의 기반이 되는 세 runtime finding을 공유 materialization 정책에서 수정한다.
각 finding은 외부 최소 재현에서 파생된 독립 회귀 테스트와 sub-gate를 가지며, 수정 뒤 전체
test suite를 다시 실행한다.

## 범위

- `B-002`: size/radius를 생략한 point에도 renderable한 기본 glyph radius를 materialize한다.
- `B-001`: layered rule의 datum full-span 의도와 inherited 반대 endpoint를 모순 없이 처리한다.
- `B-004`: quantitative line의 `encodeX`와 `encodeY` 순서가 최종 상태에 영향을 주지 않게 한다.

## 진행 상태

| 작업 | 상태 | 증거 |
| --- | --- | --- |
| B-002 기본 point radius | completed | Cartesian/Polar, override, resize, Browser mock, Node PNG 회귀 및 전체 1548 tests 통과 |
| B-001 layered datum rule | completed | inherited provenance와 datum full-span 회귀, P1-B 승인 |
| B-004 line encoding order | completed | x/y 순서 동등성과 line family 회귀, P1-C 승인 |
| Phase closeout | completed | 세 재현, coverage, package boundary, 계약 문서와 누적 전체 suite |

## 승인 Gate

| Gate | 상태 | 승인 대상 | 승인 전 차단되는 작업 |
| --- | --- | --- | --- |
| P1-A | approved | B-002 기본 radius, override, rematerialization, Browser/PNG | B-001 구현 |
| P1-B | approved | B-001 inherited endpoint provenance와 datum full-span semantics | B-004 구현 |
| P1-C | approved | B-004 line encoding order 동등성 | Phase closeout |
| P1-Exit | approved | 세 finding 누적 회귀, coverage, package boundary | Phase 2 |

각 Gate는 hard pause다. P1-A, P1-B와 P1-C는 2026-07-19, P1-Exit는 2026-07-20
사용자 승인을 받았다. Phase 2 진입 조건은 충족되었다.

## 결정된 계약

### B-002

- 기본 point glyph radius는 3 logical Canvas pixels다.
- 이 값은 renderer fallback이 아니라 point materializer의 graphical default다.
- 적용 우선순위는 field-driven size, 명시적 constant radius, 보존 가능한 기존 concrete size,
  기본 radius 순이다.
- 불완전한 position에는 기본 size만 먼저 쓰지 않는다. 위치가 완성되거나 사용자가 명시적
  radius를 지정했을 때 concrete size를 materialize한다.
- public action signature와 semantic schema는 바뀌지 않는다.

## P1-B 계약

### B-001

Layered rule이 position을 상속한 뒤 한 축에 datum endpoint를 지정하면 datum이 full-span 의도를
나타내는 것으로 해석한다. Rule 생성 시 상속 source와 channel을
internal mark config에 기록한다. 사용자가 x 또는 y datum을 작성하면 반대 primary channel이
상속값이고 secondary endpoint가 아직 없을 때만 그 semantic branch를 제거한다. Field endpoint는
orthogonal inherited position을 보존하므로 layered interval 구성은 계속 가능하다.

## Exit gate

- 세 finding의 최소 재현이 정상 결과 또는 명시적 authoring error로 바뀐다.
- 0-item silent success와 action-order 차이가 없다.
- 기존 public signature를 깨지 않는다.
- 전체 test, coverage floor, package check와 package consumer test가 통과한다.
- public 문서 영향은 Phase 15 release checklist에 남기고 이 Phase에서 public docs를 수정하지 않는다.
