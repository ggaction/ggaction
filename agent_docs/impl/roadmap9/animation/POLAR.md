# Native polar animation checkpoint

## 결정과 승인 근거

`../AUTHORIZATION.json`의 `remainingApproval`에 따라 남은 STEP077의 API·저장·아키텍처·시각 결정을 재질문하지 않고 구현한다. 공개 API는 기존 animation 6개를 유지한다. 이 문서는 STEP061/062 전체 완료 기록이 아니다.

현재 native vocabulary는 point/line/arc이다. Polar Rule/Rect authoring API를 새로 만들지 않는다. Guide rule/circle은 별도 후행 범위다.

## 준비된 의미와 저장

Native mapping/sector owner를 준비 시 한 번 실행하여 각도(degree), 반지름, frame, 정확한 row-key grid를 보존한다. Cartesian x/y에서 역산하지 않는다. `native-polar-coordinates@1`은 이 **resolved polar-coordinate** 의미를 보간한다. 임의 nonlinear raw value·scale 자체의 동시 보간을 주장하지 않는다. 원 매핑 정책이 다르면 `polar-mapping`으로 명시 교차 페이드한다. Canvas 크기만 달라진 동일 상대 radius range는 호환된다.

Point 각도는 shortest displacement를 사용한다. 180도 동률은 양의 방향이다. 중간 각도는 unwrapped 값을 그대로 보존한다. Line은 같은 ordered row-key grid와 closed 정책만 연결한다. 멤버 순서·누락·break 변경은 기존 topology/grid fallback을 보존한다. Arc는 start angle + signed sweep + inner/outer radius를 보존하여 full turn을 0도 sector로 축소하지 않는다. 반대 sweep 방향은 fallback한다. Pad angle 변경은 geometry-policy fallback이다.

매 프레임 기존 `polarToCartesian`, `buildMappedPolarLinePathCommands`, `buildAnnularSectorCommands`가 primitive를 만든다. 재집계·layout·도메인 추론·임의 path command 대응은 없다. Mapping digest는 호환성 표식이며 replay payload에는 실제 frame/angle/radius/grid와 endpoint graphic/asset bytes가 있다. Hash만으로 replay한다고 주장하지 않는다.

Endpoint의 optional `polars` vector는 node 순서와 길이가 정확히 일치한다. 기존 positions/graphs/cartesian vector와 flat provenance를 유지하며 현재 frame의 polar 의미도 rebase에 전달한다. Strict restore는 닫힌 kernel version, shape, finite bounds, row membership, native geometry의 forward equality를 검증한다. Conditional position, 비원형 point primitive, edited geometry 및 호환하지 않는 appearance는 명시 fallback이다.

## 진행 상태와 검증

- [x] 독립 literal/seam/tie/full-circle/radius·frame 수치, immutable input, closed/oversize 거부, native source revision, reorder/missing fallback, nested scope, current-frame 반복 rebase와 offline network0 roundtrip.
- [x] Animation 192/192, 기존 critical 32 owner 바닥(95/90/100), 실제 자료 5/5, 같은 시각 Canvas/SVG/PNG/PDF 4/4.
- [x] 동일 tar Node20/22/24 각각 공개 runtime 9개·strict 타입·실행 문서 snippet·optional peers·6 browser entries. 실제 animation gzip 최대203265에 최소203300 상한을 검증했다.
- [x] 현재 계약·공개 문서·타입·생성 reference 동기화. 첫 문서 실패의 owning 66개 재검증 통과.
- [x] 소스 pin18/18, built186페이지/1598 artifacts, 전체 문서320/390/768px browser 및 [최종 evidence](polar-evidence/README.md).

후행 guides/timeline/typed special layouts 및 최종077 qualification은 별도 의무로 유지한다.
