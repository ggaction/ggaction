# Quantitative authoring — 승인된 미래 계약

상태: Planned, readiness accepted. 사용자가 2026-09-05 “그렇게하자. 그것까지 포함해서 승인한다”라고 답해
[Phase 4 계약](../../impl/roadmap6/phase4/CONTRACT_REVIEW.md)의 P4-C01–C09와 이름 `layoutSeries`를 승인했다.
`encodeLayout` alias는 만들지 않는다. Area/layout의 승인된 V1 구현은 Current COMPLETE_CHARTS/ENCODINGS/MARKS로 이동했다.
완성 차트의 입력 union·전체 hierarchy·저장 결과는 아래 chart owner에 함께 보존한다.
남은 color scale/legend transition capability 1개는 Planned 상태다. Rose/Radial facade와 measured radius는 Current COMPLETE_CHARTS/ENCODINGS/CORE로 이동했다. 로드맵 전체 실행은 승인되었으며 구현·검증 후 Current로 이동한다.
Theta/legend order는 Current ENCODINGS/LEGEND_AND_TITLE로 이동했다.



## Color scale and legend transitions

- Midpoint 생성·편집·nested scale·mapping·gradient tick은 Current CORE/ENCODINGS/LEGEND_AND_TITLE로 이동했다. 아래 family transition만 Planned다.
- Sequential↔quantize/quantile/threshold의 생성/edit/reencode validator를 Point/Bar/Rect의 현재 지원 grain으로 통합한다.
  Active right/vertical legend는 보존 가능한 common style과 함께 전환한다. Family-only custom style은 오류이며 버리지 않는다.
- All shared consumers와 guide preflight 실패 시 전부 rollback. Top/bottom/left interval 확장은 별도 Phase 5다.
- Family transition coverage missing. 양방향 전환·style 보존/오류·전체 shared consumer preflight·설치 소비자 검증이 필요하다.
