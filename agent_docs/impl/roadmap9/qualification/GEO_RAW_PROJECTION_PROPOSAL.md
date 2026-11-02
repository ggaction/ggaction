# Geo 투영의 일시 결과 조립

## 진행 상태

- [x] A3 제품 source/pin: dd1837f39 / 37d5fcfe4
- [x] Global ownedValues와 traversal ancestors 호출 귀속 분리
- [x] Source 미변경 load-hook prototype:1276projection pair/90geometry pair exact 검산
- [x] Root가38c05b45f의 문서·exact patch를remainingApproval으로채택
- [x] 제품 source 적용, public facade/stream 경계와 소유권 검사
- [x] owner389회귀·coverage 및 동일 archive3Node/browser·원100k native/current
- [ ] 원100k rebase/offline 전체 기능, canonical SLO, 원100cycle

이 문서는 제품에 아직 적용하지 않은 내부 변경안이다. Root는 remainingApproval 범위에서 구체적인 raw projection 경계 검토를 지시했다. 제품 source를 바꾸거나 공개 API·persistent schema·native authority를 추가하지 않는다. 새 시각 Gate도 없다.

## 관측과 원인

[A3 attribution](geo-hit-a3-evidence/large-installed-attribution.log.gz)은 같은 installed archive의 원 WeakSet.add를 그대로 호출하며 호출원을 구분했다.25.1M 호출까지 global ownedValues의누적71.53s/max6.58s와 ancestors누적1.40s/max12.9ms를 관측했다. 가장 반복적인 stack은 `geo/projections.result→cloneAndFreeze→freezeOwned`, caller는 `stream.lineCoordinates`다. Scene/group snapshot도 남은 호출원이다. Global registry의회전·삭제·리셋은 identity/lifetime 경계를 바꾸므로 제외한다. Ancestors를Set으로 바꾸는 안도 현재 원인 근거가 없어 제외한다.

## 구체 경계

`src/grammar/geo/projections.js`의 현재 수학·검증 루프를 **하나의** private `createProjectionCalculation(input)`으로 옮긴다. `sourcePoint`, visible-domain 판정, component 순서, streamedPoint, finite 검사, inverse residual/clip 검사는 그대로 두고 `{point,reason,component}`의 일시 조립만 raw record로 반환한다. Options/descriptor는 기존 normalizer의 owned 결과이며 계산 kernel 자체는 기존처럼 freeze한다.

기존 `createProjectionKernel(input)`은 위 계산 kernel의 forward/inverse 결과를 원 `cloneAndFreeze`로 닫는 facade다. 호출자가 관찰하는 필드·key 순서·오류·signed zero·freeze·owned 의미와 caller input isolation을 유지한다. 외부 entry export/type/codec를 추가하지 않는다. `projectRaw`의 기존 owned 반환은 그대로다. Inverse 내부의 forward 비교 역시 같은 계산 함수를 호출하고 final facade에서만 닫는다.

`src/grammar/geo/stream.js`만 private 계산 kernel을 선택한다. `lineCoordinates`는 raw projected point를 즉시 읽어 원 midpoint/오차를 계산하고 버린다. Point branch는 `acceptPoint(...projected.point)`로 새 tuple을 만든다. 어느 branch도 raw result를 저장하거나 owned/native 권한으로 사용하지 않는다. 최종 `projectGeometry`는 지금과 같은 `cloneAndFreeze({parts,bounds,diagnostics})`를 유지한다. 원 geometry snapshot/normalization, budget.charge, refined/output/command counters, maxPoints200000 ceiling,20depth, public default30000 경계를 바꾸지 않는다.

Raw helper는 library의 공개 package entry에서 export하지 않고 내부 grammar 계산 전용으로 둔다. 일반 kernel의 forward/inverse를 이용하는 fit/controls/anchors 등은 facade 경로를 그대로 사용한다. 후속 최적화가 필요하면 별도 호출근거로 검토하며 이안에 일괄 포함하지 않는다.

## 소형 증명과 범위

[load hook](geo-raw-projection-review/loader.mjs)은 작업tree나 installed source를 수정하지 않고 위 factory/facade 분리만 메모리에서 적용한다. [proof](geo-raw-projection-review/proof.mjs)는 원 module의 baseline query import와 candidate를 함께 비교한다.15projection family에 기본/카메라/반사·clip 설정, visible/clipped/composite/singular·invalid·±0·극점·날짜변경선 사례를 포함한다.1276forward pair와 visible inverse,90geometry pair의 deepStrictEqual로 signed zero를 포함해 좌표·reason·component·순서·diagnostics·오류를 비교했다. Caller 입력은 불변이고 public 결과 및 최종 stream commands는 owned/frozen이며 raw result는 owned가 아니다.

