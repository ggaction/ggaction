# Agent / LLM 문서 감사

검토 기준: `/Users/hj/Desktop/ggaction_chongjeonglee/ggaction`, main `202b7afd4146a691c136964c4cc53f9c37444513`, package `0.0.22`. 2026-10-23 검토. 아래 `file:line`은 이 저장소 상대 경로다. 원본 저장소는 수정하지 않았다.

## 결론

LLM 지원 기반은 상당히 갖춰져 있다. 현재 public docs와 설치 knowledge의 schema/버전/생성 freshness는 일치한다. 문제는 전면적인 오래된 문서가 아니라 **생성된 metadata의 의미 정확성, 독립적인 문서 소비 경로의 완결성, 작성자가 어느 원본을 편집해야 하는지의 명확성**이다. 강한 schema/freshness 검사도 잘못된 source heuristic을 그대로 재생산할 수 있다.

가장 먼저 고칠 항목은 공개 declaration의 누락 dependency, action-card의 잘못된 prerequisite와 모호한 empty-result 계약이다. 다음은 과거 checkpoint 메모가 섞인 current architecture 정리, selective plain-text/action retrieval, 문서 원본→생성물 지도의 확립이다.

## 검증과 확인한 강점

- 293 action cards, item/collection schema v3, packet v5, MCP resource v2, LLM manifest v1이 일치한다. schema의 숫자가 서로 다른 것은 서로 다른 artifact 버전이며 오류가 아니다.
- `buildDocMachineArtifacts()`로 10개 공개 복사본을 메모리에서 생성해 비교한 결과 전부 일치했다.
- `buildConciseLlmDocumentation()`, `buildFullLlmDocumentation()`, `buildLlmManifest()`와 커밋된 출력이 모두 일치했다. 실제 파일을 재생성하거나 수정하지 않았다.
- compact-action-cards, action-hierarchy-discovery, compact-MCP, Context7-readiness 4개 계약 파일의 **26개 테스트가 통과**했다. 이것은 아래 의미적 문제들이 기존 검사에서 발견되지 않는다는 근거이기도 하다.
- `agent_docs/README.md:60-71`은 source/types/tests → current contracts → architecture → active roadmap → history의 권위를 구분한다. `ROADMAP_INDEX.json`의 active pointer는 null이고 문서와 일치한다. 완료 로드맵을 현재 계약으로 오인할 필요가 없도록 라우팅은 이미 존재한다.
- `docs/versioning.md:14-35`는 package metadata version과 실제 설치된 release의 차이를 명시한다. full bundle과 manifest는 contract fingerprint/runtime source를 보존한다.
- MCP는 실행 도구가 아닌 read-only deterministic knowledge server라는 점, placeholder 확인, unresolved/unsupported 구분, negation 한계가 `docs/mcp.md`에 명시되어 있다. 이 제한 자체를 숨겨진 버그로 세지 않았다.

실행 결과: [agent-probe-results.json](agent-probe-results.json), 재현 스크립트: [agent-probes.mjs](agent-probes.mjs), 검사 로그: [agent-contract-tests.log](logs/agent-contract-tests.log).

## 확인된 문제

### A01 · P2 · 공개 TypeScript 파일의 dependency가 빠져 있다

**확인:** `docs/llms.txt:93`이 정확한 public declaration으로 제공하는 `docs/types/program.d.ts:1`은 `./extension.js`에서 `RegisteredExtensionActions`를 import한다. 그러나 `docs/types/`에는 `program.d.ts` 하나만 있다. `scripts/generate-doc-machine-artifacts.js:7-18`도 그 하나만 복사한다.

재현:

```sh
./node_modules/.bin/tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext docs/types/program.d.ts
```

결과: exit 2, `TS2307: Cannot find module './extension.js' or its corresponding type declarations.` 설치 npm package의 타입 오류가 아니라 공개 docs artifact의 dependency closure 오류다. Agent가 파일 하나를 내려받아 검증하거나 extension 타입까지 추적하는 경로가 끊긴다.

**수정:** 최소한 `extension.d.ts`까지 상대 import closure를 배포하거나, 독립 소비용 declaration bundle을 생성한다. 설치용 augmentation 계약을 지워 임시 우회하지 않는다.

