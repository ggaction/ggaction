# 공통 animation frame sampling 귀속과 준비 scale 재사용 검토

상태: `ready-for-review`. 2026-11-02 root 지시의 **읽기 전용 설계 감사**다.
제품, types, public docs, fixture, guard 변경은 0이다. 구현은 root가 이 구체안을
채택한 뒤 별도 checkpoint로 진행한다. 전체 작업 승인은
[AUTHORIZATION.json](../AUTHORIZATION.json)의 `remainingApproval`을 재사용하며
새 사용자 질문이나 전체 완료 주장을 만들지 않는다.

기존 안정 branch `codex/roadmap9-animation-codec`, HEAD `1064af592`는 보존했다.
감사는 별도 managed worktree `roadmap9-frame-sampling`, branch
`codex/roadmap9-frame-sampling`에서 수행했다. 검증한 runtime는 root 통합 중 읽어
고정한 1,300파일이며, 이후 root commit
`f2b28364b7555b9af823d9270dea1c2c09e8d9e9`의 Git object와 전부 일치했다.
[입력 manifest](frame-sampling-evidence/source-inputs.json)의 aggregate는
`b1f2d096af4f54c60f0b5914e43bfa7b20e436f029586ac842cec80d9f343bc7`이다.
이는 root의 앞선 `positions.js` exact-owned local 최적화와 `appearance.js`
빈 patch 재사용을 포함한다. 이후 root의 다른 변경까지 검증했다는 뜻은 아니다.

## 측정 경계

원 `scripts/benchmarks/workloads.browser.js`의 point **1,000행** native fixture와
그 `full-frame` stage를 그대로 썼다. 400×400, margin20, x domain [0,1]→[0,2],
y domain [0,1], duration100/linear, sample50이다. 입력 rows SHA256은
`0cb35b3589aef172e7bb808aaacf47ed1050cc7abd4fce62d2b1604f6904fcb6`이다.
모든 1,000 좌표를 기존 oracle로 확인하고, 동일 plan 또는 **동일 원 program 쌍**의
대안 plan을 전체 frame `deepEqual`로 비교했다. 생성된 논리 data UUID가 프로세스마다
달라지므로 서로 다른 프로세스의 frame/wire SHA가 같다고 주장하지 않는다.
각 실행 내부 before/after는 같은 IDs, state, graphicSpec, scene, decisions를 비교한다.

Node24.22.1 CPU profile은 5 warmup 뒤 30 sample, sampling interval250µs다.
다른 실행에서만 operation counter를 켰다. Timing 비교는 counter와 profiler를 끄고
원본/후보를 ABBA 순서로 각30회 실행했다. Node/GC/OS 부하의 소형 진단이며
browser P95, 100k, retained heap, 50ms SLO 증거가 아니다. 원1k/10k/100k 수와
16.7/33/50ms 기준은 그대로다. 큰 실행 슬롯, heap, 입력, 프레임, ID를 변경하지 않았다.

## 현재 비용의 정확한 위치

원본 1k sample 한 번에서 core `cloneAndFreeze` 호출9,020회,
**복제14,037개**(array5,022/object9,015), core `ownedValues.add`22,042회였다.
전체 `Object.freeze`22,053회, 모든 WeakSet의 add36,080회, has65,147회다.
WeakSet 총계에는 core ownership 외에 clone ancestors와 endpoint proof도 포함된다.
여기서 복제 수는 **core가 만든 clone만** 세며 원래 object literal/map이나
prototype guard의 임시 배열을 포함한 전체 할당 수가 아니다.

