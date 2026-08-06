# Phase 4 Deterministic Retrieval Report

## 결과

Generated `knowledge/search-index.json`은 combined knowledge와 four bounded LLM routes에서만 생성된다. Action 173개,
recipe 33개, docs route 4개를 `kind:id` pair로 정확히 한 번 포함하며 missing/duplicate는 0이다.

| 항목 | 결과 |
| --- | ---: |
| Action records | 173 |
| Recipe records | 33 |
| Bounded LLM route records | 4 |
| Total unique records | 210 |
| Generated index bytes | 552,425 |
| Default / maximum results | 6 / 10 |
| Maximum query characters / normalized terms | 500 / 32 |
| Maximum result summary / exact read characters | 280 / 16,000 |
| 24 evaluation prompts with an intended core hit in top 10 | 24/24 |
| Largest observed top-10 result payload | 3,404 bytes |

`test/llm/search-cases.json`이 24 task별로 의도된 core action/recipe 후보를 고정한다. 이 file은 scoring oracle이나
reference program을 search source에 넣지 않으며 retrieval test에서만 ranked result를 평가한다.

## Ranking contract

Normalization은 acronym/camelCase, hyphen과 selected compound chart words를 stable tokens로 바꾸고 일반적인 plural을
canonical singular로 맞춘다. Query stopword를 제거한 뒤 다음 weight를 record당 token 한 번에 적용한다.

| Field | Token weight |
| --- | ---: |
| Exact ID/title | 240 |
| Identity token | 30 |
| Title token | 20 |
| Summary/intent token | 8 |
| Guidance/signature token | 4 |
| Relation/backlink token | 2 |

Complete normalized phrase가 identity 안에 있으면 80점을 더하고, matched query-term ratio는 최대 20점이다. 최종 tie는
score descending, `recipe → action → docs`, stable ID ascending 순이다. Exact action name은 240점 우선순위 때문에 kind
tie보다 먼저 action을 선택한다.

## Representative queries

| Query | Leading result |
| --- | --- |
| `createScatterPlot` | `action:createScatterPlot` |
| `scatter plot relationship between horsepower and efficiency` | `recipe:scatterplot` |
| `edit legend layout spacing` | `action:editLegendLayout` |
| `remove a Cartesian x axis` | `action:removeXAxis` |
| `moving average time series` | `recipe:time-series-derivation` |
| `extension semantic graphics` | extension primitives and `recipe:extension-domain-action` |

## 검증과 경계

- Same query repeated result deep identity: passed.
- Combined knowledge/LLM route source SHA-256 and generated drift: passed.
- Blank, stopword-only, oversized query and invalid limit: rejected.
- Unknown kind/ID and path-shaped ID: rejected; arbitrary file read route 없음.
- Exact action, recipe와 four docs records만 read 가능.
- `npm run test:contracts`: 198/198 passed after retrieval integration.
- `npm run package:check`: publish artifact unchanged; `knowledge/`와 Node-only scripts are not package files in Phase 4.
- External model/API calls: 0; network/dependency/browser runtime changes: 0.
