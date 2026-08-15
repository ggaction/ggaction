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

기본 동시성은 최대 4이며 명시값도 4를 넘길 수 없다. 개별 시나리오 timeout 기본값은
120초, descriptor generation timeout 기본값은 600초다. 두 npm 명령은 `--expose-gc`로
실행되어 데이터셋 경계에서 source/factor cache를 비운 직후 회수 가능한 메모리를
반납한다.

`manifest.json`은 recipe뿐 아니라 실제 factors, semantic/graphic fingerprint, SVG hash,
renderer와 artifact 검증 결과를 함께 기록한다. 따라서 성공한 chart를 해당 manifest
항목으로 다시 구성하고 생성 당시 의미·그래픽과 비교할 수 있다.
