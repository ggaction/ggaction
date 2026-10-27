# ggaction 문서 편집 원본 지도

[종합 보고서](REPORT.ko.md) · [개선 계획](ROADMAP.ko.md)

이 표는 현재 저장소의 source와 generator를 정리한 작업 지도다. 제안된 새 문서 체계가 이미 구현되어 있다는 뜻은 아니다. 출력은 직접 고치지 않고 원본을 수정한다. 이 조사에서는 어느 원본도 변경하지 않았다.

## 수정 목적별 경로

| 수정 목적 | 먼저 읽고 수정할 원본 | 주요 생성물 | 생성·검사 경로 |
| --- | --- | --- | --- |
| README 설명·순서 | `README.md`, 해당 current contract/source | README 자체 | 관련 README focused tests, `test:docs` |
| 일반 설명·tutorial·recipe | 해당 `docs/*.md`, canonical example 및 snippet registry 확인 | HTML, search metadata, LLM bundle | 소유 generator, `test:docs`, build/built checks |
| action의 normative public 설명 | `docs/_sources/action-reference.md`, 해당 current contract | `docs/reference/actions/*.md` | `docs:reference`, `docs:reference:check` |
| 정확한 action signature·type | `types/program.d.ts`, 실제 action/source 계약 | `docs/reference/types.md`, signature 조각 | `docs:signatures`, `docs:signatures:check`, 타입 검사 |
| runtime entry의 함수·반환 타입 | `types/<entry>.d.ts`, `package.json.exports`, `scripts/generate-doc-signatures.js` | `docs/reference/runtime.md` | signatures check, installed consumer; 현재 coverage 공백은 F14 |
| action inventory·관계 | `agent_docs/contract/ACTION_INDEX.json`, current contracts, 관계 source | action catalog/relationships | `contracts:catalog:check`, `contracts:relations:check` |
| action card의 intent·sample·errors | `knowledge/action-intents.json`, `scripts/action-card-source.js`, `scripts/action-card-metadata.js` | `knowledge/action-cards.json`, 이어서 `docs/actions.json` | `contracts:cards` 후 `docs:machine`, 양쪽 check, semantic witness |
| inspection descriptor | action cards + `ACTION_INDEX.json`, `scripts/generate-inspection-descriptors.js` | `src/inspectionDescriptors.js`, `src/core/vocabulary.js`의 생성 블록 | `inspection:descriptors:check`와 관련 실행 tests |
| 차트 예제의 프로그램 | `examples/<example>/program.js`, fixture, `examples/registry.js`, chart catalog | workflow로 등록한 예제의 문서 snippet, 이미지, example index | workflow 대상은 `docs:workflows`; 이미지/index는 `docs:images`, `examples:index:check`; 실행은 executable/installed tests |
| 예제 블록의 setup·fixture | `docs/_data/snippet_programs.json`, `scripts/doc-snippets.js` | `docs/_data/snippet_contracts.json` | `docs:snippets`, executable-programs suite; block 확대는 F21 |
| 갤러리 카드·대표 action·도착 페이지 | `docs/_data/chart_examples.yml` | gallery/tutorial/example indexes, image links | catalog/image tests, metadata/search regeneration, `examples:index`, build/built checks |
| Chart picker의 task·그룹 | `docs/_data/chart_picker.json` + action cards | `docs/api/chart-picker.md`의 생성 영역 | `docs:picker`, generator의 `--check`, action relation/coverage 검사 |
| 페이지 계층·순서·route | `docs/_data/pages.yml`, `navigation_groups.yml` | navigation, breadcrumbs, prev/next, LLM order | page metadata/search/LLM regeneration, built link checks |
| 검색 설명·alias·주제성 | owning page content/metadata, `scripts/generate-doc-search-index.js` | `docs/search-index.json` | `docs:search:check`, actual task-query browser checks |
| 공개 machine copy | `knowledge/*.json/schema`, public declarations, `scripts/generate-doc-machine-artifacts.js` | `docs/actions.json`, schemas/types/resources | `docs:machine:check`, schema 및 dependency closure 검사 |
| LLM routing·bundle | 현재 llms.txt의 curated prefix + page manifest/content, `scripts/generate-llm-docs.js` | llms.txt/full/manifest | `docs:llms`, builder 비교 tests; prefix source 분리는 F24 |
| 문서 버전·release identity | package/site metadata, release contract/baseline, provenance generator | status, contract fingerprint, pinned source links | `docs:provenance` 및 계약 검사; historical baseline 유지 |
| Context7 수집 경로·규칙 | `context7.json`, 해당 docs/current API | 원격 retrieval corpus | readiness tests, 실제 version-specific query smoke test |
| UI·검색 상호작용 | `docs/_layouts`, `_includes`, `_sass`, `assets/js` | built HTML/CSS/JS | build, built checks, keyboard/Axe/responsive browser tests |
| 구현 agent의 현재 구조 설명 | `agent_docs/SECOND_ARCHITECTURE.md`, 관련 scoped AGENTS | current task map | architecture/source ownership 대응 검사, history와 분리 |