| 실행 소유 위치 | core clone | core owned add | 구체 생성물 |
| --- | ---: | ---: | --- |
| `samplePositionInterpolation` 자체 | 2,000 | 8,000 | x/y 결과2,000 + local scale/domain/range6,000 |
| 위 호출의 `mapLinearValues` | 2,000 | 2,000 | scalar mapping의 길이1 결과 배열 |
| `sampleNode`의 node snapshot | 5,000 | 5,000 | node/property2,000 + offset/clip/clips3,000 |
| `registerAnimationFrame` positions | 3,001 | 3,001 | vector1 + row/x/y3,000 |
| sampled endpoint projection | 0 | 2,005 | matching1,000, sources1,001, root/array4 |
| `canvasSceneProgram` graphic snapshot | 1,008 | 1,008 | concrete wrapper/map/canvas/children |
| 최종 frame/decisions snapshot | 1,003 | 1,003 | frame1, decision1,001, decision vector1 |
| scene snapshot | 2 | 2 | scene와 nodes vector |

작은 기타 family vector/root도 포함한 전체 수가 위 총계다. rows는1,000이지만
배경 node1이 있어 scene/decisions 길이는1,001이다. 전체 counter와 scope별 값은
[allocations.json](frame-sampling-evidence/allocations.json)에 있다.

575,416µs profile의 nearest-source-owner 귀속은 `freezeOwned`152,374µs(26.48%),
`cloneAndFreeze`55,582µs(9.66%), 내부 `copy`42,751µs(7.43%)다. 이 셋은 서로
겹치지 않는 leaf 귀속이며 전체43.57%다. core 내부 leaf에서 가장 가까운 non-core
caller로 역귀속한 값은 다음과 같다. 이 표와 앞의 owner 표를 더하면 중복이다.

| core를 호출한 owner | µs | 전체 profile 비율 |
| --- | ---: | ---: |
| `samplePositionInterpolation` | 85,079 | 14.79% |
| `mapLinearValues` | 22,543 | 3.92% |
| `registerAnimationFrame` | 45,041 | 7.83% |
| `sampleNode` | 44,627 | 7.76% |
| `sampleTransitionWithBudget` | 22,584 | 3.92% |
| `canvasSceneProgram` | 19,251 | 3.35% |
| endpoint matching callback | 16,998 | 2.95% |
| matching callback + `indexIdentities` | 11,542 | 2.01% |

`validateGraphicIdentity`의 직접 nearest-owner 귀속은12,875µs(2.24%),
`ownDataProperties`10,458µs(1.82%), concrete property validator1,208µs(0.21%)다.
각각 다른 위치에서 호출되므로 validator 수치를 전부 sampleNode 탓으로 묶지 않는다.
짧은 `interpolateNodeFrame` 자체의 sample 수는 별도 유의미한 상한을 주지 못한다.
그 함수가 만든3,000 배열의 **후속 복제 비용**은 node snapshot counter에 정확히 잡힌다.
전체 stack/raw profile은 [baseline.json](frame-sampling-evidence/baseline.json)과
[baseline.cpuprofile.gz](frame-sampling-evidence/baseline.cpuprofile.gz)에서 재검토할 수 있다.

`canvasSceneProgram`의 `position(properties,dx,dy)`는 offset이0이면 이미 원 properties를
반환한다. 이 fixture의 point properties를 scene→graphic에서 다시 복제한다는 가설은
맞지 않는다. 현재1,008 clone은 주로 wrapper다. scene cache는 매번 새 scene이어서
다른 프레임 간 hit가 없으며, mutable caller scene의 descriptor snapshot/digest 경로는
그대로 필요하다.

## 작은 후보: 동일 owned geometry vector

`interpolateNodeFrame`의 offset/clip이 exact core-owned dense numeric array이며 양쪽
길이/모든 값이 `Object.is`로 같고 progress가 유효하면 to vector를 재사용한다.
빈 clips도 양쪽 exact-owned ordinary 빈 배열일 때만 재사용한다. sparse/extra property,
caller-frozen 배열은 기존 map 경로로 보낸다. 함수의 현재 `interpolateNumber`는
`from===to`일 때 from을 반환하므로 `-0`을 `+0`으로 바꾸는 비교는 허용하지 않는다.

