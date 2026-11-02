# 이미 소유한 Geo JSON snapshot의 중복 복사 제거

## 진행 상태

- [x] Root가 다음 병목으로 지정한 normalizeAnimationGeoGroup / snapshotGeometryJSON 검토
- [x] 제품 미변경 loader prototype 및 exact diff 고정
- [x] 구체 경계 채택 기록 후 제품 및 owning tests 반영
- [ ] 동일 archive 검증 및 원 100k rebase/offline, 원 100cycle, exclusive 성능 검증

## 현재 병목과 제안

Raw projection/query의 원 100k native/current는 통과했으나 rebase plan의 global ownedValues WeakSet rehash는 남아 있다. 이전 stack은 snapshotGeometryJSON → normalizeAnimationGeoGroup → prepareGeoInterpolation을 포함한다. snapshot은 이미 owned인 geometry도 전수 검사하며 scratch tree를 만들고, cloneAndFreeze가 이를 다시 복사해 모든 container를 global registry에 등록한다.

[정확 diff](geo-owned-snapshot-review/proposal.patch)는 input.js의 마지막 clone에만 재사용 조건을 추가한다. **원 전체 descriptor 검사·ancestor cycle 검사·순회 순서·raw scratch 생성·예산 count/charge·오류 순서를 그대로 유지한다.** 그 순회가 성공한 후 모든 조건을 만족하면 기존 input을 반환한다.

1. root와 매 방문 container가 현재 isOwned registry에 있다. Object.freeze만으로는 인정하지 않는다.
2. record의 prototype은 Object.prototype이다. null-prototype record는 원 snapshot이 보통 object로 변환하므로 재사용하지 않는다. 배열은 기존 ownArray가 ordinary Array.prototype을 검증한다.
3. 어떤 container도 두 번 방문하지 않는다. 반복 alias는 기존 JSON 복사처럼 서로 다른 출력 branch여야 하므로 재사용하지 않는다.

어느 조건이든 실패하면 전체 원 cloneAndFreeze(output)를 실행한다. root가 unowned면 eligibility용 seen 자체를 만들지 않는다. 유효한 owned tree에서만 마지막 재복사/등록이 사라진다. shallow freezeOwned root+mutable child도 전체 fallback이므로 caller isolation을 보존한다. prototype key와 signed zero, 순서·깊이·quota는 원 output과 같다. 이 private helper의 identity만 이미 owned인 tree로 유지한다. 이후 semantic normalization과 native authority 검증은 생략하지 않는다. 잘못된 restore 입력은 기존 검사와 동일하게 거부한다.

Temporary seen WeakSet은 기존 입력 root가 이미 강하게 보유한 container를 같은 synchronous 순회 동안만 기록한다. retained cache나 새 global registry가 아니며 함수가 반환되면 폐기된다. 최악 O(container count) 임시 entry가 추가되며 원 maxValues 2M/maxDepth 128/work 10M 경계와 원 scratch 할당은 그대로다. registry 회전·삭제·reset, 검증 성공 캐시, 새로운 공개 옵션은 없다. alias fallback 뒤에는 더 이상 seen을 키우지 않는다. 이 변경으로 모든 long-lived 병목이 해결된다고 예측하지 않는다.

## 소형 검산

[proof](geo-owned-snapshot-review/proof.mjs)를 .artifacts/geo-hit-a3/snapshot-reuse/proof.mjs로 복사하고 repository root에서 node로 실행한다. Loader만 바꾸며 제품 source를 수정하지 않는다. 원 baseline 모듈과 후보는 같은 core registry를 사용한다.

41 snapshot 쌍(오류 17개)은 출력·name/message·모든 diagnostics count/work가 같았다. 8개 strict owned tree만 identity를 재사용했다. owned 등록은 2052 → 27이었다. 이것은 소형 사례 계수이며 100k 성능 측정이 아니다. 원 zigzag 1000좌표 geometry 및 native animation group을 포함하며 별도 semantic normalization 3쌍도 같았다.

검사 대상은 mutable/frozen/owned 및 shallow-owned, owned/mutable 반복 alias, null prototype, accessor 읽기 0회, cycle, sparse/extra array, symbol/nonenumerable, NaN/undefined, prototype key, ±0, maxDepth/maxValues 및 작업량 0–7의 정확 경계다. Alias 출력의 서로 다른 identity와 caller 변경 후 snapshot 격리도 확인했다. 원 제품은 이 검토 checkpoint에서 변경하지 않았다.