**인수 조건:** 공개 배포 대상만으로 구성한 임시 디렉터리에서 `skipLibCheck` 없이 strict compilation이 통과한다. 모든 relative declaration import가 배포 대상에 존재하는지도 검사한다. 현재 snippet test는 `test/contracts/compact-action-cards.test.js:220-247`에서 declaration 하나만 복사하고 `--skipLibCheck`를 켜므로 이 오류를 놓친다.

### A02 · P2 · action-card prerequisite가 conditional behavior를 unconditional requirement로 바꾼다

**확인:** `knowledge/action-cards.json:21734-21738`의 `editTitle`은 `compatible scale or encoding context`를 prerequisite로 제시한다. 하지만 아래 호출은 dataset 0개, scale 0개인 상태에서도 성공한다.

```js
chart().createCanvas({ margin: { top: 80 } })
  .createTitle({ text: "A" }).editTitle({ text: "B" });
```

`knowledge/action-cards.json:9752-9755`의 `encodeColor`는 항상 `field in the target dataset`을 요구하지만, 다음처럼 이름 있는 field가 전혀 없는 데이터에도 상수 색상 인코딩이 성공한다. 이 probe는 field prerequisite의 필요 여부를 확인하며, 완성된 위치 차트라고 주장하지 않는다.

```js
chart().createCanvas().createData({ values: [{}] })
  .createPointMark().encodeColor({ value: "#ff0000" });
```

**원인:** `scripts/action-card-source.js:208-217`은 encoding에 `field` 옵션이 존재하면 field prerequisite를 무조건 붙이고, legend/title family에서는 `createTitle`만 예외로 둔다. Conditional options와 family-level 휴리스틱이 실제 precondition보다 강하다. 공개 `docs/actions.json`에도 동일하게 복제된다.

**영향:** 기계가 카드를 필요조건으로 사용하면 유효한 작성 경로를 불필요하게 거부하거나 dataset/scale을 만들어 넣을 수 있다.

**수정:** branch별 prerequisite를 명시하고, 공통 prerequisite와 `when: field mode` 같은 조건부 prerequisite를 분리한다. `editTitle`과 `removeTitle`의 family 가정도 확인한다.

**인수 조건:** 적어도 constant/field encoding, title-only canvas, independent axis 등 resource context가 다른 대표 호출에 대해 카드의 주장과 실제 실행 결과를 연결하는 semantic witness를 검사한다. 단순히 generator 출력을 다시 비교하는 테스트로 끝내지 않는다.

### A03 · P2 · `allowsEmpty`는 실제 empty result와 충돌하고 의미도 정의되어 있지 않다

**확인:** filterData의 `completionRequirements.allowsEmpty`가 false다. `docs/api/data/filtering.md:74-78`은 empty result가 유효하다고 명시하고, `test/unit/actions/data/filter-data.test.js:214-234`도 이를 검사한다. 감사 probe에서도 1행 입력을 0행 결과로 필터링하는 호출이 성공했다. `filterMarks` 역시 카드에는 false지만 `docs/api/data/filtering.md:187-192`와 `test/unit/actions/data/filter-marks.test.js:479-505`는 유효한 empty view를 지원한다.

**원인:** `scripts/action-card-metadata.js:120-135`의 고정 whitelist를 `277-286`에서 그대로 boolean으로 사용한다. `knowledge/action-card.schema.json:150-163`에는 이 값이 empty input, empty output, geometry 미완성 중 무엇을 뜻하는지 description도 없다.

**수정:** 의미를 먼저 고정한다. 필요하면 `allowsEmptyInput`, `allowsEmptyOutput`, `requiresCompleteGeometry`로 분리하거나 조건부 정책을 쓴다. 모든 false를 일괄 true로 바꾸는 방식은 적절하지 않다.

**인수 조건:** source/derived data, filtered views, position이 아직 없는 marks, empty domain 추론을 각각 분리한 계약 사례를 추가한다. 현재 hierarchy test는 `test/contracts/action-hierarchy-discovery.test.js:124-139`에서 metadata끼리의 동일성 위주로 검사하며 empty semantics는 검사하지 않는다.

### A04 · P2 · current architecture의 요약 지도와 현재 package surface가 어긋난다