Loader prototype는 전체 frame exact와32 경계 경우(owned/caller freeze, sparse,
±0, nonempty clips, progress0/.37/1/NaN), frozen frame clone/위조 plan 거부를 확인했다.
core clone14,037→11,037, owned add22,042→19,042, WeakSet add36,080→30,080였다.
보수적 guard는 `isOwned`6,000회를 더한다. `getOwnPropertyNames`와 index scratch도
만들므로 **전체 할당3,000 감소**라고 해석하면 안 된다. Timing용 prototype는 index
scratch를 for-loop로 바꿨다. median14.106→13.527ms였지만 큰 gap의 해법은 아니다.
[reuse-timing.json](frame-sampling-evidence/reuse-timing.json)을 참조한다.

## 우선 제안(b′): raw endpoint 유지와 새 sampled-rebase의 lossless encoding 선택

Root가 선호한 대안(b)를 sampled-rebase 검증 결과에 맞춰 한정한 대안(b′)다.
**새 sampled-rebase v4 encoding bytes까지 완전 불변인 안은 아니다.** 아래 차이를
명시적으로 채택하기 전 제품 연결은 하지 않는다. 현재 `materialization/animation/point.js position()`의
raw scale 복제와 **저장된 endpoint positions**는 바꾸지 않는다. `assemble()`에서
point track를 준비하는 동안만 opaque context를 하나 만들고, 기존 `track()`를 거쳐
`preparePositionInterpolation`의 private 세 번째 인자로 전달한다. Native와 restore가
같은 `assemble`을 사용하므로 동일하게 적용된다. 공개 options/schema/kernel/version은 없다.

Context는 최대 **4개** normalized scale와 circular 교체 index만 갖는다. 4개는
2개 endpoint×2개 좌표의 원 point fixture를 담는 작은 최적화 용량이며 지원 quota가 아니다.
더 많은 scale가 나오면 기존 검사를 모두 마친 뒤 miss/교체한다. 거부·행 삭제·축 선택을
만들지 않는다. key는 아래 exact primitive tuple이며 `Object.is`로 순서대로 비교한다.

```
[type, domain[0], domain[1], range[0], range[1], clamp,
 hasOwn(base), base, hasOwn(exponent), exponent, hasOwn(constant), constant]
```

1. 기존 `normalizePositionEndpoint`를 양쪽에 **그대로** 실행한다. own-data/unknown,
   type/parameter/clamp, dense domain/range, 실제 input.value mapping/finite 검사를 생략하지 않는다.
2. 기존 compatibility 검사를 같은 순서로 수행한다. 실패는 같은 이유로 끝난다.
3. 성공한 normalized scale만 context에서 비교한다. Miss는 `cloneAndFreeze`로 새 owned
   normalized scale를 만들고 등록한다. Hit는 그 exact normalized 결과를 재사용한다.
   caller 배열은 stamp하지 않으며, source object/frozen/내용 hash만으로 proof를 주지 않는다.
4. prepared position plan만 이 scale를 공유한다. Raw endpoint와 export 입력은 원 구조다.
   Context/token은 결과 plan, frame, wire에 저장하지 않고 `assemble` 반환 때 수명을 끝낸다.

그다음 grammar module은 위 **정확히 검증되어 발급된 normalized scale**의 from→to
pair에만 중간 scale를 재사용한다. `WeakMap<fromScale,WeakMap<toScale,slot>>`이고
slot은 `{progress,scale}` **하나**다. Progress 비교는 `Object.is`이며 달라지면 덮어쓴다.
동일 progress의 domain/range 보간·collapse 판정·3개 객체 freeze를 한 번만 수행한다.
매 row의 value 보간, `mapContinuousScaleValues([value],scale)`, RangeError→fallback,
finite 판정, 결과 생성은 그대로 실행한다. 값이 다른 행의 mapping 실패를 공유하지 않는다.
Endpoint0/1은 기존 exact branch를 그대로 쓴다. Collapsed scale는 prototype에서 재사용하지
않고 기존 fallback을 다시 계산한다. 실패 frame/부분 결과를 cache에 저장하지 않는다.

