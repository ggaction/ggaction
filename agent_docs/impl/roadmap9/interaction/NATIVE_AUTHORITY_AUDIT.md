# 오프라인 replay와 native 편집 권한 감사

## 판정

2026-10-30, D1 source `8cd965393` 및 final `8b02f3560` 기준이다. Root의 감사 지시와 기존
remainingApproval을 재사용한다. 새 API·schema·resolver를 추가하지 않는다.

원안은 오프라인 animation replay와 저장한 native chart의 load/edit를 요구한다. Animation
envelope만으로 편집 가능한 ChartProgram이나 그 exact 객체 권한까지 복원한다는 명시는 없다.
따라서 D0/D1 기록에 잠정적으로 남긴 “offline native authority 복원”은 자동으로 구현해야 할
확정 요구가 아니라 현재 제한과 검토 항목이었다. 이를 전체 STEP069/070 완료라고 바꾸지도 않는다.

## 요구와 기존 소유자

| 원문 근거 | 요구 | 기존 구현·검증과 경계 |
|---|---|---|
| [STEP069](../../../../study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-069-export-restore.ko.md), AT55/89 | interacted chart/geo/animation의 offline 재개, 선택·viewport·lineage와 assets 보존, load/edit/replay | native program codec와 animation envelope가 각각 소유한다. 모든 값이 한 animation schema에 들어가야 한다는 명시는 없다. |
| [Animation 계약](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/animation.ko.md) 모듈 경계·Frame export·시험6 | 실제 endpoint payload/bytes, 같은 시각 scene와 네 renderer, 함수·network 숨은 의존 없음 | [Current ANIMATION](../../../contract/current/ANIMATION.md)은 concrete endpoint와 준비된 semantic 의미·font/image bytes를 저장한다. Editable program 전체를 저장한다고 주장하지 않는다. |
| [STEP070](../../../../study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-070-cross-feature-integration.ko.md), AT34/65/80/81/82 | 현재 그려진 geometry, semantic 중복 제거, domain별 focus/routes/worker/restore 통합 | native session과 실제 sample의 결합은 D1, overlap은 D2가 검사한다. Domain 통합 의무는 남아 있다. Offline animation payload의 native 권한 재구성은 명시되어 있지 않다. |
| [Interaction 계약](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/interaction.ko.md) 상태 소유권 | committed ChartProgram과 transient session/host 상태 분리 | focus/history/bindings/host handles는 새 세션에서 명시 재구성한다. 값·ID·digest가 같다는 이유로 임의 program에 권한을 주지 않는다. |

정확한 실행 owner는 다음과 같다.

- `src/animation/envelope.js`는 `{plan,playback}`만 복원한다. Planner의 저장 endpoint는
  renderer-ready graphic/typed meaning이고 original program 참조를 저장하지 않는다.
- `src/animation/frameProvenance.js`는 실제 native endpoint 객체를 받은 공개 계획 생성 시
  `WeakMap` 권한을 등록한다. 저장 복원에 없는 객체 권한을 만들어내지 않는다.
- `src/interaction/hitProgram.js`는 authentic sample의 현재 native owners에 session program이
  정확히 포함되는지를 검사한다. Offline replay frame 거부는 의도된 경계다.
- [Current INTERACTION](../../../contract/current/INTERACTION.md)의 authentic frame 계약은
  위 경계를 공개한다. Frame의 graphicSpec은 네 renderer에서 계속 사용 가능하다.

## Native manifest의 실제 증거

정본은 `scripts/consumers/fixtures/node/manifest.json`과 각 등록 fixture다.

| 등록 사례 | 실제 저장·복원 대상 | 검증 |
|---|---|---|
| `static-delivery/interacted-native-offline-four-formats` | `serializeProgram`의 nested partition/graph/geo, selection, viewport, image/font | import 전 network guard, fresh process load→native edit→undo/redo, scoped keys·revision·lineage, 네 renderer |
| `animation/offline-fresh-process`, `animation/embedded-assets-fresh-process` | `serializeAnimation`의 endpoint graphics/typed 의미와 playback 정책 | 같은 시각 scene/hash, 실제 font/image bytes, 네 renderer, network0 |
| `interaction-animation/fresh-offline-native-scope` | native program을 복원하고 명시 action으로 목표를 만든 새 native plan; 별도로 그 plan의 animation envelope | 두 경로의 같은 시각 scene equality, native frame은 session hit 허용, animation envelope frame은 exact native authority 부재로 거부, 이전 frame/version 유지 |

마지막 사례는 D2에서 same-time equality를 보강했다. Runtime과 archive는 D1과 같으며
`session-overlap-evidence/`에 같은 tar의 Node20/22/24 보충 결과를 보존한다. 다른 source 없는
설치 디렉터리에서 public imports만 사용한다. Library import 이전 guard이며 OS network
namespace를 격리했다는 주장은 아니다.

## 최소 현재 사용 흐름과 남은 범위

편집 재개는 저장한 native program을 `deserializeProgram`으로 복원하고 bindings를 명시하여
`createInteractionSession`을 만든다. 복원한 native from/to와 명시 options로 `planTransition`을
생성하면 새로운 authentic frame은 그 두 실제 program의 권한을 가진다. 기존 API만 사용한다.
별도로 저장한 animation은 `deserializeAnimation` 후 같은 시각의 frame을 렌더링한다.

중단된 임의의 offline sample을 native endpoint로 소급 연결하거나, hash/graphic equality로
서로 다른 program을 신뢰하는 절차는 제안하지 않는다. 그 요구가 별도로 구체화되면 저장할
native 의미·정확한 연결 검증·용량·retention 및 stale/edit 수명을 하나의 설계로 검토해야 한다.
현재 원안만으로 그런 schema 확장을 추가할 근거는 없다.

AT34 overlap의 한정된 검증과 domain별 AT65/80/81/82, 최종 STEP074 qualification을 구분한다.
이 감사는 원래 요구를 삭제하거나 전체 STEP069/070/077을 완료 처리하지 않는다.
