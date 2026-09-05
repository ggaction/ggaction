# Phase 2 시각 검토 — V1 / V2

## 검토 상태

R6-P2-A 승인 범위에 따라 실행 가능한 primitive 목표 6개를 준비했고 사용자가 **“승인한다”로 V를 승인했다.**
[승인 기록](GATES.md#r6-p2-v--visual-target)을 먼저 갱신했으며 새 public API 구현·검증을 진행한다.
실제 source 기준은 W1 commit `4355af45`; runtime source tree·입력·source·호출·PNG·decoded pixel hash와
실제 plot ink 수치는 [visual-results.json](visual-results.json)에 있다.

- [Series identity 차트 계약](../chart/series-identity.md): 나라별 4 paths / tuple 8 paths / 독립 width·opacity.
- [Temporal input 차트 계약](../chart/temporal-input.md): 같은 1000/2000을 timestamp/year/auto로 해석.
- [검토 화면](../../../../.artifacts/roadmap6-authoring/visual-review.html): 실제 이미지와 각 variant의 정확한 target chain.
- [V1 단일 manifest](../../../../test/gates/series-identity/manifest.js), [V2 단일 manifest](../../../../test/gates/temporal-input/manifest.js).

## 실제 결과

| Variant | 핵심 결과 | 이미지 |
| --- | --- | --- |
| country-color | 나라 4개가 독립된 4 paths, 대륙은 2색 | [PNG](../../../../.artifacts/test/png/review/series-identity/country-color/primitive.png) |
| tuple-color-dash | 나라 × scenario 8 paths, 실선/점선 | [PNG](../../../../.artifacts/test/png/review/series-identity/tuple-color-dash/primitive.png) |
| series-appearance | 4 paths에 width 2/4/6/8, opacity .25/.5/.75/1 | [PNG](../../../../.artifacts/test/png/review/series-identity/series-appearance/primitive.png) |
| timestamp | domain [1000,2000], UTC 00:00:01/00:00:02 | [PNG](../../../../.artifacts/test/png/review/temporal-input/timestamp/primitive.png) |
| year | UTC 1000/2000년 1월 1일 | [PNG](../../../../.artifacts/test/png/review/temporal-input/year/primitive.png) |
| auto | 기존 숫자 연도 의미 유지; year와 같은 domain | [PNG](../../../../.artifacts/test/png/review/temporal-input/auto/primitive.png) |

10/10 focused normal tests, 6/6 render tests, 최종 전체 `npm test` 2,381/2,381이 통과했다. Source rows의 membership, literal geometry,
styles, temporal domains/labels, tuple collision 및 ambiguous-value target oracle를 검사했다.
이미지를 직접 확인했다. 제목·범례·축 잘림 없이 선 4/8개와 시간 라벨의 차이를 검토할 수 있다.

새 group.fields와 temporalUnit semantic path, Line field opacity의 public 구현은 아직 없다.
Series primitive는 독립 oracle의 결과를 graphical primitive로 작성하며 temporal primitive는 보조 ISO 컬럼으로
현재 parser를 사용한다. 현재 negative 테스트는 reference oracle에 대한 것이고 public failure 검증은 아니다.
Public 흐름의 trace·semantic identity·constant↔field·edit/rematerialization·엄밀한 types·동일 실행 pixel parity는
승인 뒤 [VALIDATION.md](VALIDATION.md)에 따라 수행한다.

## 재현

Repository root에서 아래 명령을 실행한다. Source는 git에 들어 있고 PNG/HTML은 gitignored 결과다.
로컬 파일 경로만 남긴 검토가 아니라 clean checkout에서 다시 생성할 수 있는 package다.

```sh
npm ci
node --test test/gates/series-identity/contract.test.js test/gates/temporal-input/contract.test.js
node scripts/run-tests.js render test/gates/series-identity test/gates/temporal-input
node agent_docs/impl/roadmap6/phase2/render-review.mjs
```

마지막 명령은 두 manifest를 읽어 PNG, variant.json, 독립 HTML 검토 화면과 hash/ink 결과를 생성한다.
입력 hash는 manifest가 소유하며 normal tests가 fixture와의 일치를 검사한다. PNG는 native text 환경에
의존하므로 evidence의 Node/platform/arch를 함께 기록했다. 승인 후 pixel parity는 반드시 같은 실행끼리 비교한다.

## 이번에 확인할 결정

1. **R6-P2-V**: 위 6개 target의 시각·분할·단위 의미. 승인 후 W2/W3/W4의 해당 public 흐름을 구현한다.
2. **R6-P2-B — 승인·적용 완료**: [full browser budget 결정](BUNDLE_REVIEW.md)은 사용자 “조정한다”에
   따라 full 상한 235,000으로 조정했다. Installed package 검증은 exit 0이며 full 231,731,
   Basic 124,174, SVG 6,418 모두 적용 상한 안이다. 이 예산 승인은 V의 6개 target 승인과 별개다.

Phase 3와 후속 API·배포·PR 작성은 이번 검토의 승인 범위가 아니다.