이 proof는 **scale 수학**에만 해당한다. Native source, frame, point owner, node quota,
codec admission 권한을 만들지 않는다. canonical planner traversal는 참조 공유를
방문 생략의 근거로 사용하지 않는다. Raw endpoint work와 기존 모든 sample/batch charge를
그대로 재부과한다. 새 전역 Map/string key, data/program key, 무한 progress Map은 없다.

### 실제 prototype 결과

[prepared-scale-prototype.json](frame-sampling-evidence/prepared-scale-prototype.json)은
동일 원 program 쌍으로 준비한 원본/후보의 다음 사실을 검증한다.

- Preparation clone57,162→53,165(-3,997), owned add59,172→55,175.
- 첫 1k sample clone14,037 그대로, owned add22,042→16,048(-5,994).
  이미 root가 local scale를 clone 없이 freeze하므로 이 개선은 **추가 clone 감소가 아닌
  반복 scale freeze/WeakSet 등록 제거**다. Mapping 길이1 배열2,000과 결과2,000은 남는다.
- Canonical `Animation preparation work`771,686으로 동일.
- v3 1,822,845B, v4 345,803B 모두 같은 실행의 bytes와 SHA256 완전동일.
  Native/decoded plan, 전체 native/offline frame, sampled rebase v3 wire/frame도 exact.
- 6scale×domain3×progress6=108, 같은 context에서16개 scale를 차례로 넣고 반복·변경
  progress10개=160, invalid domain/base/constant/overflow4개, 합272 경우 원 경로와 같은 값/오류. Context max4 확인.
  Caller-frozen scale는 context 없는 기존 2인자 경로에서 새 proof를 얻지 않는다.
  Accessor range getter 실행0을 확인했다. 추가 interner는 absent parameter를 own 검사 뒤 읽어
  상속 getter를 새로 실행하지 않는다. 기존 compatibility의 상속 base 읽기 수는 원본과 비교해
  같은2회임을 기록한다. 기존 이 동작을 이번 후보에서 몰래 바꾸지 않는다.

`native→sample37→planTransition`도 v3/explicit v4 양쪽으로 확인했다.
Sampled state의 같은 중간 scale를 여러 row가 공유하므로 **새 v4 rebase**의 constant-column
선택은 바뀐다. 이는 raw native endpoint를 공유하지 않아도 생기는 차이다.

| sampled-rebase | 원본 | 후보 | 검증 |
| --- | ---: | ---: | --- |
| v3 bytes | 2,381,600 | 2,381,600 | SHA/bytes exact |
| 새 v4 bytes | 424,178 | 422,310 | encoding representation 다름 |
| canonical preparation work | 451,681 | 451,681 | 원 occurrence charge 동일 |

양쪽 v4는 기존 reader/동일 schema로 복원되고, decoded plan 및 전체 native/offline frame이
`deepEqual`이다. **각각의** wire는 restore→reserialize에서 자기 bytes를 완전히 유지한다.
기존 v4 입력 bytes를 새 representation으로 자동 재작성하지 않는다. 값, ID, style, meaning,
수학, reader, quota, schema, v3 bytes를 유지하고 **새 plan을 처음 encoding할 때의 lossless
상수 선택만** 달라지는 범위를 제안한다. 이것이 root의 명시 채택 대상이다.

모든 신규 v4 bytes까지 강제로 유지하려면 sampled provenance를 export할 때 scale를 매 row
독립 object로 다시 복제하거나 column codec에 producer 공유 이력을 반영하는 새 규칙이
필요하다. 전자는 이점 일부를 export 시 재복제와 임시 메모리로 되돌리고, 후자는 복잡한
새 wire 선택 정책이다. 현 목표에는 이 두 가지를 추가하지 않는(b′)를 권한다.

Timing 결과는 일관된 가속을 입증하지 못했다. Counter-on 실행과 clean 실행의 median이
실행마다 역전됐다. 최종 clean 기록은 원본12.960→후보14.801ms, mean25.769→14.482ms,
원본 max305.812ms로 GC/OS 편차가 컸다. 따라서 이 안의 확정 근거는 **반복 owned 등록
5,994회 감소와 의미/회계 보존**이며, 속도 개선율은 채택 근거로 쓰지 않는다.
[prepared-scale-timing-clean.json](frame-sampling-evidence/prepared-scale-timing-clean.json)에
counter 없는20 warmup/각30 ABBA 원값을 보존했다. 어떠한 timing도 대형 sample
지원/50ms/P95 완료로 세지 않는다.

