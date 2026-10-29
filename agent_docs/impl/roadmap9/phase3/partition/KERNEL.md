# Partition view·mapping·bend private 계산

## 진행 상태

- [x] 기존 hierarchy model/value/interval owner 재사용
- [x] Focus·breadcrumb·nearest ancestor recovery·navigation 계산
- [x] Cartesian/polar mapping과 pixel gap 분리
- [x] Canonical bend endpoint·small-b 수치 안정성
- [x] 독립 oracle·깊이10,000·critical coverage·package 경계 검증
- [x] [Exact partition primitive 검토 패키지](REVIEW.md)
- [ ] Partition 시각 확인
- [ ] 일반 screen/direction morph adapter와 current-frame hit
- [ ] 공개 resource/action/schema·전체 consumer 연결

기준은 hierarchy/treemap private checkpoint `b8fe0549cbd6ef2f9780a7e2dcb606bcd44def14`다.
Roadmap 9 전체 실행 승인 및 parent의 독립 STEP025/026 이후 focus/mapping/bend 계산 위임을 재사용한다.
STEP025의 값을 다시 구현하지 않는다. `normalize.js`, `input.js`, `model.js`, `partition.js`, `numeric.js`는 변경하지 않았다.
이 checkpoint는 private 계산이며 공개 API나 새 rendered target의 승인을 뜻하지 않는다.

## 소유권과 입력

| 새 owner | 책임 |
|---|---|
| `grammar/hierarchy/partitionView.js` | 기존 partition을 명시 계산하고 focus 구간·depth view·복구·navigation 산출 |
| `grammar/hierarchy/partitionMapping.js` | unit cell의 Cartesian/polar geometry와 pixel gaps, 공통 radial policy |
| `grammar/hierarchy/partitionBend.js` | canonical mathematical bend point와 유한 small-b 계산 |

원본 hierarchy의 typed key/topology/value/lineage와 normalized interval은 기존 owner에 남는다.
반환값은 freeze하고 caller input을 변경하지 않는다. Getter·unknown field를 own-data boundary에서 거부한다.
ChartProgram·stored resource·renderer·async I/O를 import하지 않는다.

### Focus view

`createPartitionView(model,{focusKey?,rootVisible?,maxNodes?})`의 key는 이미 정규화된 opaque node key다.
Raw user scalar parsing을 다시 하지 않는다. 생략하면 model의 명시 rootKey를 사용한다.
기존 `layoutHierarchyPartition`을 호출하고 focus의 descendant 연속 preorder만 복사한다.
부모 [f0,f1]을 [0,1]로 바꾸며 zero-span은 모든 u를0으로 둔다. Key/value/sourceRows/residual은 그대로이고
view의 depth는 상대 깊이다. Parent key는 원 hierarchy 관계이므로 focus의 parent는 view 밖에 있을 수 있다.
이 결과는 원본 model을 대체하는 새 hierarchy가 아니다. Breadcrumb는 실제 ancestor key이며 synthetic root는 제외한다.

RootVisible 기본true, synthetic forest root는 항상 숨긴다. 숨긴 root band는 levels에서 제외한다.
Root-only + rootVisible:false는 emptyChildrenView와 원 node metadata를 남긴다. Zero-value leaf도 사라지지 않는다.
Visible은 depth band의 표시 자격이며 zero-width geometry 여부는 mapper가 판단한다.

`recoverPartitionFocus(previousModel,nextModel,focusKey,{maxNodes?})`는 같은 key가 살면 유지하고,
삭제되면 이전 parent chain에서 가장 가까운 surviving key, 없으면 next root로 이동한다.
결과 reason은 retained/ancestor/root/empty이며 실제 event·selection 변경은 하지 않는다.
`partitionNavigation(model,key,{maxNodes?})`은 parent/firstChild/previousSibling/nextSibling/root key를 반환한다.
Synthetic root key는 private navigation/view intent일 뿐, 이를 실제 node selection/export로 노출하지 않는다.

모든 traversal은 iterative다. View는 integrity index와 interval owner의 명시 validation 두 번을 수행하므로
두 work 비용 및 추가 node 처리 비용을 공통10M budget에 합산한다. 거대한 key로 인한 combined budget 초과도
결과 배열을 만들기 전에 거부한다. Later shared validation optimization은 별도 실제 요구가 있을 때만 한다.

### Mapping과 수치 정책

`mapPartitionRectangle({u0,u1,v0,v1},options)`는 x/y/width/height와 orientation horizontal(default)/vertical,
reverseU/reverseV(default false), gapX/gapY(default0)를 명시 소비한다. Horizontal의 x는 u, y는 v이며 vertical은 전치한다.
Gap은 이 private 후보에서 **전체 간격**이며 각 면에 절반씩 적용한다. Geometry가 gap보다 작으면 폭/높이0과 visible:false를 남긴다.
Padding을 normalized partition에 섞거나 source values를 clamp하지 않는다.

