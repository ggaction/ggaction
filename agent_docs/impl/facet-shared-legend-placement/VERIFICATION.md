# Plot을 기준으로 배치하는 facet 공유 범례

## 범위

기존 외부 공유 범례의 배치 계약을 고친다. 공개 옵션이나 영속 상태를 추가하지 않는다. 명시한 자식 Canvas 크기와 margin은 유지한다. 승격한 guide의 경계는 변환된 plot 합집합과 기존 recipe offset을 기준으로 계산한다. offset을 생략하면 실제로 남아 있는 축·header의 점유 영역을 피한다. 명시한 offset은 고정되며 실제 텍스트 충돌은 거절한다. 추론한 부모 Canvas는 자식 snapshot과 구체적인 범례를 모두 담는다. 왼쪽·위쪽 공간이 더 필요하면 자식 배치 전체를 이동시킨다. 옆쪽 범례는 전체 점유 경계의 위쪽을 plot 위쪽에 맞춘다. 자유 좌표·plot 내부 범례 그룹의 기존 소유권과, 이전부터 추론하던 categorical 범례의 모양·간격은 유지한다.

기존 명시적 facet materializer가 비공개 배치 소유자 하나를 호출한다. Header materializer와 배치 소유자는 동일한 순수 header-item 해석 함수를 공유한다. Renderer, semantic 상태 소유자, 공개 interface는 바꾸지 않는다.

## 검증 근거

- Unit 전체 **3,080개 통과**.
- Contract 전체 **533개 통과**.
- 문서 전체 **120개 통과**.
- 배치 집중 테스트 4개는 categorical·gradient·size·opacity 범례의 네 방향, 자식 크기 유지, 축·header 점유 공간, 여러 block 그룹, 자유 좌표·모서리 그룹 기준점, 영속화와 layout·scale·guide·title 재실행, 명시적 충돌의 원자적 거절을 확인한다.
- 영향을 받는 repeated-chart의 primitive·render 검사 2개 모두 통과했다. 올바른 범례 점유 공간을 반영해 canonical 부모 너비는 838에서 688이 되며, 자식 panel은 유지된다.
- 독립적인 전체 graphic·semantic 호환 canary 8개가 기존 기준과 정확히 같다. 독립 guide 종류·배치 6개, 이전부터 추론하던 facet 범례, local guide를 갖는 facet을 포함한다.
- 실제 원본 4개 panel·8행을 사용하는 canary에서 모든 막대 좌표·fill·raw 행과 100x300 내부 plot을 유지했다. 오른쪽 범례의 점유 경계 간격은 128에서 정확히 8이 되며, 전체 범례 위쪽은 plot 합집합 위쪽과 같다. 명시한 240x340 자식 Canvas 4개는 유지된다. 추론한 부모 너비는 756에서 606이 된다. 원본 전체 header·title의 일치는 별도 파이프라인 검토 대상이며, 이 라이브러리 canary가 번역을 승인하지는 않는다.
- 설치한 패키지 consumer가 통과했다. 정확한 plot 기준 배치, 자식 margin 유지, 영속화를 확인하는 새 공개 facet 테스트를 포함한다. 차트 픽셀은 검사하지 않았다.

## 크기 측정

Canonical 패키지는 **파일 567개 / 압축 795,791바이트 / 압축 해제 3,904,102바이트**다. 비공개 배치 소유자 하나를 기존 패키지 JavaScript compaction 정책에 포함한다. 측정에 따른 상한은 567 / 796,000 / 3,905,000이다. 설치한 브라우저 bundle의 gzip 크기는 **Full 391,525 / Basic 189,258 / SVG 7,176바이트**다. 따라서 Full 상한만 392,000으로 늘리고, Basic190,000과 SVG25,000은 유지한다. 이는 실제 증가량에 따른 조정이며 이전 상한을 통과했다고 주장하는 것이 아니다.

이 branch는 격리된 개발 checkpoint다. 활성 번역 runtime 통합, 문서 배포, 패키지 발행은 별도 작업이다.
