# Paid Smoke Attempt 4 — v4 무비용 준비 결과

## Immutable identity

| Item | Value |
| --- | --- |
| Repair approval | R54-P5-E Option A |
| Product candidate | `4eb8ce78b705c160394e0a0e0bafc557f54008c0` |
| Plan | `evaluation/compact-authoring-paid-smoke-v4/PLAN.json` |
| Plan SHA-256 | `68006c3b61751108eb91a75a4a8eb5f4a93862a00762efa95d22340673bf7228` |
| Route oracle | `evaluation/compact-authoring-paid-smoke-v4/ROUTE_ORACLE.json` |
| Route oracle SHA-256 | `1b9e7adeb8f29d3f1f43818082ac74beff76c44c533c0d7076b70f3265ce48e8` |
| Credential reads | 0 |
| External model calls | 0 |
| Additional spend | `$0` |

## 원인별 수정

Attempt 3의 9개 실패를 결과 확인 뒤 성공으로 재분류하지 않고 세 원인에 대응하는 별도 schema v3 candidate를 만들었다.

1. 모든 authoring packet은 domain action 앞에 `chart()`, `createCanvas({})`와
   `createData({ values })` prerequisite를 순서대로 제공한다. Benchmark 전용 wrapper나 고정 크기는 주입하지 않는다.
2. 이미 결론 난 limitation은 terminal `unsupported`에, 추가 선택이 필요한 상태는 resource URI를 가진 open
   `unresolved`에 둔다. MCP-first route는 후자에만 문서를 읽는다.
3. Public LLM docs는 한 bounded authoring page에서 bootstrap, histogram, regression, renderer와 canonical unsupported
   identity를 제공한다. Fixed 문구뿐 아니라 새 histogram/regression/renderer/limitation 표현도 같은 family route로 닫는다.

Legend 위치처럼 생성과 동시에 적용해야 하는 옵션은 별도 존재하지 않는 guide를 수정하지 않고 facade action call에 합성한다.
Direct adapter와 installed local MCP는 complete schema v3 packet을 byte-equal하게 전달한다.

## Versioned evaluation boundary

Attempt 1/2/3의 plan, progress와 result는 byte-for-byte 보존했다. v4는 같은 네 task, query, dataset과 correctness identity를
사용하고 terminal/open route semantics만 별도 oracle에 고정한다.

| Task | D route | Calls if first pass |
| --- | --- | ---: |
| Histogram | search → submit | 2 |
| Regression layers | search → submit | 2 |
| PDF + JPG | search → submit; JPG는 terminal | 2 |
| 3D + JPEG | search → explicit renderer resource read → submit | 3 |

Evaluation prompt는 function name과 caller data variable 같은 실행 context만 제공한다. `createData({ values })` 같은 ggaction
정답, canonical unsupported ID 또는 제출할 complete program은 제공하지 않는다.

## 무비용 검증

| Evidence | Result |
| --- | --- |
| Fixed A/B/C/D route dry-run | 16 / 16 pass |
| Dry-run credential reads / external calls / spend | 0 / 0 / `$0` |
| Direct/local-MCP schema v3 byte equality | pass |
| Terminal D route docs reads | 0 |
| Open-decision D route docs reads | 1 explicit resource |
| Fresh query family closure | pass |
| Package artifact | 420 entries; 423,858 packed / 2,172,178 unpacked bytes |
| Installed tarball consumer | pass; MCP cold start 446 ms |
| Browser bundles | full 222,930 / basic 112,984 / SVG 5,760 gzip bytes |
| Public docs | 45 / 45 tests; 115-page build; 320/390/768 browser widths pass |
| Contract suite before Gate package | 206 / 206 pass |
| Full repository suite | 2,100 / 2,100 pass |
| Historical Attempt 1/2/3 hash contracts | pass |

Gate package가 추가한 exact-plan hash contract와 최종 누적 수치는 [`GATE_F.md`](./GATE_F.md)가 소유한다.

## 결론

Candidate는 product, delivery와 unpaid evaluation closure를 통과했다. 아직 실제 모델 correctness 결과는 없으므로 integration,
complete paid evaluation 또는 PR 대상으로 승격하지 않는다. Exact v4 1회 실행 여부는 R54-P5-F에서 별도로 결정한다.