**확인:** `agent_docs/SECOND_ARCHITECTURE.md:148-169`의 Public package tree에는 persistence/accessibility/inspection/diagnostics/scene이 빠져 있다. 같은 문서의 `300-324`에는 이 entry들이 서술되어 있다. `342-351`의 JS↔type mapping도 persistence/accessibility/diagnostics/scene을 누락한다. 현재 package export map은 `package.json:46-90`에서 확인할 수 있다.

또한 current architecture는 2,834줄/214,217 bytes이며 첫 설명부터 `9-28`, `50`, `64`, `110-144` 등 과거 패키지 byte 한도·측정 checkpoint가 반복된다. 현재 browser ceiling 표 `406-414`와 별개로 수많은 이전 한도가 본문에 남아 있다. 과거 측정을 삭제해야 한다는 뜻이 아니라, **현재 설계 요약과 변경 증거가 섞여 선택적으로 읽어도 시점을 판별하기 어렵다**는 문제다.

**수정:** 현재 구조 지도와 export/type 표는 package metadata에서 생성하거나 대응 검사로 보호한다. 현재 architecture에는 소유권·state·flow·경계만 남기고 checkpoint 측정/이전 ceiling은 날짜·commit이 있는 역사 기록으로 이동한 뒤 링크한다.

**인수 조건:** export map의 모든 공개 entry가 architecture map에 정확히 한 번 나타난다. 각 현재 numeric claim에는 owning source link가 있고 과거 수치는 current 문장과 분리된다.

### A05 · P3 · LLM index의 보편 규칙이 zero-argument public action과 맞지 않는다

**확인:** `docs/llms.txt:60`의 “Every action accepts one option object”는 `types/program.d.ts:5234`, `5236`, `5607`의 `removeTextMetrics()`, `removeTheme()`, `removeTitle()`와 맞지 않는다. 정확한 타입의 이름은 이미 다른 생성물에서 올바르게 제공된다.

**수정:** “Actions return a new ChartProgram. Pass the single options object when the signature accepts one; some actions take no arguments.”처럼 0 또는 1개의 인수를 표현한다.

**인수 조건:** LLM bootstrap 예시가 zero-argument action에 `{}`를 기계적으로 추가하지 않는다. 정확한 method signature를 생성의 기준으로 삼는다.

### A06 · P2 · README release 준비 예시가 현재 버전보다 뒤처져 있다

**확인:** `README.md:252`는 현재 `0.0.22`를 명시하면서 `273`은 `release:prepare -- 0.0.16 --dry-run`을 제시한다.

**수정:** `NEXT_VERSION`을 설명한 안전한 placeholder 예시로 바꾸거나 현재 package에서 다음버전 예시를 생성한다. 사용자가 직접 정할 릴리스 버전을 자동 추정하라는 의미는 아니다.

**인수 조건:** release guide의 copy/paste 예시가 현재 버전보다 작은 고정 버전을 사용하지 않는다. 동작 확인은 dry-run만으로 한다.

## 설계 개선 제안 — 현재 실패와 구분

### A07 · P2 · MCP가 없는 agent의 selective machine-text 경로를 완성한다

현재 `llms.txt` 9,484 bytes는 HTML route로 안내한다(`docs/llms.txt:3-5`). 전체 plain text는 1,914,002 bytes, action collection은 901,353 bytes, manifest는 109,920 bytes다. Action 단위 selective resource는 MCP의 `ggaction://actions/{name}`에 존재하지만 공개 HTTP에는 단일 collection만 있다. 293개 카드 중 283개 signature가 named option type을 참조하므로 카드만 읽어도 nested type 해석을 위해 다음 읽기가 필요하다. 이것은 모든 agent가 실패한다는 의미가 아니라, 설치/MCP 없는 retrieval client가 큰 HTML/JSON을 읽게 되는 비용 문제다.

제안: 기존 page manifest에서 `/llm/pages/<slug>.md`를 생성하고, `/llm/actions/<name>.json` + 작은 action index를 제공한다. 각 action에 option type dependency/정확한 설명 section route를 연결한다. 기존 full bundle은 archive/offline용으로 유지한다. Manifest에는 chunk ID, absolute canonical URL, plain-text URL, source, hash, version/contract ID와 필요시 byte range를 넣는다. 중복된 hand-maintained tree를 추가하지 않는다.

