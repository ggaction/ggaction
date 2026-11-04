# 소유된 값의 own-data 검사 재사용

## 진행 상태

- [x] Geo camera preview 10k 귀속.
- [x] `ownArray`/`ownRecord` 통과 표식(`src/core/ownData.js`)과 반례 시험.
- [x] 전체 검증과 정본 benchmark(archive `6f76b82d…`).
- [ ] Geo 정규화 경로의 좌표 사본 재검사.

## 결정

`ownArray`와 `ownRecord`는 값을 바꾸지 않는 순수 검사다. 소유된 값은 동결돼 있어 prototype과 속성 descriptor가 바뀔 수 없으므로, 한 번 통과한 검사는 이후에도 같은 결과다. 통과 사실을 [소유권 표식](OWNED_MARK_DECISION.md)과 같은 module-private field로 값 자체에 기록하고 다음 호출에서 재사용한다. 수십만 개 값을 다뤄도 weak table 재해시가 생기지 않는다.

- 소유되지 않은 값(caller 동결 객체 포함)은 매번 전체 검사한다.
- 배열은 dense 통과와 sparse 허용 통과를 구분한다. Sparse로만 통과한 배열은 dense 검사를 건너뛰지 않는다.
- 실패한 검사는 기록하지 않으므로 계속 실패한다.
- 순회·work 예산 계량을 하는 상위 경로(예: `snapshotGeometryJSON`)는 그대로 순회하고 각 노드의 검사 비용만 줄어든다.

반례 시험은 `test/unit/core/own-data-checks.test.js`다.

## 결과

Node source, Geo camera preview 10k 한 frame: 약 160 → 130ms. 정본 benchmark(Chromium P95, ms, DPR1):

| 항목 | 이전(`bc7633b5…`) | 이번 | 기준 |
| --- | --- | --- | --- |
| Geo camera 1k/10k/100k | 14.0/131.8/1,345.9 | 10.8/105.6/1,086.1 | 16.7/33/50 |
| Geo hit 100k | 20.7 | 21.2 | 20 |
| Partition layout 100/1k/10k | 2.4/19.5/194.8 | 1.6/12.2/120.3 | 10/50/300 |
| Partition preview 100/1k/10k | 2.8/21.0/239.9 | 2.4/20.4/194.1 | 33 |
| Data load 1k/10k/100k | 6.6/59.2/977.1 | 6.5/86.4/1,029.1 | 100/500/3000 |
| Data revise 1k/10k/100k | 26.3/273.1/2,789.7 | 26.8/280.8/2,809.4 | 100/500/3000 |
| Points full frame 1k/10k/100k | 3.5/27.9/20.5 | 3.1/26.8/21.2 | 16.7/33/50 |

Data load는 표식 부여 비용으로 다소 늘었지만 기준 안이다. 같은 source의 전체 coverage(일반 10547/10547) 97.42/95.68/99.36%, critical floor 785, browser 529/529, render 513/513, 같은 archive Node20/22/24 설치 소비자 통과.

## 다음

Geo 10k의 남은 비용은 정규화 단계가 매 frame 좌표 사본을 새로 만든 뒤 투영 단계가 그 사본을 다시 검사하는 것이다. 입력 좌표가 소유된 값이 아니어서 이번 표식이 적용되지 않는다.
