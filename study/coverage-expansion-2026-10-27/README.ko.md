# ggaction coverage expansion 조사 산출물

> **저장소 안으로 이전됨:** [새 환경 인계 안내](../TRANSFER.ko.md). 큰 evidence는 repository root에서 `python3 study/restore.py`로 복원합니다. 이 폴더 안의 최신 스크립트는 ggaction checkout을 자동 탐지합니다.

> **최신 목표:** ggaction 자체 설계·기능 구현. Flint 정합성·백엔드 연결·외부 차트 번역은 제외했다. 과거 외부 조사·screening 수치는 참고 자료이며 현재 구현/릴리스 분모가 아니다. 활성 계획은22작업/79시험군, native·사용자 요구30행이다.

기준일 2026-10-27. 새 기능을 구현하거나 원격 저장소를 변경하지 않은 분석·구현 명세다.

- **상세 실행 로드맵:** [ROADMAP.ko.html](ROADMAP.ko.html) / [Markdown](ROADMAP.ko.md) — 77개 실행 카드, 계약·수식·실패 조건·시험·인계 절차.
- **구현자 시작점:** [START_HERE](roadmap/START_HERE.ko.md), [실행 순서](roadmap/EXECUTION_ORDER.ko.md), [기계 판독 계획](roadmap/plan.json), [26개 독립 기대값](roadmap/oracle-fixtures.json).
- **읽기:** [REPORT.ko.html](REPORT.ko.html). 인터넷 없이 열리는 단일 HTML이며, 목차·본문 검색·인쇄를 지원한다.
- **편집/agent 입력:** [REPORT.ko.md](REPORT.ko.md).
- **작업 계획:** [implementation-plan.json](evidence/implementation-plan.json) — 22개 활성 작업, 79개 인수 시험군. 모두 제안 상태.
- **요구사항 원장:** [CSV](evidence/requirements-traceability.csv) / [JSON](evidence/requirements-traceability.json) — 2,311행, 합격 결과가 아닌 source requirement와 작업 연결.
- **원본 전수 비교:** [corpus-original-crosswalk.csv](evidence/corpus-original-crosswalk.csv) — 대표 원본 1,981개.

## 고정된 소스

| 저장소 | 커밋 | 로컬 위치 |
|---|---|---|
| ggaction | `40ec7edead7fc84de05aad31888dd0f7d264a512` | `../..` |
| flint-chart | `a794557384adcc3293a77043f6b9aff1c33d152c` | `sources/flint-chart` |
| chart-llm | `6e3d3e2bf1c30aa6df7b916289f42a6ed7721a24` | `sources/chart-llm` |
| chart-datasets | `58791ace7212cacb98c2b64e3f92280722ab638e` | `sources/chart-datasets` |

다른 컴퓨터에서 재현할 때 동일한 디렉터리 배치로 clone하고 위 커밋을 checkout한다. 현재 작업 중인 ggaction checkout을 강제로 reset하지 않는다. 별도 clone을 사용한다. 소스 커밋이 달라지면 새 조사 디렉터리를 만들어 기존 결과와 비교한다.

## 이번에 실제로 실행한 범위

- ggaction 전체 298개 action과 11개 entry point inventory; 핵심 probe 19개.
- Flint registry 51이름, 154개 backend-template 조합 컴파일: 153 성공, Excel Waterfall 명시적 미지원 1. 생성된 956 fixture 전체를 렌더링한 것은 아니다.
- chart-llm 추적 JSON 25,024개 parse/census, 루트 차트 후보 24,957개의 선언 스키마 구조·타입 검사. format semantic 검사는 제외했다.
- non-root container 내부 30개 차트 추가. 총 24,987회 출현, JSON 고유값 24,306개. 유효 차트 수와 다르다.
- 기존 1,387가족/10,174프로그램의 source/artifact/AST 조사.
- 현재 ggaction 0.0.26에서 대표 6가족의 46stage replay. 원본 source fidelity 시험은 아니다.
- 보고서의 수치·링크·계획 의존성 및 HTML 데스크톱/모바일 탐색 확인. 결과는 `evidence/report-validation.json`, `evidence/report-ui-qa.json`에 기록한다.