### 대안(a)의 비용과 배제 이유

Raw resolved scale→filtered scale를 `layerPositions` local WeakMap에서 먼저 공유하고,
exact owned raw scale→normalized scale WeakMap까지 묶은 조합도 측정했다.
준비 clone57,162→45,174, sample owned add16,048로 절감 폭은 더 컸다.
Counter 없는 median13.702→11.487ms였지만, counter가 켜진 별도 실행은
15.012→17.442ms로 오히려 느렸다. 계측/GC를 구분해야 한다.

이 조합은 **native plan부터 v4 bytes를 바꾼다**. `columnCodec.column`의 `every(Object.is)` 때문에
독립 scale object 열이 동일 object의 `{constant:scale}`로 바뀌었다.
v3 bytes1,822,845는 같았지만 v4는345,803→344,547B였다. Decoded plan/frame은 exact다.
이것은 lossless이지만 native wire까지 바꾸므로(b′)보다 영향이 크다. 따라서(a)는 제품 제안에서
배제한다. 향후 채택하려면 compact 선택 변경을 명시하고 원100k의 physical/encoded/
expanded/bytes 회계를 새로 검증해야 한다. 제안(b′)는 native wire는 지키며, 위에서 검증한 새 sampled-rebase encoding 선택만 한정한다.
[scale-prototype.json](frame-sampling-evidence/scale-prototype.json),
[scale-timing-clean.json](frame-sampling-evidence/scale-timing-clean.json)을 보존했다.

## 후속 frame 설계

3,001 positions clone, node 외피/geometry5,000 clone, decisions/frame1,003 clone 및
endpoint projection2,005 등록의 더 큰 후보는 별도
[frame-local-freeze-design.md](frame-local-freeze-design.md)에 둔다. 일반 framework나
외부 frozen authority를 추가하지 않는 단계별 수명안이며 아직 구현/성능 검증 전이다.

## 구현 채택 뒤 필요한 검증

이번 검토는 source-free package, browser/SLO, heap proof를 대신하지 않는다. 후속 제품
checkpoint는 적어도 아래를 마쳐야 한다.

- 원본 full validation/호출 순서·canonical work; default/v3 bytes exact, explicit v4 기존 reader/schema
  호환·복원 wire 재직렬 exact, 새 sampled-rebase representation 차이만 명시한다.
- 6scale의 독립 수학 expected, conditional scale>4/여러 layer/namespace, parameter/clamp,
  ±0, absent/undefined/extra field, sparse/accessor/prototype getter, mutable/frozen/clone 반례.
- Progress 변경/역방향/random-access/timeline owner별 다른 progress, collapse/failed mapping,
  native/offline/sample→rebase→sample와 batch; 각 cache hit에서도 실제 value mapping 검산.
- 원100k와 partition10k의 모든 ID/좌표/meaning/style/timeline/native provenance를 보존하고
  wire/codec 회계·동일 archive3Node/브라우저를 검증. 이 감사에서는1k만 실행했다.
- 원본 source 없이 package에서 전체 frame/renderer 출력, mutation 불가, forged frame/plan
  및 얕은 frozen clone 거부, source/data revision 후 원 program 불변, history chain0.
- Retained heap은 계획 참조를 phase별 해제한 직렬 harness로 별도 측정한다. 큰 복수 plan을
  동시에 유지하거나 heap을 늘려 SLO/heap 통과로 해석하지 않는다.

공통 sample의 큰 성능 의무는 계속 남는다. Canvas 실시간 재생이 우선이며, SVG는 현재
정확 출력/내보내기를 유지한다. 원50ms는 SVG serialization이 아닌 공통 sample 기준이다.
