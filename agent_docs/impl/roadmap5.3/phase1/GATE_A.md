# Gate R53-P1-A — Stable LLM Documentation Routes

## Gate state

`ready-for-review`

Implementation checkpoint: `dd900b13` (`docs: add stable llm routing`).
Remote branch: `origin/codex/roadmap5-3-llm-friendly`.

## 승인 대상

1. Generated concise `llms.txt`의 canonical source와 4-route entry
2. `/llms/`, `/llms/actions/`, `/llms/recipes/`, `/llms/docs/`의 English routing content
3. 4 KiB entry와 route별 12 KiB/120 lines/40 targets budget
4. Page manifest, full bundle와 search index synchronization
5. Source/output drift, missing link/fragment, duplicate target와 built-site verification

## Required evidence

- Exact generated entry and all four routing pages
- Entry/route byte, line and unique-target report
- Generated docs freshness and focused docs tests
- Jekyll build, built-link/assets/search checks and browser smoke
- Cumulative contract verification
- Complete commit pushed to `origin/codex/roadmap5-3-llm-friendly`

## 구현 결과

`docs/llms.txt`를 자기 자신을 source/output으로 사용하던 구조에서 분리했다.
[`docs/_sources/llms.txt`](../../../../docs/_sources/llms.txt)가 canonical source이고 generator가 page manifest의
registered route로 변환해 `docs/llms.txt`를 만든다.

| Chunk | Bytes | Sanitized lines | Unique targets |
| --- | ---: | ---: | ---: |
| `llms.txt` entry | 1,208 | 23 | 5 |
| `/llms/` overview | 2,447 | 50 | 8 |
| `/llms/actions/` | 2,956 | 53 | 29 |
| `/llms/recipes/` | 2,287 | 41 | 22 |
| `/llms/docs/` | 2,384 | 48 | 20 |

Entry는 overview/actions/recipes/docs와 full fallback만 노출한다. 각 router는 기존 canonical tutorial, recipe,
API/reference로 연결하며 exact signature/default/behavior를 새로 소유하지 않는다. Page manifest가 sidebar order,
full-bundle order와 search discovery를 함께 소유한다.

## 검증 증거

- `npm run test:docs`: 45/45 passed
- Ruby 3.2.6에서 Jekyll build: 117 pages generated
- Built-site links, anchors, canonical URLs, metadata, sitemap, search와 LLM routes: passed
- Desktop/mobile browser, keyboard interaction와 accessibility smoke: passed
- `npm run test:contracts`: 185/185 passed
- `npm run docs:generate` rerun 후 generated source drift 없음
- Entry/route byte, line, target budgets and duplicate-target guards: passed
- `git diff --check`: passed

System Ruby 2.6.10 대신 repository-pinned `mise exec ruby@3.2.6` 환경으로 complete docs verification을 실행했다.

## 호환성과 경계

- Public chart API, signatures, action behavior, renderers와 package boundary는 바뀌지 않았다.
- 기존 canonical docs와 `llms-full.txt`는 유지하고 selective routing layer만 추가했다.
- Action metadata, structured recipes, retrieval와 MCP source는 아직 추가하지 않았다.

## Approval effect

승인하면 Phase 2의 173-action English metadata 작성을 시작할 수 있다. Recipe bulk authoring, retrieval/MCP,
B/C 유료 LLM 호출, PR Ready/merge, publish/deploy/release는 승인하지 않는다.

## Work blocked before approval

- `knowledge/actions/*.json` bulk authoring
- `knowledge/recipes/*.json` and recipe coverage implementation
- Deterministic retrieval and MCP implementation
- External or paid B/C LLM runs
