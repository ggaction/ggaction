# Inclusive model 수치 검증 보수

## 진행 상태

- [x] 유효한 inclusive 입력의 원래 실패를 literal로 재현
- [x] 저장값을 바꾸지 않고 canonical 차액 식으로 model 검증
- [x] 정렬·tree·partition·두 treemap 방식, 변조 거부와 immutable 검증
- [x] Critical floor, hierarchy 및 source/package/discovery 경계 검증
- [ ] 새 public facade/저장 경계 검토안 승인과 구현
- [ ] 전체 STEP-020·STEP-077 인수 시험

이번 보수는 이미 승인된 private hierarchy 값 계약 안이다. 새 public API 또는 persisted shape를 추가하지 않는다.
[public 연결 제안](../../chart/hierarchy-plots.md)의 pending 결정을 구현하지 않는다.

## 원인과 변경

Parent total0.9, child total0.2인 inclusive 입력은 normalizer가 own/residual0.7로 저장한다.
JavaScript의0.7+0.2는0.8999999999999999이므로 model validator가 합을 다시 만들어 exact 비교하면
정상 모델이 모든 layout에 들어가기 전에 거부된다. 이 결함은 작은 일반 소수에서도 재현된다.

`grammar/hierarchy/model.js`는 inclusive에 대해 childTotal≤totalValue 및
ownValue===totalValue−childTotal을 검사한다. Normalizer의 원 계산과 같은 식이며 tolerance를 넣지 않는다.
Leaf-sum/own-plus-children의 합 검증은 유지한다. Model의 실제 숫자·sourceRows·순서·shape는 바뀌지 않는다.

`test/unit/grammar/hierarchy-model.test.js`는 독립 literal0.9/0.2/0.7과9e307/2e307/7e307,
9e-307/2e-307/7e-307을 사용한다. Tree 좌표[[0,0],[0,3]], partition child2/9,
90×30 treemap의 child area600을 확인한다. 두 treemap algorithm을 모두 소비한다.
Residual0.7000000000000001 변조와 parent보다 큰 child는 정확하게 거부한다.

## 검증

`.artifacts/validation/hierarchy-inclusive/`에 로그를 보존한다.

| 명령 | 결과 |
| --- | --- |
| `node --test --experimental-test-coverage --test-coverage-include=src/grammar/hierarchy/model.js test/unit/grammar/hierarchy-model.test.js` | 7 passed, model lines/branches/functions100/100/100 |
| Canonical `assertCriticalCoverage`, hierarchy owner95/90/100 | passed; 기존 floor 유지 |
| `node scripts/run-tests.js all capability:hierarchy` | 68 passed |
| discovery/source/package-boundaries/package-artifact 계약40개 | 최초39 passed, package unpacked cap만 실패; 나머지 경계 모두 passed |
| `node scripts/run-tests.js contracts contracts/package-artifact.test.js` | 최소 cap 갱신 뒤7 passed; 앞선 유일 실패 해소 |
| `npm run package:check` | 710 entries, packed1,057,037bytes, unpacked4,908,179bytes; exit0 |

최초 실패 package/contracts 로그도 보존한다. Unpacked 기존4,908,000bytes를179bytes 초과했으므로
cap만4,909,000으로 올린다. Entry710과 packed1,061,000 및 browser ceilings는 그대로다.
이 private module은 Full/Basic public import graph에 아직 연결되지 않았으며 새 import edge가 없다.
따라서 이번 변경에서 installed browser bundle을 다시 측정한 것으로 보고하지 않는다.
Stored output·primitive source가 바뀌지 않아5개 시각 승인도 그대로 유지하며 pixel suite를 중복 실행하지 않는다.
