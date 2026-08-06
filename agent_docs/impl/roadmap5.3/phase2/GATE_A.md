# Gate R53-P2-A — Complete Action Knowledge

## Gate state

`approved`

Approved by the user on 2026-08-06. Gate package checkpoint: `e6c59a83`
(`docs: prepare roadmap 5.3 phase 2 gate`).

Implementation checkpoint: `0d59bd83` (`docs: add complete action knowledge`).
Remote branch: `origin/codex/roadmap5-3-llm-friendly`.

## 승인 대상

1. 173/173 informative English action records in 11 canonical domain files
2. Exact signature/contract/reference join and deterministic `knowledge/index.json`
3. Parameter-note, relation, docs and example validation
4. Existing canonical plus focused executable example coverage and explicit exceptions
5. Public `docs/llms-actions.json` and stable action-router integration
6. Zero-gap, quality, generated-drift, docs and cumulative contract evidence

## Required evidence

- Domain/count/quality and example-coverage report
- Representative action records from chart facade, transform, encoding, guide, edit/remove and extension families
- Focused example execution and trace evidence
- Generated knowledge/public JSON byte identity for the action surface
- Docs generation/build/browser and cumulative contract verification
- Complete checkpoint pushed to `origin/codex/roadmap5-3-llm-friendly`

## 구현 결과

`knowledge/actions/*.json` 11개가 narrative source를 소유하고 generator가 기존 canonical owner와 결합한다.
따라서 source는 exact signature, layer/domain/lifecycle, current contract route와 public reference를 복사하지 않는다.
`scripts/action-knowledge.js`가 다음 오류를 한 번에 차단한다.

- `ACTION_INDEX.json`의 173개 action과 source의 missing/duplicate/domain mismatch
- 선언에서 파싱한 exact signature 부재와 존재하지 않는 parameter-note path
- 이름만 되풀이하거나 중복된 summary, summary를 그대로 반복하는 use/avoid guidance
- 존재하지 않는 related/composition action, Phase 3 전 recipe ID, 깨진 docs file/anchor
- 존재하지 않는 example export, 실행 실패, focused example trace의 대상 action 누락
- source/signature/action-index hash와 generated output drift

Generated `knowledge/index.json`은 action 이름 순으로 stable sort되고, `docs/llms-actions.json`은 같은 action records의
public view다. Public action router는 이 structured document로 연결하며 기존 Markdown reference가 exact behavior의
normative owner라는 경계는 유지한다.

## 정량 결과

| 항목 | 결과 |
| --- | ---: |
| Canonical domain source | 11 |
| Unique current action records | 173/173 |
| Exact validated parameter notes | 443 |
| Existing canonical program examples | 72 |
| Focused executable examples | 100 |
| Explicit standalone not-applicable | 1 (`editSemantic`) |
| Missing / duplicate / domain-mismatched actions | 0 / 0 / 0 |
| Public JSON bytes | 544,119 |

100개 focused builder는 모두 `ChartProgram`을 반환하고 각 trace의 top-level 또는 wrapped children에 연결된 action을
포함한다. `editSemantic`은 extension-authored domain action 내부에서만 의미가 있는 low-level primitive이므로 standalone
chart program 예외 이유를 명시했다. 나머지 172개 action은 모두 executable program export를 가진다.

## 대표 record 검토

| Family | Action | 선택 정보 |
| --- | --- | --- |
| Chart facade | `createScatterPlot` | 두 필드 관계를 점으로 나타내는 완성 산포도 결과와 required x/y 역할 |
| Transform | `createWindowData` | ordered window operation, partition과 source-data 전제 |
| Encoding | `encodeX` | compatible mark/field, target ambiguity와 `removeEncoding` lifecycle |
| Guide | `createGuides` | Cartesian/Polar axes, grid, legend를 함께 만들 때와 focused action 경계 |
| Focused edit | `editLegendLayout` | 기존 legend의 placement/direction/alignment/spacing만 바꾸는 조건 |
| Removal | `removeLegend` | 전체 owner block 또는 selected channel block 제거와 encoding/scale 보존 |
| Extension | `editSemantic` | extension-only primitive 경계와 standalone example 예외 |

Family review에서 자동 초안의 문법 오류와 page-local 표현을 제거했고, summary를 감싼 use/avoid boilerplate 48개와
동일 내용을 부정형으로 반복한 avoid guidance 32개를 실제 선택 기준, 대체 action과 lifecycle 조건으로 교체했다.
Validator가 이 summary 반복을 다시 허용하지 않는다.

## 검증 증거

- `npm run knowledge:actions:check`: generated source/output drift 없음
- Focused action-knowledge contract: 4/4 passed, 100/100 builders executed with trace evidence
- `npm run test:contracts`: 190/190 passed
- `npm run test:docs`: 45/45 passed
- Ruby 3.2.6 Jekyll build: 117 pages generated
- Built docs links/assets/search/metadata: passed; source/public built JSON byte identity: passed
- Desktop/mobile browser, keyboard and accessibility smoke: passed
- `npm run package:check`: bounded package artifact passed; knowledge files는 Phase 5 전 npm package에 포함하지 않음
- `git diff --check`: passed

System Ruby 대신 repository-pinned `mise exec ruby@3.2.6` 환경으로 docs build를 수행했다. Browser test는 sandbox의
loopback listen 제한 때문에 승인된 local test-server 권한으로 재실행해 통과했다.

## 호환성과 경계

- Public chart API, declarations, action behavior, semantic/graphic state와 renderers는 바뀌지 않았다.
- Package `files`, exports, bin과 runtime dependency는 바뀌지 않았고 local MCP package boundary는 Phase 5까지 차단한다.
- Phase 3 recipe records가 생기기 전에는 모든 `recipeIds`를 빈 배열로 검증한다.
- B/C external paid evaluation, PR Ready/merge, publish/deploy/release는 승인 범위가 아니다.

## Approval effect

승인하면 Phase 3의 high-coverage structured recipe authoring과 173-action recipe classification을 시작할 수 있다.
Retrieval/MCP, B/C 유료 LLM 평가, PR Ready/merge, publish/deploy/release는 승인하지 않는다.

## Unblocked work

- `knowledge/recipes/*.json` bulk authoring and final recipe coverage source

## Still blocked

- Deterministic retrieval and MCP implementation
- External or paid B/C LLM runs
