# Gate R53-P6-D — Complete Unpaid Corrective Evidence

## Gate state

`approved`

Approved by the user on 2026-08-07. Approval-record checkpoint: `pending-record`.

Corrective implementation checkpoints:

- `403330ee` — self-contained generated action/recipe knowledge v2
- `673b6716` — task-oriented deterministic search v2
- `ce9ab851` — Condition B baseline restoration and sanitized trace sidecars
- `66ebd521` — actual MCP discovery adapter and installed-package parity
- Gate package checkpoint: `40ac24ab`
- Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 한눈에 보는 결과

승인된 교정 계약을 코드와 무과금 검증으로 모두 구현했다. 평가의 model, 24 tasks, datasets, oracle, 세 model-call
상한, MCP-call 상한, 공통 prompt와 acceptance threshold는 바꾸지 않았다. 외부 model call과 추가 비용도 발생시키지
않았다.

교정된 경로는 다음과 같다.

```text
Condition B = current docs + structured search/read
Condition C = actual MCP discovery + discovered search tool + discovered resource read

task → search once → read one self-contained action or recipe → submit_program
```

이번 Gate의 통과는 이 경로가 실제 model에서도 개선을 만드는지 **유료 smoke를 제안할 준비가 됐음**만 뜻한다. 성능 개선,
PR 통합 또는 릴리즈를 아직 뜻하지 않는다.

## 1. Self-contained knowledge와 검색 증거

- Generated response schema는 v2이며 action 173개, recipe 33개를 포함한다.
- Recipe 33/33은 public `ggaction` import와 primary action call을 포함한 `exampleSource`를 직접 반환한다.
- Action 172/173은 검증된 실제 call fragment를 반환한다. 명시적으로 not-applicable인 extension primitive 한 개만 `null`이다.
- Action 157개는 signature가 참조하는 local named type의 transitive closure를 반환한다.
- 가장 큰 exact action response는 `createLinePlot` 19,885 bytes로 24KB 계약 안이다.
- Frozen task query 24/24와 별도 paraphrase 24/24가 expected action/recipe를 default top 3에 반환한다.
- 모든 action/recipe exact identity query가 해당 record를 top 1에 반환한다.
- Search result는 schema v2의 ranked result와 one-read `nextStep`을, exact read는 즉시 제출하라는 `nextStep`을 반환한다.

## 2. 평가 격리와 MCP discovery 증거

### Condition B

- A의 `docs/llms.txt` routing text를 선두에 그대로 보존한다.
- A의 `search_docs`, `read_doc`를 유지하고 `search_ggaction`, `read_ggaction`만 추가한다.
- Structured search는 production과 동일한 optional `limit` 1~10/default 6을 노출한다.

### Condition C

- 연결 뒤 실제 `getInstructions()`, `listTools()`, `listResources()`, `listResourceTemplates()`를 호출한다.
- Model-facing `search_ggaction`의 name, description과 JSON Schema는 discovery 결과에서 직접 만든다.
- Exact read는 `read_mcp_resource({ uri })`이며 discovered `ggaction://` template과 일치하는 URI만 허용한다.
- `file:`, HTTP URL, 임의 scheme과 template 밖의 URI는 adapter에서 거부한다.
- Routing input은 실제 server identity, instructions, tool/resource catalog와 `ggaction://overview` 응답을 포함한다.
- Clean-installed package와 source MCP의 complete discovery snapshot은 deep-equal이다.

## 3. Sanitized trace 증거

Mocked B/C runner는 기존 result schema를 바꾸지 않고 run별 `trace.json` sidecar를 남겼다.

| Condition | Sequence | Trace SHA-256 | Bytes |
| --- | --- | --- | ---: |
| B | `search_ggaction → read_ggaction | submit_program | submit_program` | `9c25b461ea27f51baf751906ee56461c31a0a162567acc7f07ae02d0a61bd2cd` | 1,769 |
| C | `search_ggaction → read_mcp_resource | submit_program` | `90e24d8044c881288217a8e5a2496df7652a1a1cfc5b6b7f2682eb94ab411e4a` | 1,357 |

Trace는 round/남은 model call, function name, bounded query 또는 read identity/URI, result identity/byte length와 validation
outcome만 기록한다. Contract test는 API key, provider raw response, complete knowledge source와 complete submitted program이 trace에
없음을 검증한다. Submitted program은 기존 artifact 경계에만 남는다.

## 4. Complete unpaid verification

- Mocked evaluation runtime: 14/14 passed, including B repair와 real local MCP C flow
- Synthetic A/B/C dry-run: 24 tasks × 3 conditions = 72/72 passed
- Search contracts: frozen top-3 24/24, paraphrase top-3 24/24, exact identities top-1
- `npm test`: 2,104/2,104 passed
- `npm run test:coverage`: 94.77% lines, 90.34% branches, 98.53% functions; 70 critical floors passed
- `npm run test:browser`: 53/53 passed
- Documentation: 45/45 source tests, 117 built pages, desktop search와 320/390/768px browser verification passed
- Focused MCP/package/evaluation contracts: 22/22 passed
- `npm run knowledge:check`, `npm run package:check`, `npm run package:mcp-check`, `npm run test:package`,
  `npm run package:bundle`: passed
- Installed artifact: 417 entries, 523,879 packed / 3,556,046 unpacked bytes,
  SHA-256 `0c6aa62c3b68382c1aa43764d1d5dceaf34e16730e19deebec3d732bdacd1caa`, MCP executable `0755`
- Installed/source MCP discovery parity: passed; stderr empty
- Browser isolation: forbidden modules 0; gzip root 222,930 / basic 112,984 / SVG 5,760 bytes
- `git diff --check`: passed

Self-contained offline knowledge가 패키지에 포함되면서 이전 500,000 packed / 3,200,000 unpacked 예산을 실제 artifact가
초과했다. 기능을 제거하지 않고 ceiling을 550,000 / 3,700,000으로 좁게 조정했다. 현재 artifact는 새 ceiling의 각각
95.3% / 96.1%이며 entry ceiling 420 중 417을 사용한다.

## 5. 이 Gate 승인 시 다음 단계

승인하면 대표 task에 대한 B/C 각 1회 유료 smoke의 **별도 R53-P6-E 제안서 작성**만 해제된다. 제안서에는 exact task,
model/settings, 최대 요청 수, token ceiling과 spend cap을 다시 적는다. P6-E를 별도로 승인받기 전에는 API를 호출하지 않는다.

Smoke에서 다음이 확인되어야 full rerun Gate를 제안할 수 있다.

1. search가 한 번 실행된다.
2. self-contained action 또는 recipe를 한 번 읽는다.
3. 세 model call 안에 `submit_program`이 나온다.
4. trace에 source나 secret 없이 위 sequence와 validation outcome이 남는다.

## 승인 전 차단 범위

- External/paid model call과 R53-P6-E smoke 실행
- 48-run B/C full rerun
- Correctness/efficiency benefit claim
- PR preparation/Ready transition, merge와 exact-main verification
- Package publish, docs deployment와 release

## 승인 효과

이 Gate 승인으로 대표 B/C one-run paid smoke의 exact 비용 제안서 준비만 해제되었다. 유료 호출은 별도 R53-P6-E
승인 전까지 계속 차단한다.
