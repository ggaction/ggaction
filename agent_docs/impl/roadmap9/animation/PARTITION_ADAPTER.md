# Partition 의미 프레임 연결

## 진행 상태

- [x] [remainingApproval](../AUTHORIZATION.json#remainingApproval)의 partition 일반 방향·전체 animation 연결 승인을 재사용
- [x] 저장된 layout/view와 정확한 scope·layout lineage에서 native 의미 상태 투영
- [x] Cartesian·polar의 실제 frame을 기존 normalized bend 커널로 변환
- [x] compatible 일반 방향32종의 native 경계와 현재 curved state rebasing 검증
- [ ] 공개 planner·sampler의 group track 연결
- [ ] strict offline transport, renderer와 current hit/session의 합산 검증

`materialization/animation/partition.js`는 기존 `resolvePartitionPlot`을 준비 시 한 번 사용한다. 이미 저장된 partition layout의 interval/view와 명시 coordinate frame을 읽으며 hierarchy layout solver를 실행하지 않는다. 각 명시 child namespace와 layer별 group이 exact layout/hierarchy refs, normalized state, label offset을 한 번 소유한다. scene 순서의 item vector는 group index·item key·primitive role만 참조한다. 같은 child 객체의 반복 배치도 서로 다른 namespace로 다룬다. body/label의 실제 geometry가 native owner 결과와 다르면 명시 fallback 표시를 유지하며 의미값을 pixel에서 추측하지 않는다.

`grammar/animation/partitionState.js`는 program·resource·renderer를 읽지 않는다. 명시 normalized node/parent key와 coordinate/mapping을 canonical frame으로 변환하고 기존 `partitionInterpolation`에 위임한다. 직사각형의 basis와 depth interval을 함께 반사하면 native 모양을 유지하면서 polar endpoint의 depth convention에 맞출 수 있다. native endpoint에서 사용되지 않는 반경 또는 직사각형 크기만 다른 endpoint에 맞추며, 이미 휜 현재 상태의 치수·gap·origin·angle은 보존한다. hierarchy·visibility·handedness·radius policy와 radial depth direction이 호환되지 않으면 crossfade 이유를 유지한다. 저장된 plan의 direction 결정과 payload shape도 검증한다.

이는 비공개 준비 체크포인트다. Current의 공개 typed 지원 범위는 아직 Cartesian circle point이며 새 projector가 있다고 partition planner·offline·네 renderer·session이 완료됐다고 기록하지 않는다. 이후 독립 optional `partitions` group vector를 graph 및 Cartesian 의미와 함께 합산한다. 구체적인 public signature나 ChartProgram 저장 구조를 추가하지 않는다.
