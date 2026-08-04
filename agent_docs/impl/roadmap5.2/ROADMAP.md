# Roadmap 5.2 — Repository Integrity and Maintainer Hardening

> **문서 상태 — 현재 실행 계획.** Roadmap 5.2는 새 chart capability나 public API를 추가하지 않고
> `0.0.8`의 문서 정확성, executable coverage, GitHub 운영 안전장치와 CI/package 유지보수 기반을 닫는다.
> 활성 Phase와 Gate 상태는 [`../ROADMAP_INDEX.json`](../ROADMAP_INDEX.json)이 소유한다.

## 목표

현재 구현된 173개 action과 Canvas/SVG/PNG/PDF 결과를 그대로 유지하면서 다음 개발이 안전하게 이어질 수
있도록 repository truth, tests, GitHub settings, dependencies와 bundle budget을 정렬한다.

쉽게 말하면 새 기능을 만드는 Roadmap이 아니라 다음 네 문제를 닫는 작업이다.

1. 코드와 다르게 적힌 문서를 고친다.
2. `Partial`로 남은 중요한 경계 테스트를 완성한다.
3. `main`과 release path를 실수로부터 보호한다.
4. CI 경고, dependency와 browser bundle budget을 정리한다.

## 범위 원장

| ID | 범위 | 제품 결과 | Phase |
| --- | --- | --- | ---: |
| IH-01 | Exact baseline and policy | drift, partial coverage, GitHub, dependency와 bundle 기준선 | 0 |
| IH-02 | Repository governance | protected `main`, required checks와 merged-branch cleanup | 1 |
| IH-03 | Community and security | contribution templates, conduct/security policy와 automated alerts | 1 |
| IH-04 | Truth alignment | architecture, README, contracts와 package facts의 일치 | 2 |
| IH-05 | Mechanical drift guards | renderer/export/bundle 설명의 재발 방지 | 2 |
| IH-06 | Coverage completion | current contract 47개 `Partial`과 action index 25개 partial test audit 해결 | 3 |
| IH-07 | CI and dependency maintenance | deprecated action runtime 제거와 controlled dependency update | 4 |
| IH-08 | Bundle integrity | basic 120KB promise 복원과 full/basic/svg regression budget | 4 |
| IH-09 | Integration and closeout | current truth, repository settings, package와 cumulative evidence | 5 |

## 최상위 원칙

- Existing valid public program, stored state, rendering output와 package entry는 바꾸지 않는다.
- New action, new chart family, new renderer, responsive/data-update/interaction API는 추가하지 않는다.
- Test matrix를 무한히 늘리지 않는다. Equivalence class, pairwise case와 schema-driven coverage로 위험을 닫는다.
- Aggregate action이 child validation에 의존하면 executable delegation evidence를 남기고 중복 test를 만들지 않는다.
- GitHub settings 변경은 exact rule과 recovery path를 먼저 승인받은 뒤 적용한다.
- Dependency major upgrade는 focused compatibility evidence 없이 묶어서 수행하지 않는다.
- Bundle budget은 현재 크기에 맞춰 느슨하게 올리지 않고 public promise와 실제 측정을 하나의 source로 연결한다.
- Gate package는 검증하고 commit/push한 뒤에만 승인을 요청한다.
- PR, merge, package publish와 documentation deployment는 Roadmap 승인 범위에 포함하지 않는다.

## 진행 상태

| Phase | 상태 | 범위 |
| ---: | --- | --- |
| 0 | in-progress | Exact baseline, policy decisions와 R52-P0-A |
| 1 | planned | GitHub governance, community와 security settings |
| 2 | planned | Documentation truth alignment와 mechanical drift guards |
| 3 | planned | Partial coverage completion과 cumulative regression |
| 4 | planned | CI action runtime, dependency와 bundle hardening |
| 5 | planned | Integration, repository verification와 R52-Exit |

## Approval Gates

