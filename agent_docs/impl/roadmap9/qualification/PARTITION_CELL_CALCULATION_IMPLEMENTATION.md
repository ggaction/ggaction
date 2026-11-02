# Partition cell 계산 준비 제품 checkpoint

## 진행 상태

- [x] 구체안 `5e1f2add6` root 검토·채택, 사전 기록 `2b7b12f5b` push
- [x] 채택 4파일 exact diff 적용
- [x] capability owner 반례 6개 및 group work/hidden admission 반례 편입
- [x] 소형 owner tests 10개 통과
- [x] 적용 제품의 907건 exact 재현
- [x] 누적 owner tests 117/117 및 수정 owner critical coverage
- [x] package/types/contracts/docs 경계 32 tests 및 동일 archive 3Node/browser/원1k
- [ ] 동일 archive 원10k native/current/rebase/offline
- [ ] 최종 합산 archive exclusive P95

## 구현과 계약 경계

[채택 구체안](PARTITION_CELL_CALCULATION_PROPOSAL.md)의 4파일 patch를 그대로 적용했다. `partitionMapping`의 radial 수학, `partitionBend`의 bend/inset 수학, `partitionAdapter`의 screen 변환은 각각 단일 private 계산 owner를 유지한다. 기존 generic wrapper는 모든 입력 검사와 반환 동결을 유지한다. 한 cell 내부의 준비 factory도 처음부터 같은 입력을 검증하고 scalar 값만 지역 closure에 캡처한다. 생성되는 후속 point의 범위 검사를 유지하면서 고정 frame/kernel 검사와 중간 point/interval의 전역 owned 등록만 줄인다. 최종 `cloneAndFreeze`는 그대로다.

공개 API·persisted format·옵션·기본값·renderer·public entry export·TypeScript 선언은 바뀌지 않는다. `SECOND_ARCHITECTURE`의 기존 수학/화면변환/module ownership과 semantic/materialization 경계도 그대로다. 현재 [Partition 계약](../../../contract/current/PARTITION.md) 및 공개 Partition/animation 문서의 기존 관찰 가능한 행동을 보존하므로 새 계약 문구나 선언을 추가하지 않는다. 원 guard, 정규화 상태, codec/restore admission, geometry work formula, animation kernel authority는 변경하지 않는다. package의 내부 모듈 파일 수는 증가하지 않는다. 패키지 한도는 실측 전 변경하지 않는다.

`test/unit/grammar/partition-cell-calculation.test.js`는 양 radius policy·bend endpoint/subnormal·큰 회전·handedness·gap·hidden cell을 generic 수학과 exact 비교한다. 오류 전체 own property/diagnostics를 비교하고 다중 부정 입력의 우선순위, 접근자 호출 0, 후속 point 범위검사, mutable/shallow-owned/null-prototype 격리 및 최종 deep-owned 결과를 고정한다. 기존 literal/independent oracle tests와 함께 검증한다. `test/unit/animation/partition-cells.test.js`는 원 10M work formula 거부와 all-hidden group에서 불필요한 새 frame admission을 하지 않는 경계를 고정한다. 신규 테스트는 `partition` capability에 등록했으며 runtime tests는 roadmap helper를 import하지 않는다.

## 재현

적용 제품이 채택된 4파일 patch와 byte-identical인지 먼저 검사하고, 원907건의 결과·오류·실제 수학·역산 iteration·전체 work·객체 검사/등록 계수를 committed candidate receipt와 전수 비교한다. 기록 당시 원본 revision과 같은 Git 이력이 필요하다.

```sh
node agent_docs/impl/roadmap9/qualification/partition-cell-calculation-evidence/verify-product.mjs /absolute/output
```

원10k functional helper는 실제 설치된 package 전체 파일을 receipt가 가리키는 고정 archive와 byte 비교한 뒤 원 benchmark의 root 포함10,000node·폭400→600 입력을 쓴다. 전체 layout interval 및 current 10,000cell의 모든 commands/decision을 독립 사각형 식으로 확인하고, current rebase와 원/재개 plan offline replay를 전수 비교한다. 명시적 GC나 timer/SLO 변경은 없다. 이 검사는 기능 검증이며 원5+30·DPR1/2 최종 성능 실행을 대체하지 않는다.

```sh
node agent_docs/impl/roadmap9/qualification/partition-cell-product-evidence/large-installed.mjs --package-root=/absolute/consumer/node_modules/ggaction --receipt=/absolute/archive.json --output=/absolute/result.json
```

## 남은 범위

원10k 기능 및 최종 합산 P95는 아직 완료하지 않았다. 동일 archive 3Node/browser/원1k 기능은 아래 결과로 확인했다. CPU 순서는 scalar canonical3Node → root Geo 합산 → scalar full normal coverage이며 root의 슬롯 배정 뒤 긴 검증을 진행한다. 소형 테스트 통과나 준비된 helper를 원10k/P95 성공으로 기록하지 않는다. 원33ms preview/300ms layout,5+30,DPR1·2와 STEP057–070/077 의무를 유지한다.

