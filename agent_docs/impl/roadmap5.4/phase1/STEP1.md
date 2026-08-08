# Phase 1 Step 1 — Generate Bounded Action Cards

## 진행 상태

- [x] Exact source owners and output schema fixed
- [x] Human intent vocabulary and representative call variants authored
- [x] 173 cards generated deterministically
- [x] Signature, option, route, snippet and payload drift checks added
- [x] Focused contract tests pass
- [x] Cumulative contract suite recorded in Gate package — 170 / 170 pass
- [x] Review target committed and pushed — `73e99a77131adcbff3fdaf242ad816fb32638dd4`
- [ ] R54-P1-A user approval

## 생성 흐름

1. `ACTION_INDEX.json`에서 public action 순서와 lifecycle을 읽는다.
2. TypeScript checker로 `ChartProgram` method parameter를 열어 exact signature, 모든 top-level option과 공통 필수
   option을 얻는다.
3. Canonical action-reference source에서 informative first-sentence summary를 가져온다. Grouped reference나 extension
   primitive처럼 action별 문장이 없는 경우 human term source로 bounded summary를 만든다.
4. Human-owned intent, representative sample과 high-risk branch pattern을 결합한다.
5. Canonical route를 붙이고 card 하나의 UTF-8 serialized byte를 측정한다.
6. 173개 snippet을 declaration against TypeScript compile하고 generated file drift를 확인한다.

## Compactness 규칙

- Card에는 transitive named type definition, full docs body, related-action graph와 complete example variant를 넣지 않는다.
- Exact signature는 declaration 한 줄 projection만 포함한다.
- Option은 top-level `name`과 `required`만 포함한다.
- Call pattern은 기본 1개, 서로 다른 branch를 구분해야 하는 12개 action만 2개다.
- Error/fix는 contract 오해 가능성이 큰 7개 action에만 넣고 card당 최대 2개로 제한한다.
- 모든 action은 snippet을 제공하므로 explicit N/A action은 0개다.

## 완료 조건

- 173 / 173 action coverage, duplicate/missing/unknown 0
- Signature, option requiredness와 route drift 0
- Snippet syntax 및 exact declaration type error 0
- Individual card 3,072-byte ceiling 초과 0
- Generator `--check`, focused test와 cumulative contract suite 통과
- Verified review target `73e99a77131adcbff3fdaf242ad816fb32638dd4`가 remote branch에 push되고
  R54-P1-A에서 승인받기 전 Phase 2를 시작하지 않음