Gate 상태는 `planned | ready-for-review | approved | changes-requested`만 사용한다. 사용자의 명시적 승인 없이
다음 Gate로 이동하지 않는다.

| Gate | Phase | 승인 대상 | 승인 전 차단 범위 |
| --- | ---: | --- | --- |
| R52-P0-A | 0 | Scope, partial-resolution policy, repository rules, dependency와 bundle decisions | 모든 settings/runtime/test 변경 |
| R52-P1-A | 1 | Applied ruleset, required checks, community/security files와 recovery verification | Truth alignment 변경 |
| R52-P2-A | 2 | Corrected facts와 renderer/export/bundle drift guards | Partial coverage 변경 |
| R52-P3-A | 3 | 47 contract gaps, 25 action statuses와 cumulative regression evidence | CI/dependency/bundle 변경 |
| R52-P4-A | 4 | Warning-free workflow, dependency compatibility와 browser bundle budgets | Closeout |
| R52-Exit | 5 | Current truth, GitHub settings, package, docs와 full suite | 완료 선언과 release preparation |

Visual output 변경은 범위 밖이므로 기본 visual Gate는 없다. 기존 approved chart의 concrete pixels가 달라지면
해당 Phase를 중단하고 changes-requested 상태의 별도 visual Gate를 추가한다.

## Phase 0 — Baseline and policy contract

`0.0.8` clean `main`에서 action/test 규모, current contract gaps, documentation drift, GitHub settings, dependency와
bundle 상태를 기록하고 해결 정책을 승인받는다. Review package는 [`phase0/`](./phase0/)가 소유한다.

## Phase 1 — Repository governance, community, and security

PR/check 기반 `main` ruleset, force-push/delete protection, merged branch cleanup, contribution templates,
Code of Conduct, Security Policy와 supported security automation을 적용한다. Solo maintainer가 자기 PR 승인을
요구받아 막히지 않도록 review approval count는 0으로 두되 checks와 PR boundary는 유지한다.

## Phase 2 — Truth alignment and drift prevention

SVG 지원 여부와 bundle budget처럼 현재 코드와 다른 수동 문서를 고친다. Renderer/export/version/budget facts를
가능한 한 canonical source에서 검증해 같은 drift가 다시 release를 통과하지 못하게 한다.

## Phase 3 — Coverage completion

47개 `⚠️ Partial`을 direct test, executable delegation, bounded pairwise/schema coverage 또는 explicit narrowed
non-goal 중 하나로 해결한다. `ACTION_INDEX.json`의 tests partial 25개는 0개를 목표로 한다.

## Phase 4 — CI, dependency, and bundle hardening

Release annotation을 발생시키는 deprecated action runtime을 supported revision으로 교체한다. Production audit 0을
유지하며 patch/minor dependency를 갱신한다. Major는 별도 compatibility 결과에 따라 반영하거나 명시적으로
연기한다. Basic entry는 public 120,000-byte gzip promise를 다시 만족시킨다.

## Phase 5 — Integration and closeout

Repository settings, current contracts, architecture, public docs, generated references, full tests, coverage,
Canvas/SVG/PNG/PDF, installed package와 browser bundles를 함께 검증한다. R52-Exit 승인 뒤에만 Roadmap을 완료하고
`0.0.9` release preparation을 별도 제안한다.

## Explicit non-goals

- New public action, chart facade, mark, transform, scale, guide 또는 renderer
- Responsive/automatic Canvas size
- Source dataset replacement, streaming 또는 async/columnar ingestion
- Hit testing, tooltip, event, animation 또는 transition
- PNG/PDF package split이나 native dependency boundary 변경
- Visual style, layout target 또는 approved chart pixels 변경
- Exhaustive Cartesian product test generation
- Vite/es-module-lexer major upgrade without a separately reviewable compatibility result
- PR creation, merge, package publish, documentation deployment 또는 release