`mapPartitionSector(cell,options)`는 innerRadius/outerRadius, radiusPolicy(equal-depth default 또는 equal-depth-area),
startAngle(기본0)/sweep(기본2π), direction(clockwise default 또는 counterclockwise), angularGap/radialGap(default0)를 받는다.
각도 결과는 radians다. Existing polar point/path owner의 degrees·화면 방향 변환은 adapter에서 한 번만 수행할 예정이다.
AngularGap은 local mid-radius의 CSS px 전체 간격이며 angle gap=px/r다. Gap이 span을 넘거나 zero-radius이면 invisible이다.
Radial gap도 양쪽 절반씩 적용한다. Division이 Infinity가 되어도 finite collapsed geometry로 돌려주며 그 wedge는 표시하지 않는다.

`partitionRadius`를 mapping/bend가 공유한다. Equal-depth-area는 직접 큰 radius를 제곱하지 않고 outer radius로 scale한 식을 쓴다.
V=0/1은 원 radius를 exact 반환한다. 동일 depth band의 squared-radius 차이는 일정하지만 다른 깊이 node의 value 면적을
전역 비교할 수 있다는 뜻은 아니다. 전체 정규화 cell은 ordered [0,1]이고 negative/nonfinite 입력은 명시 오류다.

### Canonical bend와 남은 adapter 결정

`bendPartitionPoint({u,v,bend},{width,height,innerRadius,outerRadius,radiusPolicy?,sweep?})`는 계약의 canonical X/Y다.
B=0은 정확히 `(W(u−.5),Hv)`, b=1은 `(r(v)sin(S(u−.5)),r(v)cos(S(u−.5)))` branch를 반환한다.
중간에는 y_b=(1−b)Hv+b r(v), θ=S b(u−.5), X=(1−b)W(u−.5)sincθ+y_b sinθ를 사용한다.
Y의 `2R sin²(θ/2)`는 R을 만들지 않고 `(1−b)W(u−.5)·(S b(u−.5)/2)·sinc²(θ/2)`로 계산한다.
따라서 b가 최소 subnormal이어도 중간 R overflow나 큰 수 빼기가 없다. 최종 좌표 자체가 유한 범위를 넘으면 오류다.

이 함수는 screen rotation/translation 또는 arbitrary start/direction adapter가 아니다. 기본 strip의 x 증가를 그대로 유지한 채
counterclockwise target의 parameter orientation을 rotation만으로 바꾸는 것은 성립하지 않는다. Signed-curvature 경로 또는
source-axis convention을 함께 정하는 작은 후속 수치·시각 검토가 필요하다. Static polar mapping은 양 direction을 이미 지원한다.
이 미결정을 숨기거나 전체 morph 지원 완료로 기록하지 않는다. Primitive 검토에서 각 endpoint와 실제 source/target mapping을
정확히 비교하고, current-frame hit·padding·clip·reduced-motion은 후속 runtime 통합과 함께 닫는다.

## 독립 증거

- Root10/A6/A1=2/A2=4/B4에서 focus A의 A1=[0,1/3], key/value/sourceRows 유지.
- Inclusive residual3은 focus [0.4,1]의 reserved tail이며 fake child를 만들지 않는다.
- A Cartesian width600, polar angle1.2π, radius100/200의 같은 partition을 사용한다.
- R0=0/R1=100/v=.5의 equal-depth-area radius는 sqrt5000. R0=20/R1=100의4개 band는 squared-radius 차이2400.
- `test/oracles/partition-mapping.js`는 bounded direct square-root와 원래 circle 식을 사용하며 production import가 없다.
  Canonical center(u=.5,v=.5,W=2π,H=1,r=v)는 모든 b에서(0,.5), b1/u.75/v1은(1,0), b0은(π/2,1)이다.
- Small-b는0에 대한 독립 literal limit, 안정된 b는 직접 R circle 식의600개 조합과 비교한다. 수치 tolerance1e-11,
  small-b limit1e-10이며 endpoint branch는 가능한 값의 exact equality를 검사한다.
- 전체 hierarchy9개 test 파일68/68, 신규15/15, 새3 owner coverage100/100/100, 기존 critical floor95/90/100 통과.
- Discovery/source/package contracts38/38, 공식 package check와 installed Full/Basic browser build 통과.

재현 명령과 inputs/log hashes는 [KERNEL-EVIDENCE.json](KERNEL-EVIDENCE.json)에 저장한다.
Node22.23.1의 staging 실측은692 entries/1,030,205 packed/4,788,507 unpacked bytes다.
새3 modules와 최소1,000byte 올림에 따라 limits692/1,031,000/4,789,000을 사용한다.
초기 한도 실패도 `.artifacts/partition-kernel/package-*.log`에 보존한다.
Installed Full/Basic gzip510,644/287,809 bytes는 기존511,000/288,000 cap 안이며 변화가 없다.
Main 통합에서는 모든 병렬 branch를 합친 뒤 다시 실측한다.

Hierarchy/layout resource lifecycle·typed refs·revision/rematerialization·selection/scene/codec·inspection/accessibility·Full/Basic/types/docs는
아직 공개 통합 전이다. 새로운 chart flow는 exact primitive 시각 확인이 필요하다. STEP025–028, AT62–65 또는 전체 STEP077 완료가 아니다.

Source/evidence revision은 `78a2700900c195e76f72f48fcfc358d49aaae8ea`다. 후속 metadata-only 기록은 검증 입력을 바꾸지 않는다.
