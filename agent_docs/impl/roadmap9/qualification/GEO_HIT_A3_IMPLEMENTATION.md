# Geo A3 구현과 검증

## 진행 상태

- [x] [채택안](GEO_HIT_A3_PROPOSAL.md)의 공개 정책과 private index 연결
- [x] [제품 전 소형 prototype](GEO_HIT_A3_PROTOTYPE.md), default/indexed 전체 판정 동등성
- [x] 원 hit/interaction 회귀 500개 및 브라우저 DPR1·2
- [x] 원10k source 기능 및 새 archive 원100k native/current 전수 검산
- [x] 같은 archive 3Node/browser/types/docs/bundle, 모든 critical coverage floor
- [ ] 새 archive 원100k rebase/offline 전체 기능 (WeakSet rehash 병목 유지)
- [ ] 원 canonical benchmark 5 warmup + 30 measured, 100cycle/retention
- [ ] 최종 source/evidence pin과 원격 checkpoint

공개 정책은 INTERACTION/current, types, public API 문서가 소유한다. 이 기록은 기능 구현 과정의 증거이며 STEP077 완료나 P95 통과 선언이 아니다. Root의 기존 remainingApproval 채택을 재사용하며 별도 PR/publish/deploy를 하지 않는다.

## 정확성 경계

`hitShapes`가 기존 `hitStroke`의 ordinal·direction·dash·cap·join 계산으로 만든 footprint를 전부 보관한다. `hitPartIndex`는 그 완성된 CSS polygon의 bounds를 모아 방문 순서만 바꾼다. 원 `contains`, `boundaryDistance`, `clippedBoundaryDistance`가 최종 수학을 소유한다. Circle 또는 안전 범위 밖의 bounds/query는 원 ordinal 전수 방문이다. No-hit distance를 slop으로 잘라내지 않는다. Focus 역시 원 ordinal에서 첫 유효 후보를 고른다.

### Rectangle 하한과 실제 scalar 연산의 연결

여기서 `M=2^20`, `u=2^-53`이다. Pruning은 모든 polygon bounds와 query 좌표의 절댓값이 M 이하일 때만 사용한다. Linear compiled commands의 bounds는 각각의 x/y에 Math.min/max를 취한 실제 binary64 값이므로 모든 segment endpoint를 포함한다. Cubic은 원 compileGeometry가 이미 같은 tolerance로 linear화한 후 이 bounds를 만든다. `hitStroke`의 `EPSILON=64*Number.EPSILON`은 join/degenerate 선택을 **완성된 footprint 생성 전에** 적용한 값이며 index가 이를 재평가하거나 새 경계를 만들지 않는다.

1. 실수 segment는 그 endpoint AABB 안에 있다. 따라서 AABB와 q의 L∞ 거리는 그 segment의 Euclidean 거리 이하이다. Rectangle subtraction 자체의 오차도 아래 여유에 포함한다.
2. 원 `segmentDistance`는 dx/dy, hypot 길이, unit direction, dot projection, [0,length] clamp, residual, 마지막 hypot 순서다. 이 영역에서 각 좌표차는 2M 이하, norm은 4M 미만, clamped projection은 length 이하이다. 정상 norm에서는 binary64 subtraction/division/product의 한 연산 상대 오차 u를 사용하고 두 hypot의 몇 ULP 오차보다 넓은 16u 여유를 둔다. 각 unit component의 오차를 32u, projection 및 residual의 오차를 각각 256Mu로 상계해도 총 2048Mu=2^-22보다 작다. 상쇄는 상대 오차를 키워도 이 절대 오차 상계를 키우지 않는다. Subnormal 차이/norm에서는 component의 상대 오차 대신 segment 길이의 절대 크기로 상계한다. Clamped along이 그 subnormal 길이 이하이므로 해당 변위는 위 절대 상계보다 작다. 길이0 분기는 직접 q−endpoint norm이다.
3. 원 `pathFillContains`는 각 linear edge의 segmentDistance==0 검사와 ray crossing을 함께 쓴다. q.y가 box 밖이면 crossing 조건이 성립하지 않는다. q.x가 오른쪽 밖이면 모든 crossing의 내삽 x가 q.x 이하다. 왼쪽 밖이면 닫힌 경계의 모든 상향/하향 crossing이 정수 winding에서 상쇄되고 parity도 짝수다. 원 `interpolateNumber`의 t는 edge y 범위에서0..1이며, endpoint 간 내삽의 절대 반올림을 같은 2048Mu 안에 포함한다. 즉 box 밖의 false zero/inside 가능성도 이 범위보다 멀리 발생하지 않는다. Stroke polygon 폐곡선의 마지막 edge도 동일하다.
4. 실제 helper는 rectangle L∞ 하한에서 `PAD=2^-10`을 빼고0으로 clamp한다. 이는 위 2^-22 상계의4096배이며, 실제 footprint·slop·distance에 더하지 않는다. 비교는 lower>현재 best일 때만 생략한다. Bounds에 가장 가까운 segment의 실제 scalar 결과를 위 오차 이상으로 과대평가하지 않으므로 그 branch를 잘못 생략하지 않는다. ±0은 원 Math.min에 맡기고 모든 tie를 방문한다. Clip은 admissible boundary를 줄이므로 unclipped box 하한은 여전히 보수적이다.

