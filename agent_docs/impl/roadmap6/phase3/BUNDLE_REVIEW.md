# R6-P3-B — Full browser bundle budget

상태: **approved**. 2026-09-05 사용자가 Full 235,000 → 237,000 bytes 조정 질문에 “승인한다”라고 답했다. 승인 기준 HEAD는 `d2b1f7bf05d11357b9b9b6ed5520f442ef3d07f4`다. 아래는 결정 당시의 제안·측정 기록이며 승인 후 적용 결과는 RESULTS에 별도로 기록한다.
Full bundle 상한 변경은 A/V 승인에 포함되지 않았으며, 이 문서는 그 별도 결정을 구체화한다.
상한 변경은 아직 적용하지 않았다. X와 다음 Phase 구현도 승인 전이다.

## 요청할 결정

**Full gzip 상한을 235,000 → 237,000 bytes로 조정하는 안을 권장한다.**
Basic 125,000 / SVG 25,000 bytes, minifier·압축·측정 fixture·검증 방식은 유지한다.
증가분은 2,000 bytes(0.85%), 현재 구현 대비 여유는 1,077 bytes다.
승인 효과는 canonical guard와 architecture 숫자의 수정, 같은 tarball 소비자 재검증, X 결과 검토 준비다.
기능 삭제·Basic 이동·배포·PR·다음 액션군의 구현 승인을 포함하지 않는다.

## 실제 설치 결과

