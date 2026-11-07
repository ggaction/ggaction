# Partition 재개 인계 — 사용자 wrap-up으로 정지

## 진행 상태

2026-11-04 사용자가 wrap-up 후 다른 에이전트가 재개하도록 준비하고 멈추라고 요청했다. 이 인계에서는 새 제품 구현·테스트·성능 실행을 시작하지 않았다. 제품 변경과 완료된 증거를 보존하고 문서 snapshot만 commit/push한다. **원10k 및 최종 성능 qualification은 미완료 WIP**이며 STEP057–070/077 완료로 표시하지 않는다.

- 작업 트리: `/Users/hyeonjeon/.codex/worktrees/roadmap9-partition/ggactionnewbrand`
- branch: `codex/roadmap9-partition-sampling`
- 제품 source commit: `b5a88bed2` (`Reuse admitted partition cell calculations`)
- 인계 작성 직전 HEAD: `6e71785ee0650cc8c2e68b3a7be9c419fbed0385`; 원격 branch도 같은 SHA였고 WT clean이었다.
- base: `c8bac0e77`. 이 branch가 최신 integration을 포함한다고 가정하지 않는다. 통합·최종 측정은 root 담당자가 최신 통합 상태를 먼저 확인한다.
- 기존 Geo WT `/Users/hyeonjeon/.codex/worktrees/roadmap9-geo-hit-a3/ggactionnewbrand`는 이 작업에서 수정하지 않았다.
- 현재 소유한 실행 프로세스: **0**. 이전 proof/coverage/package/browser/1k는 모두 종료했다. 마지막 CPU 슬롯은 scalar에게 반환했다. 새 에이전트는 슬롯 소유권이 계속 유효하다고 가정하면 안 된다.

## 승인과 정확한 구현

사용자의 remainingApproval을 근거로 root가 [구체안](PARTITION_CELL_CALCULATION_PROPOSAL.md) `5e1f2add6427659b68f73d9a92f5bc87ca63c12a`의907건 proof와4파일 exact diff를 채택했다. 사전 채택 기록은 `2b7b12f5b`다. 같은 결정에 새 사용자 승인 질문은 필요 없다. PR·publish·deploy는 별도 승인 없이 하지 않는다.

제품은 각 cell의 한 동기 호출 안에서 최초 full frame/kernel/radius admission을 완료한 후 scalar 값을 재사용한다. generic wrapper의 검사·오류 순서와 반환 ownership은 유지한다. 중간 point/interval만 raw 계산하고 마지막 cell deep freeze는 유지한다. cell 간/global cache, registry rotation, public API/schema, renderer 경계 변경은 없다. 원 수학·점 순서·64회 역산·.2px tessellation·4096상한·실제 work/모든 guard를 보존한다.

2026-11-04 읽기 확인에서4source hash는 기존 증거와 같았다.

| 파일 (`src/grammar/hierarchy/`) | SHA256 |
| --- | --- |
| partitionMapping.js | `710b9414bd7a7e90ee232d96b9af4dd9c32e02f1c7d4ca438058f7b7205caea7` |
| partitionBend.js | `1cd3cbac0f335c57d1103d0e8887a9dcac3fc489ae1487dcd838837d84a8cd5a` |
| partitionAdapter.js | `57c2ddf87ed19e82ee61b214996bd2171139d2372370feb5077e778951aeb2c1` |
| partitionCell.js | `d704da8a78314f578a5aaf5f42489b9de207c3c42bea11d21e40d1b1f2534286` |

## 이미 통과한 범위 — 다시 미실행으로 되돌리지 말 것

[구현 기록](PARTITION_CELL_CALCULATION_IMPLEMENTATION.md)과 [summary](partition-cell-product-evidence/summary.json)가 결과를 소유한다.

- 제품907건: 승인 candidate와 출력·오류·실제 수학·역산 반복·work·객체 계수까지 exact.
- owner117/117. Mapping/adapter/cell coverage100/100/100, bend98.78/97.26/100. 원 파일별95/90/100 기준 통과.
- package/types/discovery32/32. 신규 반례는 `test/unit/grammar/partition-cell-calculation.test.js`, group work/hidden admission은 `test/unit/animation/partition-cells.test.js`. `partition` capability 등록.
- **같은 archive 검증은 이미 완료**: Node20.20.2/22.23.1/24.22.1 public runtime·strict TS·6번들, 공개 tutorial, source-free installed Canvas/SVG DPR1·2의 current/rebase pixel oracle.
- 원1k: 전체 layout1,000개와 current/rebase/offline/offline-rebase 각각1,000cell·5,000commands 전수. 원 current hash `b1e9c2ddebd685dc6d7e0d51a4bfdbffb8feca303d956ee7d02b7ec75e3280f4` 일치.
- 작은2node100cycle에서 과거 frame WeakRef100/100 회수. canonical memory100cycle 성공을 뜻하지 않는다.

고정 archive SHA256: `bb78b18bdda0f13451c84e469b6c42609a27898c6f297194427c4f1b853fab48`.
1268entries/1,827,690packed/8,230,957unpacked. 기존 entries·packed 한도 유지, unpacked8,231,000과 animationgzip343,976만 실측 최소 조정. Root 통합에서는 이 branch 수치를 그대로 덮어쓰지 말고 합산 실측 한도를 유지한다.

로컬 재사용 경로(2026-11-04 존재 확인; 원격 재현 시 새 consumer를 만든다):