이 설명의 hypot 오차 전제는 지원·검증한 Node/V8/Chromium binary64 구현에 대한 것이다. ECMAScript가 모든 타 구현의 transcendental 정확도에 universal correctly-rounded 보증을 제공한다고 주장하지 않는다. 다른 수치 구현으로 지원 범위를 넓힐 경우 같은 numeric qualification이 필요하다. 안전 범위 밖이나 analytic circle은 이 전제를 사용하지 않는 전수 경로다. Durable tests는 6개 exponent scale, 480개 deterministic segment/quad, 각4query(1920쌍), subnormal/±0/extremefinite, Morton collision/tie와 원 전체shape oracle을 함께 확인한다. 샘플 통과만을 수학 근거로 대체하지 않는다.

### 준비·할당·과금

N stroke parts, L=ceil(N/8), K=max(0,2L−1)이다. 정확 build work는 `15*N+K+2048`이다. N bounds scan+N key, radix4pass의 각 `(3N+512)`, N leaf union+K node emission을 모두 과금한다. 한도와 safe integer를 **typed array 할당 전에** 검사하고, 이후 원 실제 각 방문 과금도 유지한다. Typed buffer peak는 `48K+12N+1024` bytes이며 역시 할당 전 검산한다. N400000에서는9,600,976B, 최종 order+node retained6,399,952B다. JS geometry 객체·allocator·host overhead는 포함하지 않는다.

Binding은 원 shape work에 이 build work를 더해 현재 maxWork로 다시 검사한다. High→low policy는 private proof를 재검산하며 캐시 면제가 아니다. Query는 node/leaf admission, 실제 part 판정과 clip callback을 기존2M에 누적한다. 모든 bounds가 겹치는 최악 query 또는 복잡한 nearest clip은 명시 실패할 수 있다. 원 union1M, focus caller budget, text/clip 비상속을 유지한다.

## 현재 검증 결과와 발견한 제한

원10k 실제 19,999commands/31,165parts/geometry145,827/stroke134,661/index477,314를 관측했다. 세 원 CSS query는 scalar 전수거리0과 owner coast가 같으며 query work5,233/10,565/4,827이다. 원 whole-shape conservative work614,495와 구분한다. 별도 no-hit nearest(200,230)는 기존 clip callback과2M query bound 때문에 explicit-limit이며 이를 성공 또는 정책완화로 바꾸지 않는다.

초기 source harness의 frame.index 가정과 no-hit target undefined 가정은 각각 entries→prepareHitIndex, null oracle로 바로잡았다. 원 로그를 보존한다. 브라우저 harness에서는 dispatch가 logical CSS point를 받는 계약에 맞춰 client rect offset 중복을 제거했다. Ruby system2.6/기본4.0은 locked bundle이 준비되지 않았고 installed Ruby3.3.12의 canonical preflight가 통과했다.


## 첫 동일 archive 기능 결과와 장기 준비 병목

Archive `09d0455e2e181442277d49aa8e5927ea00c6ba3fef2debc650250cefbdc0276b`(Node20/24 동일 bytes)는1262entries/1,822,089packed/8,190,047unpacked다. 같은 archive의3Node runtime·strictTS·실행문서·6browserbundle 및 source-free minified Chromium DPR1·2는 통과했다. Interaction gzip 최대140,022B에140,100B cap을 적용했다. 소유499tests 및 모든 critical floor, source docs248, package/discovery24, built186pages, desktop/mobile320/390/768은 통과했다. 작은20vertex100cycle은 함수 scope가 종료된 뒤 oldscene100/100WeakRef 회수를 확인했다. 처음 module top-level scope에서 마지막 scene1개가 살아 있던 관측도 별도 보존한다.

원100k native339,849parts/1,599,247geometry/1,459,397stroke/5,184,746indexwork와 원 보수shapework6,736,859를 확인했다. 전체 footprint SHA는 초기 source와 같은 archive에서 exact 일치했고, 원3CSSquery 및 추가nohit를 모든339,849parts의원함수 전수거리와 대조했다. Reference-only batch4096 사이 explicitGC는 이 전수 검산의 실행환경이며 제품P95의우회가 아니다.

