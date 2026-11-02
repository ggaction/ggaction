# 실제 browser combined lifecycle 시험 도구

## 진행 상태

- [x] 원 AT56/82·qualification-delivery의 100회 수명주기 계약 및 기존 도구 한계 확인
- [x] AUTHORIZATION remainingApproval 및 root의 도구 전용 범위 재사용
- [x] 실제 bitmap·pointer capture·ResizeObserver·worker 결합 진단
- [x] 독립 결과 판정과 실패 증거·source checkpoint
- [ ] 최종 합산 archive/CPU hold 아래 100회 측정(root 후행)

기반은 `317de21f8`이다. [전체 승인](../AUTHORIZATION.json#remainingApproval)과 root의 시험 도구 전용 배정을 재사용한다.
원 요구는 [qualification-delivery](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/qualification-delivery.ko.md)의 lifecycle stress와 retained heap 계약이다. 제품 runtime/API·기존 routes/24 workload의 입력·geometry·분모·SLO는
수정하지 않는다. 현재 memory 경로의 inspect-only/synthetic pointer를 실제 native graph node drag,
encoded PNG→createImageBitmap→prepared image handle과 dispose→bitmap.close, native ResizeObserver와
명시 editCanvas/updateProgram 정책으로 교체한다. Node driver가 Playwright mouse로 down/move/up을
보내며 trusted pointer·gotpointercapture 및 실제 hasPointerCapture를 독립 확인한다.

각 cycle은 준비된 immutable base의 mount→실제 drag→real route worker start→host resize→destroy다.
짝수는 gesture commit1·worker complete·resize 준비 완료 후 destroy, 홀수는 pending decoded image lease와
worker abort·resize 교체를 포함하고 cancel1·commit0 뒤 destroy한다. 홀수의 실제 decoded lease는
abort 후 host가 늦게 반환하도록 경계를 고정하고 library의 stale disposal을 확인한다. 가짜 empty lease나
빈 worker job을 성공으로 세지 않는다. 늦은 worker delivery는 실제 executor 종료/리스너 해제로 차단한다.

ResizeObserver는 native callback과 측정한 CSS 크기를 사용하며 observation을 가장하지 않는다.
기존 session 구독에서 크기가 바뀐 경우에만 native editCanvas 후보를 updateProgram으로 보낸다.
Destroy 후 같은 element를 다시 resize하고 실제 mouseup/move를 보내도 host publication/render가 없어야 한다.

Cycle별 live listeners/worker listeners/workers/timers+RAF/captures/observers/asset leases/bitmaps를 계수하고
각각0을 요구한다. Positive witness는 trusted input/capture, decode/close, resize callback/policy,
worker posted/completed 또는 aborted, gesture terminal 수를 별도 확인한다. 허용된 늦은 decoder 반환은
cleanup-only delivery로 기록하며 destroyed session publication/render callback0과 구분한다.
GC는 기존 CDP collectGarbage/Runtime.getHeapUsage를 재사용해 기울기≤10,240byte/cycle 및 전체증가≤2,097,152byte를
판정한다. 100회는50complete/50cancel, 개발 diagnostic4회는2/2이며 heap 성능 통과로 집계하지 않는다.

새 검증 코드는 stable scripts/benchmarks 소유자에 둔다. roadmap은 런타임 입력이 아니다.


## 계측 경계와 결과

`routes.browser.js`는 session host/window/document 및 해당 cycle의 AbortSignal listener를
native add/remove에 위임한 뒤 계수한다. Worker listener는 executor의 실제 worker adapter에서 별도 계수한다.
setTimeout/setInterval/RAF ID는 native 실행·취소에 따라 유지하며, harness의 polling/settling은 원 native
함수를 써서 lifecycle timer와 구분한다. 실제 gesture마다 RAF 요청4회가 관측되었다.
Timer/worker/observer callback은 생성 시 cycle을 붙잡으므로 다음 cycle에서 도착해도 이전 destroy 이후 호출로 집계한다.

완료 시 계수0만 보는 데 그치지 않고 timer/RAF ID, capture·listener target Map, tracked target Set,
held lease gate, asset/decode promise Set, probe release 배열의 실제 크기도 각각0으로 검산한다.
Node로 반환하는 결과는 scalar witness·크기·계수의 closed shape다. session/program/DOM/bitmap이
결과 배열을 통해 남는 것을 허용하지 않는다. 단일 immutable baseline은 반복 입력을 위해 의도적으로 유지한다.

고정 runtime archive `280cee991109c3a3629b9d3923d683d2928776b35d82cb87a90aea073753f4dc`를 설치한
source-free production bundle에서 Chromium DPR1/2 각각4회(완료2·취소2)를 검증했다.
각 cycle의 trusted down1/move4/capture1, 실제 PNG pixel, decode=close, lease create=dispose,
native ResizeObserver 초기400×400/변경420×380, 명시 resize policy1, 실제 worker post1을 확인했다.
취소 cycle의 늦은 lease4개는 cleanup-only로 폐기되고 session callback0이다. Destroy 뒤440×360 변경은 전달되지 않았다.
9개 자원 계수와10개 계측 보존 계수가 모두0이고, post-bootstrap HTTP·page/console error도0이다.

마지막 cold4 진단의 GC 관측은 다음과 같다. 이 값은 최종 기준을 넘으므로 메모리 성능 통과로 기록하지 않는다.
초기 cache/JIT인지 누수인지는 이 짧은 진단으로 단정하지 않으며 root의 warmup5+100회에서 판단한다.

| DPR | slope bytes/cycle | growth bytes | 판정 |
|---|---:|---:|---|
| 1 | 1,417,642.8 | 6,686,044 | diagnostic, not qualified |
| 2 | 1,423,624.8 | 6,709,104 | diagnostic, not qualified |

독립 결과 판정3개, 기존24 workload 계약7개, package/discovery23개가 통과했다.
기존 route fixture/iteration/benchmarkCase 및 worker/workloads 파일의 exact byte 보존을 검산했고
제품 src/types 및 모든 packed input 변경은0이다. 계측과 오류 결과의 정본은
[qualification.json](combined-lifecycle-evidence/qualification.json)과 같은 디렉터리의 원 report/log다.
첫 실패2개는 숨기지 않았다: native graph drag가 요구하는 명시 origin 누락과, public stage abort 후
늦게 끝난 createImageBitmap을 host가 아직 닫지 않았던 문제다. fixture origin 및 host cleanup을 고쳤으며 제품 runtime은 그대로다.

## 재현과 후행 의무

```sh
node --test test/contracts/native-benchmark-lifecycle.test.js test/contracts/native-benchmark-workloads.test.js
node --test test/contracts/test-discovery.test.js test/contracts/package-boundaries.test.js
node scripts/benchmark-native.js --archive=/absolute/frozen-archive.tgz --output=.artifacts/combined-lifecycle-diagnostic --workload=memory --diagnostic
```

마지막 명령은 개발4회 진단이며 `--diagnostic`을 제거한100회(50/50)는 root가 CPU hold와
최종 합산 archive를 확정한 뒤 실행한다. 이번 checkpoint는 그100회나 final P95를 실행하지 않았다.
AT56/82 및 전체071–077의 완료 상태는 변경하지 않는다. R의 resize/reorder 제품 API와 D의
inference workload 추가는 별도 소유이며 이 도구가 대신 구현하거나 완료로 집계하지 않는다.
