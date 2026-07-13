# Phase 6 — Step 10: Public Vertical Slice and Cleanup

## 목표

같은 final action chain을 browser example, acceptance, PNG, tutorial에 연결하고 Density
Area chart cycle과 Phase 6를 정리한다.

## 진행 상태

- [x] Browser `index.html`/`main.js` example
- [x] Logical Canvas dimensions와 page status
- [x] Browser console warning/error verification
- [x] Public/primitive 2× PNG physical dimensions
- [x] Ink와 three Origin colors regression
- [x] Density tutorial과 concise recipe
- [x] Data/area/encoding/legend/guide API pages
- [x] Action reference, supported features, navigation, `llms.txt`
- [x] Intermediate program/snapshot cleanup
- [x] Coverage, full CI, all representative PNG regression
- [x] Chart/Phase final-state update
- [x] Final conceptual commits와 push

## Public vertical slice

다음 결과는 `examples/cars-density-area/program.js`의 동일한 action flow를 사용한다.

- Browser example
- Standalone program
- Acceptance test
- Tutorial

Primitive baseline은 extension-level executable oracle로 보존한다. Implementation 단계별
temporary public program은 남기지 않는다.

## 최종 검증

- Browser Canvas는 `720×500`, console/page error는 0건이다.
- PNG는 default pixel ratio 2에서 `1440×1000`이다.
- 세 Origin path와 top legend가 보이고 title/subtitle/legend/plot이 겹치지 않는다.
- Renderer는 `graphicSpec`만 전달받아 같은 output을 그린다.
- General, acceptance, docs, coverage threshold와 기존 모든 chart PNG가 통과한다.
- `GOAL.md`, 이 STEP과 chart contract에 실제 결과/cardinality/coverage를 기록한다.

## 완료 결과

- Browser status: `3 Origin density curves from 406 cars`
- Browser Canvas: logical `720×500`, non-background ink `75,022` pixels
- Browser console warning/error와 page error: 모두 0건
- Origin path colors: `#4c78a8`, `#f58518`, `#e45756` 각각 확인
- PNG: public/primitive 모두 pixel ratio 2의 `1440×1000`
- Unit/acceptance/docs: 403 tests passed
- Render regression: 6 representative chart tests passed
- Coverage: lines 94.46%, branches 89.62%, functions 98.56%
- Temporary browser verification script와 intermediate public program은 남기지 않았다.