- archive: `.artifacts/partition-cell-package/archive/ggaction-0.0.26.tgz`
- receipt: `.artifacts/partition-cell-package/archive.json`
- installed root: `/var/folders/5l/mf328hq518n7ml3w3rvjdq580000gn/T/ggaction-consumer-bSUKjB/node_modules/ggaction`
- committed receipts/helpers: `agent_docs/impl/roadmap9/qualification/partition-cell-product-evidence/`

실행 harness 수리도 보존했다. pack destination은 절대 경로여야 한다. browser bundle provenance는 `/var` realpath를 정규화하고 명시 inline `<stdin>` virtual entry만 제외한다. 모든 실제 bundle input은 installed consumer 아래여야 한다. 이 수리 뒤 동일 설치본 browser를 별도 명령으로 통과시켰으며 제품 소스 변경은 없었다.

## 남은 WIP와 정확한 다음 명령

**지금 실행하지 않는다. 사용자가 재개한 후 root와 CPU 슬롯을 먼저 조율한다.**

1. 원10k native/current/rebase/offline functional 검증은 아직 실행하지 않았다. 다음은 기존 고정 archive/consumer를 재사용하는 정확한 명령이다. helper가 archive SHA와 설치 모든 파일 bytes를 먼저 검산한다. 기존 consumer가 없으면 아래 재설치 절차를 먼저 수행한다.

```sh
cd /Users/hyeonjeon/.codex/worktrees/roadmap9-partition/ggactionnewbrand
node agent_docs/impl/roadmap9/qualification/partition-cell-product-evidence/large-installed.mjs --package-root=/var/folders/5l/mf328hq518n7ml3w3rvjdq580000gn/T/ggaction-consumer-bSUKjB/node_modules/ggaction --receipt=/Users/hyeonjeon/.codex/worktrees/roadmap9-partition/ggactionnewbrand/.artifacts/partition-cell-package/archive.json --output=/Users/hyeonjeon/.codex/worktrees/roadmap9-partition/ggactionnewbrand/.artifacts/partition-cell-package/original10k.json --nodes=10000
```

2. 최종 합산 archive의 canonical Partition P95는 미실행이다. root가 모든 CPU 경쟁 작업을 멈춘 exclusive 창을 정한 후 **최종 합산 archive**로 실행한다. 아래 변수는 root가 실제 승인·고정한 절대 경로로 지정해야 한다. branch archive를 합산본으로 오인하지 않는다.

```sh
node scripts/benchmark-native.js --archive="$PARTITION_FINAL_ARCHIVE" --output="$PARTITION_FINAL_OUTPUT" --workload=partition
```

원100/1k/10k,5warmup+30measurement,DPR1·2,33ms preview/300ms large layout 기준과 원 fixture/timers를 그대로 둔다. 미달·정체는 실패/미완료로 기록하며 반복 수/입력/guard를 줄여 pass하지 않는다. 진단 측정과 최종 SLO 판정을 분리한다. 새 API·새 소유권 경계가 필요하면 정확한 구체안부터 root가 검토한다.

3. 원격 또는 로컬 consumer 삭제 후 재현은 아래와 같다. 새 output 경로를 사용하고 stdout receipt의 archive SHA를 기존 SHA와 대조한다. helper는3개 Node executable 절대 경로를 받는다. 재설치가 이전 모든 결과의 자동 무효화를 뜻하지 않는다.

```sh
node scripts/package-artifact.js --pack > "$PARTITION_ARCHIVE_RECEIPT"
node agent_docs/impl/roadmap9/qualification/partition-cell-product-evidence/installed.mjs "$PARTITION_ARCHIVE_RECEIPT" "$PARTITION_INSTALLED_OUTPUT" "$PARTITION_NODE20" "$PARTITION_NODE22" "$PARTITION_NODE24"
```

4. 새 source 변경이나 통합 충돌이 생긴 경우에만 영향을 받은 검증을 다시 실행한다. 원907/owner 재현 명령:

```sh
node agent_docs/impl/roadmap9/qualification/partition-cell-calculation-evidence/verify-product.mjs .artifacts/partition-cell-product-resume
node --experimental-test-coverage --test-coverage-include=src/grammar/hierarchy/partitionMapping.js --test-coverage-include=src/grammar/hierarchy/partitionBend.js --test-coverage-include=src/grammar/hierarchy/partitionAdapter.js --test-coverage-include=src/grammar/hierarchy/partitionCell.js --test test/unit/grammar/hierarchy-partition*.test.js test/unit/grammar/partition-cell-calculation.test.js test/unit/animation/partition*.test.js test/unit/resources/partition*.test.js test/charts/partition-layouts/*.test.js
```

`verify-product`는 승인 exact diff와 base hash를 강제하므로 의도적으로 새 구현을 추가한 뒤에는 이전 proof를 성공으로 덮어쓰지 않는다. 새 proof/근거를 별도로 남긴다.

## 재개 운영 규칙

- 이 문서는 사용자의 중지 요청에 따른 snapshot이다. 자동 재개/예약/새 agent 실행을 만들지 않는다.
- 기존 사용자 구현·commit/push 승인은 재개 후 같은 범위에 재사용한다. 미완료 검증을 완료로 바꾸지 않는다.
- 큰 실행 전 root에게 단계·PID·시작 시간을 알리고 다른 큰 프로세스와 중첩하지 않는다. 종료·결과·슬롯 반환을 즉시 알린다.
- final P95는 root/route/scalar를 포함한 모든 경쟁 CPU 작업 중단을 확인한다. 명시적 GC는 canonical 측정에 끼워 넣지 않는다.
- 구현·증거의 coherent checkpoint마다 commit/push. 관련 없는 WT/프로세스를 삭제·종료하지 않는다. PR/publish/deploy는 하지 않는다.