Runtime source commit: [`80999264535b312d82ca3f58928b4428bf749ac5`](https://github.com/ggaction/ggaction/commit/80999264535b312d82ca3f58928b4428bf749ac5).
[기계 판독 결과](package-results.json)는 하나의 tarball을 Node/MCP/strict TypeScript/tutorial consumer에
설치한 뒤, 같은 tarball을 다시 설치해 세 Vite production bundle을 모두 측정한 결과다.
Source tree `6d5a80e311cabdc67dff5da739dcce3346e3841d`, types tree `38cbb7b6d7feaa5b044a56189ea874b8bde5d581`.

| 엔트리 | 현재 gzip | 현재 상한 | 현재 판정 | 제안 상한 |
| --- | ---: | ---: | --- | ---: |
| Full `ggaction` | 235,923 | 235,000 | 923 bytes 초과 | 237,000 |
| `ggaction/basic` | 124,897 | 125,000 | 통과, 여유 103 | 125,000 |
| `ggaction/svg` | 6,418 | 25,000 | 통과, 여유 18,582 | 25,000 |

Package 전체는 **실패(exit 1)**다. Node/MCP/strict types/tutorial 통과를 package 전체 통과라고 기록하지 않는다.
Full은 383 modules, minified 900,260 bytes, gzip 235,923 bytes다.
Tarball은 `ggaction-0.0.12.tgz`, SHA-256
`436bc7ba0475f78ddeb5040193b61c15325869240a4f05c5c03cf7663d301314`,
packed 481,057 bytes / unpacked 2,300,288 bytes / 436 entries다.

## 증가 원인과 유지한 의미

Phase 2 최종 Full은 234,258 bytes였다. Pie checkpoint 234,970, Density checkpoint 235,428,
Horizon 완료 후 235,923이다. 세 facade와 관련 엄격한 검증의 누적 증가는 1,665 bytes(0.71%)다.
Basic와 SVG 크기는 그대로다. Browser에 Node-only MCP/knowledge가 유입되지 않았음을 측정기가 검사한다.

세 H0는 기존 owner를 실제 wrapped child로 호출한다.

- `createPiePlot({ category: "category" })`: Arc → count/explicit-sum theta → category color → legend.
  Donut은 `arc.innerRadius`; 별도 alias나 partition cache는 없다.
- `createDensityPlot({ field: "value" })`: Area → existing KDE → optional explicit retained-group color → guides.
  GroupBy와 color를 분리하며 raw metadata join이나 orientation edit를 추가하지 않았다.
- `createHorizonPlot({ x: "time", y: "value" })`: Area → optional coordinate → existing signed fold → explicit opacity → x guides.
  Original-amplitude y축이나 internal band legend를 자동 추론하지 않는다.

Pie/Density의 categorical color·guide 검증과 optional undefined 정규화는 이미 공통 helper를 재사용한다.
현재 923 bytes는 그 중복 정리를 반영한 수치다. 새 facade는 계산·renderer·semantic compiler를 추가하지 않는다.
검증·오류·trace를 줄여 상한에 맞추는 변경은 제안하지 않는다. 더 넓은 기존 모듈 최적화는 별도 변경과
회귀 검증이 필요하므로 이번 기능 완료의 전제로 추가하지 않는 것을 권장한다.

## 선택지와 tradeoff

| 선택 | 결과 |
| --- | --- |
| **Full 237,000으로 조정 (권장)** | 승인된 세 기능·검증을 보존하며 923-byte 초과를 명시적으로 수용한다. 1,077-byte 여유를 가진 guard를 계속 사용한다. |
| Full 235,000 유지, 추가 최적화 | 독립적인 bundle 절감 작업과 비교 검증을 수행한다. 현재 package는 실패 상태로 남으며 X를 완료할 수 없다. |
| 액션 일부 보류 | 승인된 Phase 3 범위를 변경해야 한다. 현재 세 facade가 모두 구현·검증되어 있어 권장하지 않는다. |

## 승인 후 적용할 정확한 변경

```diff
--- scripts/browser-bundle-size.js
+++ scripts/browser-bundle-size.js
@@
-  ggaction: 235_000,
+  ggaction: 237_000,
```

`agent_docs/SECOND_ARCHITECTURE.md`의 같은 Full 상한 표만 237,000으로 맞춘다.
변경 전에 B 승인 ref를 먼저 기록한다. 이후 installed package 전체를 exit 0으로 검증하고
누적 결과·시각 evidence를 포함한 X package를 별도로 제시한다.

## 검증 증거와 재현

구현·오류 교정·누적 tests: [RESULTS.md](RESULTS.md).
Normal 2,585건과 coverage 72 critical floors가 통과했다. 확장 realistic 전체 실행은 210/212이며,
두 generated inventory 실패를 교정한 뒤 영향받은 세 모듈 13/13이 통과했다. 전체 재실행으로 표기하지 않는다.
교정 commit `39b082d643412c5190c3ca51f180d10c2c7efa72`는 runtime/types/knowledge/package를 바꾸지 않는다.
Source docs 47건, built 124페이지와 전체 docs browser, 세 신규 example browser도 통과했다.
9개 public/primitive의 semanticSpec·graphics·순서·Canvas·decoded pixels·SVG·PDF streams는 모두 일치한다.
[시각 결과 JSON](public-visual-results.json), [실제 비교 화면](../../../../.artifacts/roadmap6-authoring/phase3-public-review.html),
[9개 결과 개요](../../../../.artifacts/roadmap6-authoring/phase3-public-overview.png)를 제공한다.
V 당시 승인된 9개 pixel hash와 현재 public pixel hash도 일치한다. 입력·호출·source 90개 hash·PNG 18개 hash를 재확인했다.

```sh
export TMPDIR="$PWD/.artifacts/repository-study/tmp"
export NPM_CONFIG_CACHE="$PWD/.artifacts/repository-study/npm-cache"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.artifacts/repository-study/browsers"
node agent_docs/impl/roadmap6/phase3/render-public-review.mjs
node agent_docs/impl/roadmap6/phase3/verify-package.mjs
```

두 script는 executable source가 dirty하면 evidence 생성을 거부한다. Package script는 현재 상한에서
923-byte 초과를 기록하고 exit 1을 반환한다. 원격 재현에는 기록된 source ref와 lockfile을 사용한다.
실행 환경은 Node 22.23.1 / macOS arm64다.

## 별도 승인이 필요한 근거

[승인된 A P3-C07](CONTRACT_REVIEW.md#이번에-확정할-결정)은 현재 bundle ceilings를 유지하고,
[조건부 독립 Gate](GATES.md#조건부-독립-gate)는 실제 초과가 남으면 별도 B 승인 없이 상한을 올리지 않도록 정했다.
[구현 기록 지침](../../AGENTS.md#approval-gates)의 원문은
“Treat Gates as hard execution boundaries. Add intermediate Gates for independent public decisions, findings, or visual targets and stop at the first unapproved Gate.”다.

V 승인 범위의 구현과 기능 검증을 마쳤다. 사용자의 “계속해”는 이 작업을 이어가는 지시이며,
아직 제시하지 않은 새 bundle 상한의 승인으로 기록하지 않는다. 현재 상한은 그대로다.
원격 review package commit: [`c7ff0309d19729251b569e61498d52ca714f80bc`](https://github.com/ggaction/ggaction/commit/c7ff0309d19729251b569e61498d52ca714f80bc). `origin/codex/roadmap6-hierarchical-actions`에 push했으며 원격 ref와 일치를 확인했다. 이 문서의 최종 ref 기록은 source나 측정 evidence를 변경하지 않는다.