## 적용 제품 검사 결과

제품 소스 4파일을 채택된 candidate transformation과 byte 비교했고, `verify-product.mjs`의907건 모두 candidate와 결과·오류·수학·역산 iteration·전체 work 및 객체 검사/등록 계수까지 일치했다. [제품 proof](partition-cell-product-evidence/proof.json)와 [전체907행](partition-cell-product-evidence/product.json.gz)을 보존한다. 원1k sample은 실제 bend11,003회·inverse1,000회·guard8,096회·ownData27,056회·owned등록22,074회다.

Owner grammar/animation/resource/chart tests **117/117 pass**. [coverage receipt](partition-cell-product-evidence/coverage.json), [원 로그](partition-cell-product-evidence/coverage.log.gz). 기존 각파일95% lines/90% branches/100% functions 기준을 그대로 적용했다.

| Owner | Lines | Branches | Functions |
| --- | ---: | ---: | ---: |
| partitionMapping | 100 | 100 | 100 |
| partitionBend | 98.78 | 97.26 | 100 |
| partitionAdapter | 100 | 100 | 100 |
| partitionCell | 100 | 100 | 100 |

이 검사는 source 기능/coverage 증거이며 동일 archive, 원10k 또는 성능 qualification을 대신하지 않는다. 실행 종료 후 CPU 슬롯을 root에 반환했다.

## 동일 archive 제품 checkpoint

[검증 summary](partition-cell-product-evidence/summary.json), [archive receipt](partition-cell-product-evidence/archive.json), [설치본 receipt](partition-cell-product-evidence/installed.json). 고정 archive SHA256은 `bb78b18bdda0f13451c84e469b6c42609a27898c6f297194427c4f1b853fab48`이며1268entries/1,827,690packed/8,230,957unpacked bytes다. Node22·24 사전 pack에서 같은 bytes였다. 기존 file count/packed 한도는 유지하고 실제 증가한 unpacked만8,231,000으로 조정했다. 6번들의 Node20/24 최댓값 중 animation343,976gzipbytes만 기존343,701을 넘어 해당 한도만 실제값343,976으로 변경했다. Root 통합 한도는 해당 합산 실측으로 별도 유지해야 한다.

같은 설치본에서 Node20.20.2/22.23.1/24.22.1의 기존 public Partition runtime fixture(offline4renderers, current interruption, fallback/immutable failure), strict TypeScript animation fixture,6번들 크기 경계가 통과했다. 공개 `tutorials/partition.md` 실행 및 browser의 source-free Canvas/SVG DPR1·2/current/rebase pixel oracle도 통과했다. 브라우저 provenance harness의 `/var` realpath 및 명시 inline `<stdin>` virtual module 처리를 수정한 후 별도 명령으로 동일 설치본을 재검사했다. 실제 모든 bundle input은 설치 consumer 내부임을 검산하며 checkout runtime은 허용하지 않는다. 제품 소스는 수정하지 않았다.

원1k helper는 `--nodes=1000`으로 실행했으며 기본값은 원10k로 유지했다. PID49313,2026-11-02T14:45:40.763Z–14:45:42.581Z. 모든1,000 layout interval과 current/rebase/offline/offline-rebase 각각1,000cell·5,000commands를 검산했다. 현재 frame hash`b1e9c2ddebd685dc6d7e0d51a4bfdbffb8feca303d956ee7d02b7ec75e3280f4`는 승인 proof와 exact다. [전체 결과](partition-cell-product-evidence/original1k.json). 이1k를 원10k 성공으로 세지 않는다.

작은2node 설치본 반복에서100개 과거 frame WeakRef 모두 회수됐다([retention](partition-cell-product-evidence/retention.json)). canonical memory100cycle 및 큰 반복 workload의 대체가 아니다. 패키지 경계·artifact·test discovery·hierarchy/animation types tests32/32 통과([로그](partition-cell-product-evidence/contracts.log.gz)). 공개 API/format/선언과 기존 contracts/docs 행동은 그대로다. 현재 checkpoint는 기능·패키지 진전이며 원10k/P95와 원STEP077 전체 완료 주장을 하지 않는다.

재현 시 `node scripts/package-artifact.js --pack > /absolute/archive.json`으로 정상 validation을 통과한 archive receipt를 만들고 다음 helper에 전달한다. 설치 helper는3개의 Node binary 절대 경로를 순서대로 받는다. 기존 절대 임시 consumer 경로를 요구하지 않는다.

```sh
node agent_docs/impl/roadmap9/qualification/partition-cell-product-evidence/installed.mjs /absolute/archive.json /absolute/output /absolute/node20 /absolute/node22 /absolute/node24
```

원1k 기능 검사는 앞의 `large-installed.mjs` 명령에`--nodes=1000`을 추가한다. 기본 원10k는 별도 슬롯에서 동일 archive로 실행한다. 측정 SLO·original count·guard를 낮추지 않는다.