## 디렉터리

`parts/`는 통합 문서의 편집 원본이다. `evidence/`는 전수 인벤토리·hash·JSON pointer·실행 관찰이다. `scripts/`는 이 자료를 재생성한다. `sources/`는 외부 저장소의 고정 clone이며 보고서 전달용 묶음에는 포함하지 않는다.

증거 JSON은 대략 136MB 이상이다. 모든 파일·표현식·옵션 pointer를 보존했기 때문이다. 일반 독자는 HTML과 요약 CSV를 먼저 보고, 구현자는 해당 요구의 JSON row를 조회하면 된다. 큰 JSON을 전부 채팅에 붙여 넣지 않는다.

## 재현 순서

아래 명령은 **이 README가 있는 디렉터리**에서 실행한다. 스크립트는 source를 읽고 `evidence/`를 덮어쓰므로 기존 결과를 별도 복사한 뒤 재조사하는 것이 좋다. core 인벤토리와 probe는 repo 경로를 인자로 받는다. 다른 corpus 스크립트는 이 디렉터리 구조를 사용한다.

Python 3 표준 라이브러리와 Node 20.11 이상이 필요하다. 실제 조사 셸은 Node 23.5.0이었다. JavaScript 도구는 ggaction의 기존 개발 의존성(acorn, ajv/ajv-formats, esbuild, playwright)을 읽는다. 현재 설치된 정확한 버전과 browser는 실행 증거/환경 파일에 기록한다. schema 검사에는 동봉된 `evidence/corpus-vega-lite-*.json`과 `corpus-schema-sources.json`을 사용한다. live schema 다운로드로 기존 결과를 바꾸지 않는다.

```sh
node scripts/ggaction-inventory.mjs ../..
node scripts/ggaction-probes.mjs ../..
python3 scripts/corpus-census.py
python3 scripts/corpus-source-deltas.py
node scripts/corpus-programs.mjs
node scripts/corpus-schema-validation.mjs
node scripts/corpus-embedded.mjs
node scripts/corpus-runtime-probes.mjs
python3 scripts/corpus-finalize.py
```

`corpus-runtime-probes.mjs`는 저장소에 동봉된 대표 ggaction recipe를 browser에서 실행하며 network를 차단한다. 기본 6가족 외 ID를 명시할 수 있다. 출력이 크므로 필요하면 로그를 파일로 저장한다. `corpus-finalize.py`는 schema/probe/embedded/#258 정보를 전수 원장에 병합한다.

Flint의 좁은 registry/compile probe는 clone 안의 별도 `.audit-runtime` 의존성으로 실행한다. 이 설치는 ggaction package.json/lockfile을 바꾸지 않는다.

```sh
npm install --prefix sources/flint-chart/.audit-runtime --ignore-scripts --no-audit --no-fund esbuild@0.25.12 typescript@5.6.3 d3-time@3.1.0 d3-time-format@4.1.0 d3-format@3.1.0 @floating-ui/dom@1.7.4
node scripts/flint-inventory.mjs
node scripts/flint-compile-probe.mjs
python3 scripts/flint-requirements.py
```

이 명령은 Flint 자체 전체 suite나 browser 렌더를 실행하지 않는다. d3-format을 조사 환경에 명시 설치한 것은 소스 bundle probe를 위한 것이다. upstream published package의 의존성 결함이 확정됐다는 뜻이 아니다.

보고서와 계획 재생성:

```sh
python3 scripts/build-plan.py
node scripts/build-report.mjs
python3 scripts/validate-report.py
node scripts/qa-report.mjs
```

`build-report.mjs`는 marked 17.0.5를 사용했다. `.runtime`에 별도로 설치한 marked를 사용하며 다른 설치는 `MARKED_MODULE`로 지정한다. 설치 명령은 인계 안내에 있다. HTML 완성본을 읽는 데는 Node/marked가 필요 없다. `qa-report.mjs`는 ggaction 개발 환경의 Playwright를 사용하며 report 파일만 읽는다. 새 기능에 대한 79개 제안 시험군을 실행하는 스크립트가 아니다.

## 구현자가 바로 사용할 순서