제품화 시 owning tests는 이력 문서를 의존하지 않고 같은 invariants를 직접 검산한다. 관련 geometry/animation 회귀·owner coverage·same archive 3Node/browser와 원 100k rebase/offline 검증을 이어간다. 원 canonical 5+30/DPR1·2 및 100cycle, 모든 기존 guard/SLO는 유지한다.

## 채택 기록

2026-11-02 Root는 revision `0d700c2b4`의 proposal과 exact diff를 검토하고 남은 사용자 포괄 승인 안의 내부 병목 개선으로 채택했다. 원 순회·scratch·descriptor·budget·오류 순서를 모두 유지한 뒤 deep-owned/ordinary-prototype/alias-free tree만 반환한다. shallow-owned, alias, null prototype, 잘못된 restore 입력의 fallback과 exact diagnostics를 제품 테스트로 고정한다. 전역 registry 변경이나 retained cache 추가는 승인 대상이 아니다. 큰 원규모 실행은 scalar 작업 종료 후 슬롯을 조율한다.

## 제품 검증 checkpoint

채택한 exact diff를 적용했고 설명 주석만 보탰다. Capability owning tests는 엄격한 owned identity 재사용, mutable caller 격리, alias distinctness, null-prototype 정상화, descriptor/cycle/finite JSON 검사, 원 error·count/work, depth/value/work 경계와 잘못된 restore의 semantic 거부를 고정한다. Geo/animation 394개와 집중 36개가 통과했으며 input.js line/branch/function 모두 100%다. Package/discovery 30개, source docs 248개, built docs 186 pages/1607 LLM 검증도 통과했다. 최초 docs 검사는 stale provenance 3개를 보고했으며 canonical generation 후 248/248로 통과했다.

새 archive SHA256은 4fbdf2a66fe9a8396b43dcbc6fde2aba2ca0c5e39275a9fe37ef17115db52fa9다. Node20/24 strict pack bytes가 같고 1262 entries / 1,822,571 packed / 8,191,580 unpacked다. 원 최소 100B 올림에 따라 packed/unpacked ceilings만 1,822,600 / 8,191,600으로 올렸다. 3Node installed runtime·strict TS·실행 문서·6 bundles 및 source-free minified Chromium DPR1/2가 통과했다. Full gzip 788965B는 기존 cap 안이며 animation 343602B의 최소 100B 올림 cap만 343700으로 올렸다. 작은 20vertex 100cycle의 100개 old scene WeakRefs는 모두 회수됐다.

[검증 manifest](geo-owned-snapshot-evidence/verification.json)는 동일 archive와 정확한 범위를 고정한다. 이 시점에 새 archive 원 100k와 원 100cycle/exclusive SLO는 미완료다. 앞선 archive의 큰 rebase 실패를 성공으로 바꾸지 않는다. 원본 read-only proof는 제품 적용 전 revision 0d700c2b4에서 실행하는 기록이다.

제품 source는 `e38fa24c7e7192353fe96884202598c6e59c5742`로 고정했다. 후속 metadata-only pin에서 source docs 248 및 built 186/1607을 다시 검증했고 strict pack SHA256이 동일했다.

## 동일 archive 원 100k 전체 기능

PID 17616는 2026-11-02T12:29:09.291Z부터 2026-11-02T12:32:16.707Z까지 동일 installed archive에서 원 100k 전체 기능을 실행해 exit 0으로 마쳤다. Native 199999 좌표, 339849 parts/1939096 footprint commands와 기존 exact hash, 전체 part를 읽는 scalar 4 queries, current 및 rebase 각각 199999 좌표/3 CSS queries가 통과했다. Rebase 339697 parts, 최대 좌표오차 3.55e-13, 방문 work 25881/58941/31235이며 모든 owner/distance가 맞다. 마지막 format5 serialize/deserialize 후 offline frame에 native hit authority가 없음을 확인했다.

이전 archive에서 반복 정체했던 rebase plan을 이번에는 통과했다. 2초 native sample은 다양한 계산 경로를 보였으며 이전 758/758 rehash 독점 정체와 다르다. 원 기능 입력·수학·guard·oracle 범위는 유지했고 scalar reference-only batch 사이 GC와 기능 phase 사이 GC는 이전 진단 환경 그대로다. 이것은 장기 원100cycle 또는 GC 없는 canonical P95의 통과가 아니다. [원 결과](geo-owned-snapshot-evidence/large-installed.json), 실행 helper, stdout과 sample gzip을 보존했다.