인수 조건: MCP 없이 정확한 action 하나와 해당 option branch를 읽는 클라이언트가 full catalog/full bundle을 내려받지 않고 작업을 완성한다. 공개 링크·hash·relative type closure를 배포 산출물 기준으로 검증한다.

### A08 · P2 · 작성자가 편집할 원본과 생성물을 구분하는 지도를 만든다

`docs/README.md:26-51`은 전체 검증 pipeline을 잘 설명하지만 “어떤 내용을 어느 source에서 바꾸는가” 지도는 없다. Action source는 `docs/_sources/action-reference.md`, 타입은 `types/program.d.ts`, 카드 intent/sample/error override는 `knowledge/action-intents.json`, 기타 metadata는 `scripts/action-card-metadata.js`, routing은 `docs/_data/pages.yml`, 카드 relationships는 별도 생성 입력에 분산되어 있다(`scripts/action-card-source.js:20-28`, `601-650`).

특히 `scripts/generate-llm-docs.js:197-217`은 출력인 `docs/llms.txt`의 marker 이전 내용을 다시 source로 읽고, marker 이후를 생성한다. 따라서 이 파일은 수작업 원본과 생성물이 섞인 구조이며 `docs:llms`가 생성한다는 안내만으로는 편집 소유권을 알기 어렵다.

제안: `docs/_sources/llms-index.md` 같은 명시적 curated source를 두고 output은 전부 생성한다. `docs/README.md`에 작업별 source→generator→output→check 표와 “페이지 추가”, “옵션 추가”, “예시 수정”, “agent 카드 수정” 절차를 제공한다. `docs:generate` 전체 이전에 실행할 좁은 check 명령도 제공한다.

인수 조건: 처음 보는 contributor가 output을 직접 수정하지 않고 위 네 작업을 재현한다. 두 번 생성했을 때 diff가 없고, source의 sample/type/default 변경이 human page와 card/LLM chunk에 함께 반영된다.

### A09 · P2 · 설치된 extension agent guide를 public 진입점에서 발견할 수 있게 한다

`knowledge/extension-authoring.md:5-8`은 extension repo가 agent에게 이 파일을 명시적으로 읽도록 지시해야 한다고 설명한다. 파일은 package.json:30에 포함되지만 README와 docs에는 파일 이름을 가리키는 링크/안내가 없다. `rg -n 'extension-authoring' docs README.md` 결과가 비어 있다. 좋은 guide가 배포되지만 소비자가 발견할 경로가 약하다.

제안: README의 extension entry, public extension authoring page, llms routing에서 설치 위치와 용도를 명시한다. Chart authoring task packet과 extension engineering guide의 역할 차이를 설명하고, “현재 설치된 version의 guide를 읽기” 예시를 제공한다. Package 내부 지시문을 모든 downstream agent에게 자동 적용한다고 주장하지 않는다.

인수 조건: 저장소 탐색 없이 설치 package + public extension page만으로 guide를 찾고, source version을 확인할 수 있다.

### A10 · P2 · MCP의 bounded workflow에 긴 요청과 실행 오류의 복구 경로를 추가한다

입력 query는 500자 제한이다(`src/mcp/adapter.js:37-41`, `knowledge/task-packet.schema.json:28`). 반면 `docs/mcp.md:94-96`과 `docs/llm-authoring.md:135-143`은 complete exact request를 보내도록 요구하며 이 입력 제한을 설명하지 않는다. 출력 6,144-byte 상한은 문서에 명시되어 있다(`docs/mcp.md:124-126`).

또한 fallback docs 접근은 latest unresolved URI로 제한된다(`src/mcp/adapter.js:193-201`, `docs/mcp.md:200-211`). Action-card의 293개 중 284개는 curated errors가 빈 배열이며 collection의 errorPolicy는 canonical route를 보라고 안내한다. 이 설계는 정상 bounded search에는 명확하지만, **resolved packet을 실행한 뒤 유효값/레이아웃 오류가 발생한 경우**의 agent 복구 절차는 별도로 필요하다. 기존의 static applicability와 실제 실행의 차이를 더 크게 다시 주장할 필요 없이 이 workflow를 연결하면 된다.

제안: input length/oversize error를 문서화하고, 긴 요청을 보존하며 여러 bounded query로 나누는 규칙을 정의한다. 실제 error code→exact action/type/docs section 경로를 제시한다. MCP 프로토콜 정책을 바꿀지 외부 public docs를 사용하는 recovery guide를 둘지는 명시적으로 선택한다.