1. 상세 로드맵의 START_HERE와 DECISIONS로 최신 범위와 계약을 확인한다.
2. roadmap-next.py로 선행 조건이 완료된 카드 하나를 꺼낸다.
3. 해당 카드의 contracts와 source-map을 읽고 독립 fixture부터 구현한다.
4. 카드의 focused tests, consumer matrix, 타입·저장·문서 동기화를 마친다.
5. progress-template 형식으로 actual commit/command/artifact를 기록하고 후행 의무를 인계한다.
6. active 30요구/79시험군과 모든 required consumer를 종료한 뒤 실제 릴리스 권한에 맞춰 candidate를 검증한다.

이번 보고서는 구현을 위한 계약 초안이다. '미지원', '미검증', 'source-blocked', '지원 불필요'를 혼용하지 않는다. 계획에 포함되었다는 이유만으로 current capability 또는 release note에 지원 완료라고 쓰지 않는다.

## 2026-10-27 사용자 범위 개정

- **추가:** Icicle/Sunburst 공통 partition, kNN 등 여섯 graph inference rule, hierarchical/FDEB/KDE/edge-path 네 bundling method.
- **정리:** Funnel은 이름만 Pyramid로 변경. Marginal/Bullet/Combo는 기존 액션 조합. KPI/Gauge 제외. 같은 Cartesian frame의 Y scale 하나·표시 Y축 최대 하나.
- **명세:** 보고서 부록 F. [정책](evidence/scope-policy.json), [51행 target mapping](evidence/target-chart-mapping.json), [코퍼스 정책 screening](evidence/corpus-scope-screening-summary.json), [수치 기대값](evidence/revision-oracle-fixtures.json).
- **정직한 분모:** source51이름/154등록 유지. KPI/Gauge 제외 후49/150이며 dual-Y 등 옵션별 판정은 별도. 제외·금지를 pass로 계산하지 않는다.
- **상태:** 문서·계획만 개정. 22작업/79시험군은 구현·실행 전이다. 원본 소스와 기존 audit evidence는 보존했다.

재생성 순서: `python3 scripts/scope-screening.py` → `python3 scripts/build-plan.py` → `node scripts/build-report.mjs` → `python3 scripts/validate-report.py` → `node scripts/qa-report.mjs` → `python3 scripts/package-report.py`. `scope-revision.py`는 build-plan이 호출하며 정책·기대값·원본 hash를 생성/검사한다.

최신 설계 우선순위는 보고서10–11장과 [native capability](evidence/native-capability-requirements.json)에 있다. 외부874+1,405행은 reference-only/required=false. [철회 기록](evidence/withdrawn-flint-plan.json)의 작업·시험은 active gate에 연결하지 않는다. build-plan은 scope-revision 후 native-design-revision을 적용한다.

최신 조정: UpSet·집합 시각화는 후속 과제로 이관했다. WP-23, USR-03/04, AT-66–69 및 전용 데이터/API/상호작용은 현재 범위 밖이다. 활성30행·후속2행·외부참고2,279행으로 구분한다. [후속 설계](evidence/deferred-set-visualization-design.ko.md)와 [후속 작업 기록](evidence/deferred-set-visualization-plan.json)에 이전 내용을 보존했다.

## 상세 로드맵 재생성과 확인

```sh
python3 scripts/roadmap-oracles.py
python3 scripts/build-roadmap.py
node scripts/build-roadmap-view.mjs
python3 scripts/validate-roadmap.py
node scripts/qa-roadmap.mjs
python3 scripts/roadmap-next.py --task STEP-035 --with-contracts
python3 scripts/package-report.py
```

roadmap/contracts와 START_HERE/DECISIONS/INTEGRATION_COOKBOOK, scripts/roadmap-task-spec.py가 편집 원본이다. tasks와 ROADMAP 통합본은 생성 결과다. plan/acceptance/requirement/consumer JSON은 모두 proposed 또는 not-run 상태이며, 문서 검증 통과와 기능 구현 성공을 구분한다. source-map은 현행 92개 파일의 symbol·line·SHA256을 보존한다. 검증 결과는 evidence/roadmap-validation.json, roadmap-oracle-validation.json, roadmap-ui-qa.json에 기록한다.
