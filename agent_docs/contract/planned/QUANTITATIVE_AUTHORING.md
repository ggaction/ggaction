# Quantitative authoring — 승인된 미래 계약

상태: Planned, readiness accepted. 사용자가 2026-09-05 “그렇게하자. 그것까지 포함해서 승인한다”라고 답해
[Phase 4 계약](../../impl/roadmap6/phase4/CONTRACT_REVIEW.md)의 P4-C01–C09와 이름 `layoutSeries`를 승인했다.
`encodeLayout` alias는 만들지 않는다. Area/layout의 승인된 V1 구현은 Current COMPLETE_CHARTS/ENCODINGS/MARKS로 이동했다.
완성 차트의 입력 union·전체 hierarchy·저장 결과는 아래 chart owner에 함께 보존한다.
남은 sequential midpoint/transition capability 1개는 Planned 상태다. Rose/Radial facade와 measured radius는 Current COMPLETE_CHARTS/ENCODINGS/CORE로 이동했다. 로드맵 전체 실행은 승인되었으며 구현·검증 후 Current로 이동한다.
Theta/legend order는 Current ENCODINGS/LEGEND_AND_TITLE로 이동했다.



## Sequential midpoint and transitions

- Planned parameter extension: quantitative sequential createScale/nested scale/editScale의 midpoint:number|auto.
  Finite midpoint는 최종 domain 내부에 엄격히 있어야 하고 auto는 기존 endpoint-linear mapping으로 복귀한다.
- Mapper는 양쪽 domain 구간을 색상 parameter [0,.5]/[.5,1]에 나눈다. 중앙 palette sample이 지정 value를 뜻한다.
  Legend는 value-linear 위치를 유지한다. [-2,8], midpoint0의 neutral 위치는 20%다.
- Sequential↔quantize/quantile/threshold의 생성/edit/reencode validator를 Point/Bar/Rect의 현재 지원 grain으로 통합한다.
  Active right/vertical legend는 보존 가능한 common style과 함께 전환한다. Family-only custom style은 오류이며 버리지 않는다.
- All shared consumers와 guide preflight 실패 시 전부 rollback. Top/bottom/left interval 확장은 별도 Phase 5다.
- Coverage missing. 비대칭 domain, reverse/clamp/interpolation, reset·family 양방향 전환·설치 소비자 검증이 필요하다.