인수 조건: 500자 초과 요청, 성공 packet 뒤 numeric validation 실패, 레이아웃 실패를 포함한 end-to-end authoring recovery 시나리오에서 요구가 유실되거나 무한 반복되지 않는다.

### A11 · P3 · MCP benchmark의 실험 시점을 주장 바로 옆에 표시한다

`README.md:74-82`, `docs/mcp.md:18-37`의 성능 수치는 source benchmark와 맞으며 과장 보장으로 단정할 근거는 없다. 다만 `benchmarks/llm-authoring-v1/summary.json:5`의 완료일은 2026-08-10이고 `26-28`에 실험 commit이 있다. 현 `0.0.22`/2026-10-23 docs에서 모델의 정확한 이름과 시점은 추가 파일을 열어야 확인된다.

제안: 그림 caption/요약에 날짜, 정확한 모델 ID, candidate contract/version, 고정 24 task 범위를 표시한다. 576은 4조건 전체이고 실제 A↔D 비교는 두 조건이라는 점도 한 문장으로 분명히 한다. 최신 버전을 재실험하지 않았다면 기존 실험을 historical evidence로 유지한다.

인수 조건: 모든 공개 수치가 summary.json에서 생성되고, 그림만 보아도 적용 범위와 시점을 이해할 수 있다.

### A12 · P2 · packageVersion 밖의 contract identity를 모든 agent artifact까지 연결한다

Full bundle/manifest에는 contract fingerprint가 있지만 cards/packet은 주로 packageVersion으로 맞춘다(`src/mcp/adapter.js:206-210`, `docs/mcp.md:230-232`). `docs/versioning.md:16-20`가 설명하듯 같은 package metadata version 아래에도 branch 변화가 가능하다. 현재 artifact 간 실제 불일치는 발견하지 않았다.

제안: packageVersion과 별개로 generated artifact set의 contractId/sourceRef를 card collection, packet, resource catalog에 동일하게 넣고, public fallback URL도 동일 revision으로 연결한다. Schema 변화가 필요한 경우 명시적인 migration으로 처리한다.

인수 조건: 동일한 packageVersion이지만 서로 다른 contractId를 가진 fixture를 혼합하면 consumer가 이를 검출한다. 정상 설치물은 한 identity로 결속된다.

## 권장 content source / delivery 구조

| 의미 원본 | 소비자 | 생성/검증 원칙 |
| --- | --- | --- |
| Current contract + public types + executable scenario | API reference, action card, exact type bundle | 타입·default·conditional precondition·empty policy를 동일 contract witness로 검증 |
| Canonical runnable example program + data | Tutorial/recipe code, image, installed consumer test | 한 프로그램의 코드/설명/이미지 연결 유지 |
| Page manifest + 작은 curated routing source | Human nav, llms index, machine page manifest | 순서/slug/version을 복제해 수작업 유지하지 않음 |
| Narrative Markdown | Human HTML + selective plain text + full archive | 동일 내용의 여러 delivery format, 원본은 하나 |
| Action inventory + semantic metadata policies | 카드 collection + per-action chunks + MCP resources | 구조 freshness 외에 실제 실행을 근거로 semantics 검사 |
| Current architecture | Implementer task map | historical measurement/change records는 분리하고 링크 |

## 검토 범위와 제한

Root/docs/agent_docs/contract AGENTS, README, root/docs llms indexes, full-bundle 생성기, manifest·schemas·machine-copy generator, action-card generator/source/metadata, public type copy와 extension type, local MCP adapter/guide/LLM bootstrap, Context7 config/readiness tests, package export/knowledge packaging, current architecture map와 관련 package/state sections, agent-doc authority/roadmap routing, benchmark record를 검토했다. 16개 current domain contract는 파일 크기/라우팅을 확인하고 본 감사의 재현과 직접 관련된 data/filtering 의미를 public docs·runtime/test와 대조했다. 모든 역사 roadmap의 내용을 현재 사실로 취급하거나 전부 정독했다고 주장하지 않는다. Context7의 실제 retrieval 품질과 site navigation/검색은 부모 감사가 별도로 다룬다.