정확한 default나 조건을 타입에서 자동 추론할 수 있다고 가정하지 않는다. 설명 변경은 해당 runtime/current contract와 실행 사례까지 대조한다. 표의 명령은 대표 경로이며, 동기화해야 할 출력은 변경 범위에 따라 달라진다.

## 네 가지 대표 편집 절차

### 설명의 오타나 잘못된 문맥

페이지가 authored인지 generated인지 먼저 확인한다. authored라면 해당 Markdown을, generated라면 source notice가 가리키는 원본을 수정한다. 영향받는 search·LLM 출력이 생성되는지 확인하고 링크/anchor 변화가 있으면 built checks를 수행한다. 라이브러리 runtime suite를 무조건 전부 반복할 필요는 없지만 본문의 동작 주장을 바꿨다면 관련 실행 근거는 필요하다.

### 옵션이나 default 설명

현재 구현, public type, current contract의 같은 action을 대조한다. exact signature/required 표와 사람이 읽는 설명의 owner를 구분한다. 행동이 바뀌는 작업이면 타입·계약·예제·cards도 같은 범위로 갱신하고, 문서만 오래된 작업이면 기존 행동을 증명하는 witness를 사용한다. 실제 옵션 추가는 이 보고서의 분석 범위를 넘는다.

### 실행 예제 수정

canonical example와 문서 block의 연결을 확인한다. complete/continuation/alternative 중 무엇인지, 입력 fixture와 target resource를 명시한다. 코드 원문, generated image, expected observable이 같은 프로그램에서 나오도록 한다. 첫 블록만 성공하는 것을 페이지 전체 성공으로 취급하지 않는다.

### Agent 카드 조건 수정

cards JSON을 직접 고치지 않는다. source heuristic 또는 curated metadata owner에서 조건을 수정하고 schema를 검사한다. 그 뒤 상수/field, title-only, 빈 결과 등 해당 조건을 구별하는 실제 호출을 실행한다. 카드끼리 같은 텍스트인지 확인하는 검사만으로 의미 정확성을 판단하지 않는다.

## 현재 체크 명령의 의미

```bash
# 기존 documentation source suite
npm run test:docs

# 기존 generated signature가 원본과 같은지 확인
npm run docs:signatures:check

# 기존 전체 documentation checkpoint: generation을 포함한다
npm run docs:verify
```

`docs:verify`는 read-only 검사 명령이 아니다. provenance·예제·이미지·metadata·LLM 산출물을 갱신한 뒤 검사한다. Node/Ruby/bundle/Chromium 요구는 `docs/README.md`를 따른다. 이미 CI에는 생성 전 freshness 검사가 있으므로 향후 local check/write 흐름을 정리할 때 이를 재사용한다.

## 제안하는 page ownership metadata

기존 page manifest를 확장하여 다음 정보를 보유하게 하는 방안을 권한다. 아래는 새 schema를 확정한 것이 아니라 필요한 의미의 목록이다.

- authored/generated 여부와 authoritative source.
- owner generator 및 최소 검사.
- 정확한 행동의 normative reference인지, 설명·recipe·routing인지.
- 관련 action IDs, example/block IDs, type entry.
- 배포 URL과 editor/source URL.
- 현재 contract identity와 연결되는 version scope.

이 정보로 사람의 Edit/Source 링크, agent의 patch routing, 영향받는 검사 목록을 함께 만들 수 있다. 매 페이지에 동일 규칙을 수기로 복제하지 않는 것이 중요하다.
