# Partition cell 내부의 검증된 수치 계산 재사용

## 진행 상태

- [x] Root의 `PARTITION_SAMPLE_CPU_AUDIT` 및 remainingApproval 범위 확인
- [x] 4파일 exact diff와 source-hash 고정 재현 helper
- [x] 907건 baseline/candidate 출력·오류·수학·역산·work 비교
- [x] 원1k 공개 sample의1,000cell 전수 oracle, current/rebase/offline/SVG
- [x] 후보 loader로 기존 owning tests57개 통과
- [x] Root concrete checkpoint 검토·채택
- [ ] 채택된 exact diff 제품 적용
- [ ] 제품 critical coverage·동일 archive·원10k 기능 및 최종 합산 성능

Root는2026-11-02에 기존 [remainingApproval](../AUTHORIZATION.json#remainingApproval) 범위의 내부 최적화로 구체 read-only 후보를 요청했다. 새 사용자 승인 질문·새 공개 API/schema 결정은 없다. **이 checkpoint는 제품 미적용 상태**이며, root가 four-file diff와 반례 증거를 먼저 검토한다. 기반은`c8bac0e77`이고 기존 clean Partition managed worktree에서 이전 branch를 보존한 채`codex/roadmap9-partition-sampling` branch를 만들었다. Geo C1 작업 트리는 그대로 보존했다.

## 범위와 계산 흐름

[원 CPU 감사](PARTITION_SAMPLE_CPU_AUDIT.md)의 geometry915ms/ownData593ms는 **원1k full sample10회**의 중첩 CPU 표본이다. P95나 한 프레임 시간이 아니다. 이번 후보는 그 경로 중 **각 cell의 한 동기 호출 안에서만** 이미 검증한 고정 frame/kernel 숫자를 재사용한다. cell 간 캐시나 전체 group의 새 admission 우회는 도입하지 않는다. 각 cell 첫 검사를 유지한 채 꼭짓점·depth·역산의 같은 옵션 재검사와 임시 점 동결만 줄인다.

[proposal.patch](partition-cell-calculation-evidence/proposal.patch), SHA256`0486ecf3a4d9db42e6d31cb707661396012ed2f5315ddb9647362565ee85fa4f`:

1. `partitionMapping.js`: 기존 radial validation과 private `radius` 수학을 공유한다. 일반 `partitionRadius`는 full admission을 유지한다. 새 내부 preparation은 최초 v/옵션을 같은 순서로 검사하고 정규 radial 수치만 지역 closure에 캡처한다. 이후 v의 원 finite/unit 검사는 계속 수행한다.
2. `partitionBend.js`: point 검사·고정 kernel 검사·실제 bend 수학을 분리한다. 기존 `bendPartitionPoint` wrapper는 기존 검사와 deep freeze를 유지한다. 새 내부 preparation 역시 full point/kernel/radius admission을 수행하고, 이후 point 검사·radius 범위검사와 같은 수학을 호출한다. 원 inset 계산을 private owner로 추출하되 generic inset의 cell→gap→depth 순서와 반환 동결은 유지한다. 준비 경로의 point와 interval만 raw 임시 값이며 cell 최종 freeze가 소유한다.
3. `partitionAdapter.js`: screen 변환 수학을 한 private owner로 공유한다. generic mapping은 frame 검사→canonical bend→screen finite 검사→deep freeze의 기존 순서를 유지한다. 내부 preparation은 최초 frame/point/kernel 검사를 완료한 후 origin·angle·handedness 숫자만 캡처한다. raw 입력에 대해 검사를 건너뛰는 token/helper는 없다.
4. `partitionCell.js`: 기존 outer frame·segment guard 이후 해당 cell의 mapping을 준비한다. 원 중점 probe를 실제로 계산한 다음 cell/gap admission과 inset을 수행한다. 꼭짓점 순서와 anchor를 같은 계산으로 만들고 기존 최종 `cloneAndFreeze({commands,anchor,interval})`를 유지한다. 보이지 않는 cell은 원처럼 probe/inset 뒤 null이며 임시 좌표/interval만 더 이상 전역 owned registry에 등록하지 않는다.

`partitionGeometry.js`, animation state/interpolation, restored-state admission, native authority, geometry work formula와 generic materializer 호출 구조는 **변경하지 않는다**. shared cell builder의 native/private frames도 같은 수학을 쓴다. 새 package export/TypeScript API/schema는 없다. raw 계산 함수 자체는 module-private이며 외부 입력을 받는 내부 preparation factory는 full admission을 수행한다. 지역 closure는 한 cell 호출이 끝나면 버려지고 program/plan/meaning이나 전역 cache에 저장되지 않는다. 원 proxy 안내대로 plain-data admission은 Proxy trap 실행을 sandbox하는 경계가 아니다.

## 오류·수학·자원 보존 근거

최초 cell 호출 순서는 원 outer frame own-data/closed 검사→원 `.2px` tessellation 또는 explicit1…4096검사→basis/frame/point/kernel/radius 검사 및 중점 probe→cell interval→gap→depth/inverse→points/anchor→최종 동결이다. 이 순서를 바꾸지 않는다. 이후 반복 검사는 같은 동기 호출의 캡처된 finite scalar 값에만 생략한다. 입력을 단순 `isOwned`로 신뢰하지 않고, mutable/shallow-owned frame도 처음부터 검사한다. 별도 cell에서 바뀐 frame은 다시 전수 검사한다.

- bend0/1 branch·small-b cancellation 식·radius policy·연산 순서·Math.sin/cos 호출 위치는 그대로다. generic와 준비 경로가 같은 수학 owner를 사용하므로 식 복제는 없다.
- depth 역산의 원64회 상한·early exit 및 `finiteMidpoint` 순서, tangent/gap/visibility 수식, 점 순서와 closed path를 그대로 둔다. 첫 v와 나머지 생성 v/u/bend 범위 검사도 유지한다.
- kernel.sweep의 원 raw 값과 bend 수학의 `sweep ?? 2π`를 구분해 캡처한다. 따라서 빠진/null sweep이 inset tangent에서 보이던 원 결과/오류도 임의 정규화로 바꾸지 않는다.
- finite output guard,4096segment cap, 실제 geometry work formula 및 restore/group의 누적 work는 변경하지 않는다. 작은 proof에서도10M 초과 work를 동일 오류로 거부했다. 원 범위를 줄이거나 반복 횟수를 낮춘 성능 측정은 없다.
- 최종 cell commands/anchor/interval 및 generic wrapper 결과는 deep frozen이다. raw 임시 좌표가 외부 public 결과로 노출되거나 과거 frame을 보관하는 경로는 없다.

## 재현과 반례

Node22.23.1 이상에서 root 기준으로 실행한다. helper는 원4파일 SHA를 먼저 검산하며 제품 파일을 쓰지 않는다. baseline과 candidate는 별도 프로세스이고, data identity만 동일 deterministic UUID sequence로 생성한다. 결과 hash는 object property order와 `-0`까지 구분한다. 경로를 생략하면 `.artifacts/partition-cell-proof`에 기록한다.

```sh
node agent_docs/impl/roadmap9/qualification/partition-cell-calculation-evidence/run.mjs /absolute/output-directory
PARTITION_PROOF_MODE=candidate node --import ./agent_docs/impl/roadmap9/qualification/partition-cell-calculation-evidence/loader.mjs --test test/unit/grammar/hierarchy-partition-bend.test.js test/unit/grammar/hierarchy-partition-mapping.test.js test/unit/grammar/hierarchy-partition-adapter.test.js test/unit/animation/partition*.test.js test/unit/resources/partition-frames.test.js
```

[summary](partition-cell-calculation-evidence/summary.json), [baseline rows](partition-cell-calculation-evidence/baseline.json.gz), [candidate rows](partition-cell-calculation-evidence/candidate.json.gz), [owning log](partition-cell-calculation-evidence/owning-tests.log.gz).

**907건 전부 결과/오류/수학 계산 횟수/역산 iteration/전체 work guard trace가 exact**다. 그중79건은 오류이며,77건 generic wrapper는 own-data/owned등록 계수까지 동일하다. 기존 owning tests **57/57 pass**, `git apply --check` 통과다. scope는 다음을 포함한다.

- ±0, Number.MIN_VALUE·1e-300·1e-12,1e300·Number.MAX_VALUE, bend0/1/중간값, equal-depth/equal-depth-area, 회전1e18·양 handedness, zero/tiny/normal/hidden interval,0/보통/전체 소거 gap.
- explicit4096 및4097/소수/비finite segment, invalid frame/kernel/radius/sweep, unknown fields, cell/gap 오류 중첩의 첫 오류, frame/kernel/cell/gap accessor 호출0, mutable/frozen-unowned/shallow-owned/null-prototype caller 격리.
- generic radial/bend/map/inset/tessellation의 전체 검사와 output ownership, 원 work guard 거부 및 all-hidden group에서 불필요한 새 frame admission을 수행하지 않는 경계.
- canonical과 같은 root 포함1k star hierarchy·폭400→600의 전체1,000cell 꼭짓점·닫힌 commands·1,000 semantic decisions를 독립 식으로 검산했다. 공개 sample/current rebase/offline 전체 frame 및 SVG가 baseline과 exact다.

원1k **완전한 sample1회 계수**:

| 계수 | Baseline | Candidate |
| --- | ---: | ---: |
| 실제 bend 수학 | 11,003 | 11,003 |
| 역산 loop iteration | 1,000 | 1,000 |
| 실제 work/size guard 호출 | 8,096 | 8,096 |
| ownDataProperties 호출 | 56,056 | 27,056 |
| ownedValues 신규 등록 | 38,074 | 22,074 |

이는 연산/할당 원인을 좁히는 읽기 전용 계수다. wall time/P95/SLO 합격이나 원10k 완료를 의미하지 않는다. 더 큰 범위의 cell 간 준비 재사용은 별도 exact admission 근거 없이 여기 섞지 않는다.

## 이후 제품 검증

Root의 concrete checkpoint 검토 후 동일 diff를 적용하고 핵심 반례를 capability tests로 옮긴다. 수정 owner critical coverage, native/current/rebase/offline·renderer·동일 archive3Node·retention을 확인한다. 원10k 큰 실행은 scalar와 슬롯을 조율하며, 원33ms preview/300ms layout와5+30/DPR1·2를 최종 합산 archive의 exclusive 측정으로 검증한다. STEP057–070/077 및 원 전체 범위는 계속 남아 있다. Root의2026-11-02 지시에 따라 scalar의 단독 canonical3Node100k CPU구간에는 긴 owning/coverage/대규모 측정을 보류한다.

## 구체안 채택 기록

2026-11-02 root는 remote checkpoint `5e1f2add6427659b68f73d9a92f5bc87ca63c12a`의 문서·907건 summary·위 SHA의 4파일 patch를 검토하고 기존 사용자 remainingApproval 범위에서 채택했다. 동일 diff의 제품 적용과 capability owner 반례 편입을 진행한다. 공개 API/format 변화는 없으며 generic wrapper의 오류 순서·최종 deep freeze·64회 역산·.2px tessellation·4096 상한·기존 work를 유지한다. 새 사용자 승인을 요구하지 않는다. 원10k/current/rebase/offline 및 최종 합산 P95 의무는 유지한다. scalar canonical3Node → root Geo 합산 → scalar full coverage CPU 순서 동안 작성·작은 검사만 진행하며 긴 검증은 root와 조율한다. 이 채택 기록을 제품 수정 전에 별도 commit/push한다.
