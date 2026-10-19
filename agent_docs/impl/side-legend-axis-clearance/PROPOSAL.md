# Side legend의 같은 edge axis clearance

## 진행 상태

- [x] published0.0.21에서 독립2행 최소 재현과 충분한 Canvas 공간 확인
- [x] offset90 대조군은 동일 Canvas/data/axis로 생성됨
- [x] 구체 설계 및 기존 사용자 직접 승인 재사용 기록
- [x] 구현·독립 occupied-bounds 회귀 검증
- [x] 전체 normal/설치 consumer/대표 renderer 검증
- [x] 문서·계약·생성물 동기화; 아래 후보 checkpoint로 commit/push
- [ ] 다음200-family checkpoint에서 통합·배포

## 승인과 이슈

Issue: https://github.com/ggaction/ggaction/issues/235

사용자 직접 지시 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함. 새로운 릴리즈는 200개 단위로 하자”의 현재 번역/pipeline/library 작업 범위 승인을 재사용한다. 구체적 공개 default inference와 수치 목표를 이 문서로 고정한 뒤 구현한다. 새 확인 질문을 만들지 않는다. 현재 library candidate의 다른12건은 그대로 유지하며 registry/runtime/docs를 개별 배포하지 않는다. 다음 정기 checkpoint는1413 successful source families이다.

## 문제와 수치 목표

최소 재현의300×200plot, margin L40/R220/T40/B40,2행 scatter와 실제 named right Y axis에서 `createLegend({})`가 right-axis labels와 겹친다는 오류를 낸다. 같은 program의 explicit offset90은 생성된다. 원인은 부족한 Canvas 공간이 아니라 axis lane을 무시한 기본 side anchor다. 원본471행 두-Y chart에서도 첫 모델 호출 전 같은 오류가 재현된다. 재현 원문과 hash는 REPRODUCTION.json에 보존한다.

실제 같은 edge의 axis line/ticks/labels/title occupied bounds를 합친 바깥 경계 뒤에 **기존 family 기본 간격**을 둔다. 예를 들어 default categorical right legend의 전체 occupied left는 max(plot.right, right-axis occupied right)+8이고, left mirror의 전체 occupied right는 min(plot.left, left-axis occupied left)−8이다. Multi-block lane은 기존 stable order와 max-offset 제약을 보존하며 자동 member의 필요한 최소 clearance보다 안으로 들어오지 않는다. 단일 side와 전체 lane의 occupied top은 계속 plot.top이다. Border/stroke와 collection children도 실제 occupied bounds에 포함한다.

명시 offset은0/8을 포함해 계속 plot 기준이며 그 collision error도 유지한다. Free at, plot corners, legacy-bottom과 같은 edge의 axis가 없는 기존 출력은 그대로다. 빈/숨긴 axis component는 lane을 예약하지 않는다. 데이터·scale·Canvas 크기·margin을 변경하거나 label을 숨기지 않는다.

## 저장·계층·replay

- 새 public action/parameter/type/persistence schema를 추가하지 않는다.
- 기존 stored offset과 private inferredOffset 한 곳을 유지한다. 최종 concrete geometry만 파생하며 계산한 offset을 저장하지 않는다.
- 기존 materialization/guides/resources의 horizontal axis-offset resolver를4edge로 확장한다. 같은 module이 side-axis reflow의 실제 관련 edge를 판정한다.
- 기존 side lane materializer가 자신의 실제 foreground/background occupied union을 같은 edge axis 밖으로 옮긴다. 관련 side axis의 변경·제거 전후에는 기존 wrapped legend materializer를 통해 intrinsic geometry를 복원한 뒤 같은 planner를 적용한다. 이전 translation을 누적하거나 새 layout cache를 만들지 않는다.
- 기존 horizontal reflow predicate/trace는 그대로 보존한다. Side reflow는 실제 같은 edge axis와 omitted offset이 만나는 경우에만 추가한다.
- Named axes, continuous/size/opacity, target-owned groups, Canvas/scale/data 및 persistence replay에서 동일한 최종 옵션은 같은 graphicSpec과 accept/reject 결과가 된다.
- Renderer는 계속 graphicSpec만 소비한다. 새 renderer 또는 architecture/package ownership 경계는 없다.

## 검증 및 공개 변경면

최소 right와left mirror, axis-before/after legend, axis title/label/offset edit와remove, Canvas replay, stored offset 불변성, explicit0/8불변거절, no-relevant-side-axis 기존SVG보존, border/stroke, categorical/continuous/size/multi-block/group, Full/Basic/persistence를 검증한다. 기대값은 implementation helper를 재호출하지 않고 실제 axis graphic의 독립 union과 literal gap으로 계산한다. 대표 explicit-offset target과 inferred 결과의 SVG/decoded Canvas/PDF 내용도 비교하며 이미지를 열어 보지 않는다.

LEGEND_AND_TITLE current contract와 public legend 문서에 omitted external4edge offset 정책을 동기화한다. Generated LLM/provenance를 재생성한다. 기존 전체 normal suite, package 소비자와 budget을 확인한다. 모든 budget은 실제 측정 후 필요한 최소 조정만 기록한다. 기존 source-specific 번역/runtime 증거는 변경하지 않는다.
