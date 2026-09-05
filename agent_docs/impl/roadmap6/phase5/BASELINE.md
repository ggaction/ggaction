# Phase 5 현재 동작 조사

상태: 사전 조사 완료, 새 API 미구현. [전체 실행 승인](../APPROVAL.md)을 적용한다. Phase 4의 마지막 고정 source 검증과 병행한 읽기·재현 작업이며, Phase 4 완료를 전제한 production 변경은 하지 않았다.

기준: `7d5982aaa472c234182de917251ff973ff913f1c`, source tree `1e5a95d028132ffaaf6464b95760ea916b85e155`, types tree `2028a79cd493f64f3a739414e20491b5dd783f7a`.
[재현 source](baseline.probes.mjs)와 [관측 결과](baseline-results.json)를 고정했다. **52개 사례, 260회 이전 program·입력 불변 검사**를 실행하고 같은 결과로 replay했다. 실패 사례는 현행 한계의 재현이며 미래 회귀 검사의 기대값으로 사용하지 않는다.

```sh
node agent_docs/impl/roadmap6/phase5/baseline.probes.mjs
```

Source/types가 기준에서 달라지면 재현 script가 거부한다. 이후 구현 결과로 이 과거 snapshot을 덮어쓰지 않는다. 기록된 내부 호출은 관측 목적으로 명시했으며 공개 API라고 제시하지 않는다.

## 확인한 공백과 유지할 동작

| 영역 | 실제 관측 | 다음 구현에서 해결할 것 |
| --- | --- | --- |
| Polar title 복원 | `title:false` 뒤 focused edit는 existing title 오류. 내부 create로는 복원됨 | 8개 line/ticks/labels/title create의 공개 계약·선택·타입·분류를 완성한다 |
| Polar component 제거 | aggregate edit의 line/title/ticksAndLabels `false`는 plain-object 오류 | Cartesian과 동일한 explicit disable 및 component 복원 경로 |
| Polar 기존 동작 | 전체 축 remove→recreate, label style→Canvas/scale edit 성공 | 현재 geometry·단위·추론·style replay를 보존한다 |
| Cartesian create | complete create의 `title:false` 거부; edit로 제거한 뒤 focused create 복원 성공 | complete create의 optional component 어휘를 sibling과 맞춘다 |
| Parallel | 기본 축 resize 성공. `editParallelAxis` 없음 | dimension field를 지정하는 edit와 공개 생성·제거·복원 경로. Raw graphic ID를 요구하지 않는다 |
| Categorical/continuous legend | 네 edge 생성 성공 | 공통 layout에서 기존 출력과 compatibility 유지 |
| Interval/standalone size legend | right만 성공 | kind별 공통 edge layout과 구체 overflow/error 정책 |
| Color+shape+size legend | right/left 성공, top/bottom 거부 | combined content를 유지한 네 edge 배치 |
| Legend recipe revision | `editLegend({channels})` 거부 | 최종 channel 조합을 원자적으로 재작성 |
| Bottom compatibility | position만 주면 label y=572; offset:0이면 y=491, `bottomGrid` false→true | unrelated option이 layout mode를 암묵적으로 바꾸는 현행 경로를 명시적 mode로 다룬다 |
| Label source/format | `createTextMark({source})`와 `.0%` 거부 | explicit source/final content와 공유 formatter. Phase 4 집계 버그 수정과 새 label API를 구분한다 |
| Theme/fitting | `applyTheme`, `fitCanvas` 없음 | W4/W5의 persistent theme 및 opt-in fitting owner |

초기 probe의 combined fixture가 shape 없이 color+size만 인코딩하여 categorical-only 경로를 관측했다. 최종 fixture는 color+shape+size를 명시해 실제 combined recipe를 실행한다. 잘못된 초안을 four-edge combined 지원 증거로 사용하지 않았다.

## W1의 구체화 순서와 rationale

1. **Polar focused create 8개 공개.** 이미 complete axis가 호출하는 같은 wrapped owner를 사용한다. Title을 감췄다가 복원하기 위해 전체 축을 지우고 재작성할 필요를 없앤다. 생성은 missing resource, 편집은 existing resource라는 경계를 유지한다. Radial angle은 aggregate owner의 한 값이며 focused create가 기존 angle과 충돌하면 거부한다.
2. **Cartesian/Polar optional component lifecycle 정렬.** Omission은 기존 기본값·편집 보존, object는 명시적 구성, false는 제거/생성 생략으로 정의한다. Tick과 label의 mode가 다르게 남는 경우를 함께 검증한다. 공개된 focused create가 복원을 담당하므로 edit가 없는 component를 몰래 생성하지 않는다.
3. **Parallel dimension edit.** Field별 count/values, formatter, line/tick/label/title style을 persistent guide owner에 저장한다. Index 기반 선택은 dimension 순서가 바뀔 때 의미가 달라지므로 사용하지 않는다. 지원할 공개 aggregate 생성·제거와 dimension 편집의 정확한 signature, schema/rematerialization/namespace 범위를 W1 계약에서 확정한다.

W2의 stroke-width/opacity와 combined removal 세부 matrix, W3 content·reference domain policy, W4 override/reset 저장, W5 bounded layout 정책은 각 작업의 세부 계약에서 추가 조사한다. 위 52개가 Phase 5의 모든 지원 조합을 검증한 것은 아니다. 새 기능의 Planned 등록·시각 target·public 구현·types/cards/docs·패키지 검증은 남아 있다.