그 뒤 실제 sampled/rebase 준비 구간에서 long-lived WeakSet 재정리가 반복되어 아직 완료되지 않았다.9분 후 macOSsample762/762가WeakSet.add이며761개가EphemeronHashTable::Rehash에있었다. 현재 archive의큰current/rebase/offline 검증을 pass로 기록하지 않는다. Native 전수oracle 완료·작은sampled/rebase동등성과이불완료를명확히구분한다. 원100cycle/P95도계속open이다.


Root는 위 실제제품 준비 병목을 확인하고, 원 계산·검증·과금·기본경로·최종 불변성·caller isolation을 유지하는 raw hitStroke 중간 assembly 최적화를 같은 승인 범위로 채택했다. PID82277과 불완료 archive 증거를 보존하고 종료했다. `calculateHitStroke`는 같은 루프의 새 중간 commands와 원 work만 반환한다. 명시 indexed hitShape가 이를 동기적으로 읽어 별도 CSS commands를 만든 뒤 기존 private freeze로 닫으며, 일반 `prepareHitStroke`는 여전히 cloneAndFreeze와 prepared WeakSet으로 원 결과를 준다. Raw tree 자체는 prepared/owned 권한이 없고 외부 API/codec/scene에 저장하지 않는다. 새 source/archive는 이전 통과와 분리해 재검증한다.


## Raw assembly checkpoint 결과

최종 제품 archive는 `bbb592a75661d3b9cdc09440ab4da304600933ca347e37fe03746b717b8f9680`,1262entries/1,822,232packed/8,190,547unpacked다. Strict Node20/24 pack이 같은 bytes를 만들고3Node 동일 archive runtime·types·실행문서·6bundle 및 Chromium DPR1·2가 통과했다. Interaction 최대140,077B에140,100B cap이며 packed/unpacked ceilings는 실제측정의100byte 단위 올림이다. Source owning500/500, lines/functions100%, branch97.36%와 각 critical floor, docs248, package/discovery24, built186pages 및 desktop/mobile320/390/768이 통과했다. 새 archive의 소형100cycle도100/100oldscene 회수했다.

원100k native 준비는2,745.97ms였다.339,849parts/1,939,096footprint commands의 hash는 이전 원 전수 결과와 같고, geometry1,599,247/stroke1,459,397/index5,184,746/binding11,921,800 work도 보존됐다. 원3query 방문과금은43,133/97,411/52,055이며 전수거리0·owner가 같다. No-hit distance21.273293739428425도 scalar 전수와 일치한다. No-hit nearest의 기존2M explicit-limit은 그대로다. Current frame199,999commands의 analytic 최대오차3.27e-13, CSS3query 방문30,515/69,115/36,961을 통과했다.

이후 같은 process의 **rebase plan**에서 WeakSet rehash가 지속되어 PID86245를 중단했다. 새 fresh process PID89406도 초기 plan 구간 rehash로 중단했다. 따라서 이 archive의 큰 rebase/offline 전체 성공이나 원100cycle/P95를 주장하지 않는다. 작은 public rebase/offline은 별도 unit/installed fixture에서 통과했다. Root는 이 미완료를 유지하는 진행 checkpoint를 먼저 고정하고 후속 병목 개선을 이어가도록 결정했다.

별도 package load hook은 원 WeakSet.add를 그대로 실행하며 global `ownedValues`와 traversal `ancestors`별 비용과 느린 JS stack을 기록했다.25.1M 호출 시 owned 누적71.53s/max6.58s, ancestor누적1.40s/max12.9ms였다. `freezeOwned→cloneAndFreeze→geo/projections.result/forward→stream.lineCoordinates`, scene snapshot, Geo group snapshot이 느린 호출 경로다. PID89817은 필요한 attribution 확보 후 rebase plan에서 중단했다. 이 진단은 제품 source나 수학을 바꾸지 않았지만 계측이 GC 시점을 바꾸므로 제품 성능 통과가 아니다. Ancestor Set 교체안은 근거가 없어 폐기했다. Global registry의 회전·삭제·리셋도 하지 않는다.

[증거와 재실행 설명](geo-hit-a3-evidence/README.md), [source별 SHA와 미완료 목록](geo-hit-a3-evidence/verification.json)이 범위를 고정한다. 다음 개념은 공개 owned facade를 보존하며 내부 synchronous projection result 조립에서 반복 ownership 등록을 줄일 수 있는지 소형 oracle과 구체 계수로 먼저 확인하는 것이다. Canonical benchmark 입력·timers·SLO·5+30/DPR1·2와 원 모든좌표 검산 의무는 유지한다.