1k 원 zigzag의 소유 등록은15005→3017,11988개 감소했다.20점은305→77,228개 감소했다. 원 source-segment 패턴의각segment에는3refinementnode×2forward×2owned(result+point)가 있으므로 감소량은12(N−1)과 같다. 원1999commands, geometrywork18916, 전체 stream SHA `60d777344fa4cc2124cf2974f4caec92b31679bda24d50453dea0cf82526c76a`는동일하다. 시간 측정이나100k 성능 통과로 확대 해석하지 않는다. 남은 snapshot/geometry ownership 병목도 해결됐다고 하지 않는다.

재실행은 세 파일을 `.artifacts/geo-hit-a3/raw-projection/`에 복사해 repository root에서 `node .artifacts/geo-hit-a3/raw-projection/proof.mjs`를 실행한다. Product tests는 `node --import ./.artifacts/geo-hit-a3/raw-projection/loader.mjs --test test/unit/geo/projections.test.js test/unit/geo/stream.test.js`로같은원assertion을실행한다. Loader의 계수는 제품 성능 검증에서 제거한다.

## 1k hit 정책 선택과 별도 성능 기록

현재 A3 canonical driver의1k는 mark capacity와pathGeometry가모두생략된원scalar 경로다.10k/100k에서만기존채택patch의명시정책을연결한다.1k에서도새index를선택하려면동일원geometry의mark에capacity(maxProjectedPoints/maxPathCommands)를명시하고hitPreparation.pathGeometry도명시해야한다. 이는 좌표·queries·timer·5+30·SLO 변경이아니라 준비정책 선택이지만 현행default성능과다른측정대상이다. 현재진행중인canonicalrun을바꾸지않고default1k실패를보존한다. 후속명시정책의size범위변경은Root채택기록후별도측정한다.


## 구체안 채택

Root는2026-11-02에 revision `38c05b45f`의 이문서와 `proposal.patch`전체를 검토하고 remainingApproval 범위의 내부 병목 개선으로 채택했다. 단일 계산 owner, 기존 owned facade, stream전용raw중간결과, 최종freeze경계를 유지한다. 원입력/queries/timers/5+30/SLO를 바꾸지 않는 조건으로1k에도 explicit capacity/pathGeometry를 선택하는 후속 benchmark 준비정책을 함께 채택했다. 최초default1k성능실패는앞선A3report에남겼다. Global registry나ancestor구조는바꾸지않는다. 이채택기록을원격checkpoint로남긴후제품구현을진행한다.


## 제품 checkpoint 증거

채택 source를 적용했고 원projection/stream및animation389tests가통과했다. Projection100line/97.37branch/100function, stream100/100/100이다. 공개forward/inverse owned/frozen·raw중간결과non-owned·caller isolation 검사를추가했다. 기존canonical소형contract와합쳐34tests, docs248, package/discovery24, built186pages/1607LLM이통과했다. 직전A3browser문서레이아웃검증은같은레이아웃/본문에서재사용한다.

새 frozen archive는 `3318022beb1d20910cf310c0ed5e4e153191eee07885d593389f3c5d43e89739`이며Node20/24strictpack동일bytes,1262entries/1,822,370packed/8,191,091unpacked다. Samearchive3Node runtime·types·실행문서·6bundle와source-free browserDPR1/2통과. Fullgzip788,912B에최소789,000cap; 나머지cap은유지했다. 작은20vertex100cycle oldscene100/100회수다.

원100k의모든199999좌표·339849parts/1939096footprintcommands hash·4query scalar전수·current모든좌표와CSS3query는통과했다. Native준비2,789.52ms였으며원footprint/count/work도같다. 그러나이후rebaseplan에서globalWeakSet rehash가재현돼PID97230을중단했다(758/758sample). 별도fresh PID97769도원initialplan은완료했으나rebaseplan759/759rehash로중단했다. 큰rebase/offline나long-lived완료로기록하지않는다. 제품수정이투영의임시등록을줄인것과남은snapshot/query등록문제를분리한다.

1k에도capacity/pathGeometry를명시하자원v3camera가Geo@2를선택하지못하는소형contract실패2개를확인했다. 승인된explicitcapacity와호환되는기존공개formatVersion5를모든Geo size에연결해34/34로복구했다. 원fixture/좌표/queries/timers/5+30/SLO는바뀌지않는다. 최초default1k의v3/scalar성능실패는앞선canonicalreport에보존한다. 새로운명시정책성능측정은별도결과로만판정한다.

[검증 manifest](geo-raw-projection-evidence/verification.json)가 source SHA와실패범위를소유한다. Large실패로그/sample은같은폴더에압축보존했다. 다음개념은requireFlattened내 boolean/number반환용일시geometry의owned등록을줄이되공개flatten및오류diagnostics소유권을유지하는것이다. Root가이경계를채택했으며별도검산/제품checkpoint로이어간다.

제품 source는 `83b4877402cdb5eaf30c84dbbdf271d368196613`이며 후속 pin은 metadata-only다.
