# Step 1 — Repository and Evaluation Baseline

## 진행 상태

- [x] 평가 workspace를 read-only로 조사했다.
- [x] 현재 repository가 clean `4ee6bb8`에서 시작함을 확인했다.
- [x] package/version/export map과 CI script를 확인했다.
- [x] source가 actions, grammar, selectors, materialization, layout, renderers 책임으로 분리됨을 확인했다.
- [x] tests가 unit, contracts, charts, gates, browser, render와 package consumer를 독립 실행함을 확인했다.
- [x] normal suite와 coverage 기준선을 실행했다.
- [x] package artifact와 실제 package consumer를 실행했다.
- [x] local Browser/Chromium sandbox 제약을 제품 failure와 분리 기록했다.
- [x] Roadmap 4 scope ledger와 dependency graph를 작성했다.
- [x] Existing `createBoxPlot`과 대칭적인 Basic Chart facade 계획을 통합했다.
- [x] Linear gradient capability와 별개로 명확한 interval geometry를 소유하는
  `createGradientIntervalPlot` facade를 Phase 6과 Phase 14에 배정했다.

## 조사 결과

### Public/package boundary

- package version: `0.0.4`
- entry points: `ggaction`, `ggaction/extension`, `ggaction/png`
- default runtime exports: `chart`, `hconcat`, `vconcat`, `render`
- public program methods는 built-in registrar가 prototype에 설치한다.
- 별도 compile/build output은 없고 source ESM과 declaration을 package artifact로 직접 배포한다.
- 따라서 build 기준선은 package artifact 검사와 실제 JS/strict-TS consumer 실행이다.

### Architecture baseline

- `semanticSpec`은 의미와 provenance, `graphicSpec`은 renderer-ready concrete scene graph다.
- `resolvedScales`와 `materializationConfigs`가 semantic state와 concrete 재계산 intent를 분리한다.
- cross-cutting change는 deterministic materialization plan으로 scale→mark→guide→layout→highlight 순서로 실행한다.
- renderer는 `graphicSpec`만 읽는다.
- composition/facet은 retained child programs와 concrete parent snapshot을 소유한다.
- derived data는 immutable revision, explicit consumer rebind와 orphan release lifecycle을 사용한다.

### Test/build baseline

| 명령 | 결과 |
| --- | --- |
| `env npm_config_cache=/tmp/ggaction-npm-cache npm test` | 1545/1545 통과 |
| `env npm_config_cache=/tmp/ggaction-npm-cache npm run test:coverage` | 94.89/90.22/98.54%, critical floors 55 통과 |
| `env npm_config_cache=/tmp/ggaction-npm-cache npm run package:check` | 320 entries, artifact contract 통과 |
| `env npm_config_cache=/tmp/ggaction-npm-cache npm run test:package` | 실제 packed JS/TS consumer 통과 |
| `npm run test:browser` | local npm cache와 server sandbox 때문에 차단 |
| `npm run test:render` | PNG cases는 실행, gallery Chromium sandbox에서 차단 |

기본 `~/.npm` cache의 root-owned files 때문에 plain `npm test`의 package-artifact test 한 건이
`EPERM`이었다. 같은 commit을 external `/tmp` cache로 재실행하면 전체가 통과하므로 제품 기준선
failure로 보지 않는다. Browser suite의 localhost listen과 Chromium Mach port도 현재 sandbox가
차단하므로 이후 exit gate에서는 허용된 local environment 또는 CI의 browser evidence를 사용한다.

## Phase 분할 결정

평가서의 Wave 0~6을 그대로 큰 실행 Phase로 쓰지 않는다. Existing capability의 Basic Chart facade를
초기 독립 Phase에 두고, binned heatmap과 Parallel Coordinates facade는 owning capability Phase에서
완성한다. 작은 encoding 두 개와 shared transform 두 개만 같은 Phase에 묶고, gradient, ordered path,
density placement, Horizon, overlay, parallel coordinate, label layout과 hierarchy는 각각 독립 Phase로
둔다. 마지막 facade consistency Phase가 `createBoxPlot`까지 포함해 inference, defaults와 edit handoff를
통합 검증한다.

## 다음 단계

Phase 1 진입 전에 B-002, B-001, B-004의 제품 소스 재현과 현재 test coverage를 다시 조사하고,
B-001의 inheritance 충돌 정책을 사용자 gate로 확정한다.
