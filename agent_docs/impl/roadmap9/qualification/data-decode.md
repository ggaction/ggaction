# Editable cell 복원 비용 축소

일반 object cell은 새 plain object의 own data assignment로 복원한다. Prototype에 이미 존재하는 이름은 기존 defineProperty 경로를 유지해 inherited setter, read-only property, __proto__, constructor를 안전하게 보존한다. Tagged numeric(-0/NaN/Infinity), BigInt, undefined, sparse holes, 공유 array, duplicate/forward reference 거부, 오류 위치와 저장 bytes는 그대로다. Caller 객체를 소유권 registry에 등록하거나 codec/공개 schema를 바꾸지 않는다.

[검증 기록](data-decode-evidence/qualification.json)은 persistence와 animation codec 회귀59개, decoder coverage100/98.48/100, 경계·package27개와 최종 cap7개를 보존한다. 동일 Node22 canonical archive를 Node20/22/24에 설치하여 원1k data load/revise 전체좌표·특수값·동일 저장 bytes와6개 entry bundle cap을 확인했다. Public API/선언/Current contract는 변경하지 않았다.

읽기 전용 loader 실험은 원1k 전체 editable load를 baseline→candidate→baseline 순서로 측정했다. 각5warmup/10measurement 전에 explicitGC를 수행했고 모든 실제좌표를 검산했다. Median은 각각13.74/11.31/14.85ms다. 이 작은 진단을 원100k, canonical5+30/P95 또는 blocking50ms 통과로 세지 않는다. 기존 원100k load/revise와 후행 validation·materialization 비용은 남아 있다.

첫 strict pack은 unpacked8,176,459가 이전 cap8,176,200을259bytes 넘었다. Node20pack은1,818,747로 이전 packedcap1,818,700을47bytes 넘었다. 두 실패를 보존하고 두 cap만 실제 최대값으로 맞췄다. Node22 canonical pack은1,815,172bytes, Node20/24는동일1,818,747bytes며 unpacked와1261entries는 같다. 이는 실행 work/row/byte quota의 완화가 아니다.

이 checkpoint는 원 사용자 remainingApproval 범위의 내부 병목 개선이다. STEP056 이후 전체 요구, 원100k/P95/100cycle와 최종 전수 검증은 계속 열린다.
