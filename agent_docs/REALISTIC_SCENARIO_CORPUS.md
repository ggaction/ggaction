# 현실형 TidyTuesday 시나리오 코퍼스

현실형 코퍼스 러너는 고정된 실제 TidyTuesday 데이터셋 50개로 3,600개 시나리오를
생성하고, 실행 trace와 option/literal 관측값을 실제 렌더 결과에 연결해 검증한다.

## 실행 명령

- `npm run scenarios:realistic`: SVG와 PNG 3,600개 및 대표 PDF 100개를 만든다. 실패 0,
  데이터셋·복잡도 분포, 모든 action/option/literal/interaction 최소 커버리지를 통과한
  실행만 `latest`로 승격한다.
- `npm run scenarios:realistic:audit`: 아티팩트 파일을 쓰지 않고 SVG 실행 증거로 같은
  3,600/50 및 action/option/literal/interaction gate를 강제한다. PNG·Canvas·PDF만 이
  명령의 ledger에서 제외하며 다른 결손은 성공으로 완화하지 않는다.
- 부분 진단은 `node --expose-gc scripts/run-realistic-scenarios.js --allow-partial --limit=N`처럼
  명시한다. 부분 실행은 coverage report를 남기지만 gate 성공이나
  `latest`로 취급하지 않는다.

각 실행은 `.artifacts/scenarios/realistic/` 아래 고유 run id 디렉터리를 사용한다.
정상 전수 아티팩트 실행은 `runs/`, 무아티팩트 strict audit은 `audits/`, 부분 실행은
`partial/`에 보존된다. `latest`는 완전히 기록되고 strict gate를 통과한 immutable
`runs/<run-id>`만 가리킨다. 생성 실패, renderer 실패, coverage 결손, 중단된 실행은 기존
`latest`를 변경하지 않는다.

실행 동시성은 1로 고정한다. 개별 시나리오 timeout 기본값은 120초, descriptor generation
timeout 기본값은 1,800초다. Descriptor generation child는 288MiB, chart execution child는
224MiB old-space 제한을 사용한다. 정상 경로에서 각 dataset의 72개 chart는 최대 24개씩 세 개의
child에서 순서대로 실행하고, child는 각 결과의 IPC 직렬화가 끝난 뒤 GC하며 종료 전에 source
cache를 비운다. Crash·timeout·protocol 오류 뒤에는 이전 child의 종료가
확인된 경우에만 남은 scenario를 새 child에서 계속한다. SIGTERM과 SIGKILL 뒤에도 종료를 확인할
수 없으면 프로세스 중첩을 허용하지 않고 전체 실행을 실패로 닫는다.

Artifact execution은 deterministic replay가 끝난 뒤 native Canvas·PNG·PDF 렌더를 시작하기
전에 한 번 더 GC하여 두 단계의 일시 객체가 겹치지 않게 한다. 정상 strict artifact run은 execution
child의 전체 RSS high-water가 512MiB 이하여야 한다. 이 gate를 넘으면 immutable run과 resource
report는 보존하지만 `latest`로 승격하지 않는다. 진단용 `--no-artifacts`와 `--allow-partial` 실행은
이 promotion gate를 적용하지 않는다.

Execution의 224MiB 상한은 peak dataset의 maximal regression과 maximal histogram을 포함한
24개 bounded batch를 완료하는 guardrail이다. 192MiB 이하는 최신 maximal workload에서 V8 OOM이
발생했다. Parent는 완료된 dataset outcome을 checksum이 있는 V8 structured-clone binary 임시
chunk 하나로 합쳐 기록하고 모든 execution child가 종료한 뒤 다시 읽으므로, `undefined` own
property 같은 wire 의미를 잃지 않으면서 이전 outcome object graph와 다음 child RSS가 동시에
누적되지 않는다.

Resource report는 child high-water, coordinator lifetime high-water, execution-phase sampled
coordinator RSS와 IPC 시점의 combined sample을 구분한다. `maximumConservativeCombinedRssBytes`는
서로 다른 시점의 lifetime maxima를 더한 상계이며 실제 동시 process-tree peak가 아니다.
정상 50-dataset 전수 실행은 24개씩 3회인 child record 150개를 순서대로 남기며 각 record의
`firstScenarioIndex`와 `requestedScenarios`가 batch 경계를 식별한다.

`manifest.json`은 recipe뿐 아니라 실제 factors, semantic/graphic fingerprint, SVG hash,
renderer와 artifact 검증 결과를 함께 기록한다. 따라서 성공한 chart를 해당 manifest
항목으로 다시 구성하고 생성 당시 의미·그래픽과 비교할 수 있다.
