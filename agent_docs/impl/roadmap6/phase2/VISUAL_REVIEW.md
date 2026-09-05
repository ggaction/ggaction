# Phase 2 시각 검토 — V1 / V2

## 검토 상태

R6-P2-A 승인 범위에 따라 실행 가능한 primitive 목표 6개를 준비했고 사용자가 **“승인한다”로 V를 승인했다.**
[승인 기록](GATES.md#r6-p2-v--visual-target)을 먼저 갱신한 뒤 여섯 public 흐름을 구현·검증했다.
현재 source는 `3a4ca3b59cd604cd2456b2d196e3edd73d24e303`이며 실제 source/input/call/PNG/pixel hash와
plot ink 수치는 [public-visual-results.json](public-visual-results.json)에 있다.
W1 시점의 primitive 승인 증거 [visual-results.json](visual-results.json)은 별도 역사 기록으로 보존한다.

- [Series identity 차트 계약](../chart/series-identity.md): 나라별 4 paths / tuple 8 paths / 독립 width·opacity.
- [Temporal input 차트 계약](../chart/temporal-input.md): 같은 1000/2000을 timestamp/year/auto로 해석.
- [검토 화면](../../../../.artifacts/roadmap6-authoring/visual-review.html): 실제 이미지와 각 variant의 정확한 target chain.
- [V1 단일 manifest](../../../../test/charts/series-identity/manifest.js), [V2 단일 manifest](../../../../test/charts/temporal-input/manifest.js).

## 실제 결과

| Variant | 핵심 결과 | Public 이미지 |
| --- | --- | --- |
| country-color | 나라 4개가 독립된 4 paths, 대륙은 2색 | [PNG](../../../../.artifacts/test/png/charts/series-identity/series-identity/country-color/user-facing.png) |
| tuple-color-dash | 나라 × scenario 8 paths, 실선/점선 | [PNG](../../../../.artifacts/test/png/charts/series-identity/series-identity/tuple-color-dash/user-facing.png) |
| series-appearance | 4 paths에 width 2/4/6/8, opacity .25/.5/.75/1 | [PNG](../../../../.artifacts/test/png/charts/series-identity/series-identity/series-appearance/user-facing.png) |
| timestamp | domain [1000,2000], UTC 00:00:01/00:00:02 | [PNG](../../../../.artifacts/test/png/charts/temporal-input/temporal-input/timestamp/user-facing.png) |
| year | UTC 1000/2000년 1월 1일 | [PNG](../../../../.artifacts/test/png/charts/temporal-input/temporal-input/year/user-facing.png) |
| auto | 기존 숫자 연도 의미 유지; year와 같은 domain | [PNG](../../../../.artifacts/test/png/charts/temporal-input/temporal-input/auto/user-facing.png) |

여섯 primitive/public 쌍의 같은 실행 decoded pixels, graphicSpec, draw order, Canvas calls가 모두 일치한다.
표시하는 public chain도 실제 top-level trace와 비교했다. 최종 normal 2,432/2,432, realistic 167/167,
대표 render 22/22, browser 2/2, installed package와 coverage를 통과했다. 전체 범위는 [X 검토](REVIEW.md)에 있다.
이미지의 제목·범례·축 잘림, 선 4/8개와 시간 라벨을 직접 확인했다.

Series primitive는 독립 partition·appearance oracle의 값을 graphical primitive로 작성한다. Temporal
primitive는 독립 ISO 컬럼을 사용하고 public은 원본 숫자와 temporalUnit을 사용한다. Raw rows, domain,
stored unit, identity, 실제 public invalid input·mode 전환·rematerialization은 normal tests로 별도 검증한다.

## 재현

Repository root에서 아래 명령을 실행한다. Source는 git에 들어 있고 PNG/HTML은 gitignored 결과다.
로컬 파일 경로만 남긴 검토가 아니라 clean checkout에서 다시 생성할 수 있는 package다.

```sh
npm ci
node scripts/run-tests.js charts chart:series-identity chart:temporal-input
node scripts/run-tests.js render test/charts/series-identity test/charts/temporal-input
node agent_docs/impl/roadmap6/phase2/render-review.mjs
```

마지막 명령은 두 manifest를 읽어 PNG, variant.json, 독립 HTML 검토 화면과 hash/ink 결과를 생성한다.
입력 hash는 manifest가 소유하며 normal tests가 fixture와의 일치를 검사한다. PNG는 native text 환경에
의존하므로 evidence의 Node/platform/arch를 함께 기록했다. Generator는 executable source의 clean commit을 요구한다.

## 남은 결정

V와 B는 승인되었고 적용·검증을 마쳤다. 현재 검토 대상은 [R6-P2-X 전체 결과](REVIEW.md)다.
최종 bundle은 full 234,258, Basic 124,897, SVG 6,418 bytes로 각각 승인된 상한 안이다.

Phase 3와 후속 API·배포·PR 작성은 이번 검토의 승인 범위가 아니다.
