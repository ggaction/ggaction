# Geo 투영의 일시 결과 조립

## 진행 상태

- [x] A3 제품 source/pin: dd1837f39 / 37d5fcfe4
- [x] Global ownedValues와 traversal ancestors 호출 귀속 분리
- [x] Source 미변경 load-hook prototype:1276projection pair/90geometry pair exact 검산
- [ ] Root의 구체안 채택 기록 후 제품 source 적용
- [ ] 완전 owner coverage 및 동일 archive3Node/browser/원100k 기능·canonical 성능 재검증

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
