# Partition 원10k 기능 검증

같은 archive `787e6d78…`(source `27e6e72b7`)를 깨끗한 소비자에 설치해 실행했다. 원 입력(root 1개 + leaf 9,999개, SHA256 `e204dd2c…`)과 원 검산을 그대로 썼다.

- 첫 실행(`first-run-default-capacity.*`)은 `RangeError: Animation guide endpoint size must not exceed 10000.`로 실패했다. 10k partition endpoint는 cell 10,000개와 배경 1개로 10,001 node인데, 계약상 기본 한도는 endpoint 합계와 출력 각각 10,000이다. Partition helper와 정본 `scripts/benchmarks/workloads.browser.js`의 partition workload는 이 크기를 실행한 적이 없어 명시 용량을 주지 않았다.
- 수리: points workload에 이미 있던 규칙(`count >= 10000`이면 `maxEndpointNodes: 2*(count+1)`, `maxOutputNodes: count+1`)을 partition workload와 helper 사본(`large-installed.mjs`)에 똑같이 적용했다. 실측 node 수는 100/1k/10k에서 count+1이다. 커밋된 원 helper는 바꾸지 않았다.
- 결과(`original10k.json`): layout 10,000 검산, native endpoint identity, current·rebase·offline·offline-rebase 각각 10,000 cell × 50,000 명령 전수 검산. offline 해시는 current와, offline-rebase 해시는 rebase와 같다. 15.3초, heapUsed 874MB.

시간 측정이 아닌 기능 검증이다. 33ms preview·300ms layout P95는 별도 기록이다.
