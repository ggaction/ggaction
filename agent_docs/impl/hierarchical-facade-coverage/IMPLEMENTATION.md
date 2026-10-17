# Hierarchical facade 실제 옵션 검증 보완

## 진행 상태

- [x] 공개 옵션·리터럴의 실제 호출 사례 추가(13 facade, 33 기본 profile).
- [x] Area 입력을 선택된 실제 데이터의 summary/computed pipeline으로 교체.
- [x] Density/Horizon/Rug의 실행 불가능한 band grid 역할 5개에 runtime·TS·inventory 회귀 추가.
- [x] Area 두 independent-channel 방향의 band grid 계약 보존.
- [x] Current·영문 문서·생성 참조 동기화.
- [x] 8개 실제 데이터셋의 C5 계약 최종 통과.
- [x] 설치 소비자 최종 통과.
- [x] 검증된 checkpoint commit/push.

## 원인과 수정

기존 C5는 새로운 label/grid/legend/paint/sqrt 옵션을 타입에서 발견했지만 실제 facade
호출에 전달하지 않았다. 옵션을 제외하거나 5회·3데이터셋 기준을 낮추지 않고 fixture에
실행 가능한 조합을 추가했다. 범례 at와 position/align/offset의 배타성, inline title의
align 금지, gradient와 sampled symbols의 배타성, categorical grid의 count 금지를 따른다.

Density의 value/density, Rug의 quantitative/temporal measure, Horizon의 original x는
모두 continuous scale이다. 두 bandPosition 리터럴이 모두 runtime에서 실패하며 다른
band scale을 넣어도 facade 소유자 검증이 거부한다. 기존 runtime은 바꾸지 않고 이 5개
불가능한 선언 경로만 좁혔다. Area는 valueChannel x의 horizontal band와 valueChannel y의
vertical band를 모두 유지하고 실제 성공·TS·inventory로 검증한다.

기존 Area fixture의 A/B × 1/2/3 합성 값을 실제 analysisRows의 bucket별 집계로 교체했다.
position은 source rowOrdinal 최솟값, magnitude는 실제 positiveY 평균, range는 실제 lower/upper
최솟값/최댓값, timestamp는 실제 timestamp 최솟값이다. All observations는 전체집계의 명시적
series 이름이며 calendarYear는 기존 시간 입력 단위 검증용 bucket ordinal projection이다.
원본 행은 수정하지 않고 summary/computed provenance를 보존한다. 명시 grid 값도 이 집계
field의 실제 값에서 선택한다.

## 검증

- 관련 역할·타입 계약: 13/13 PASS.
- 공개 문서: 120/120 PASS.
- C5 원본 계약: 8개 실제 데이터셋, 최소 5회/3셋 기준, 1/1 PASS (413.4초).
  원본 test와 coverage threshold는 변경하지 않았다.
- 최종 runtime·TS·inventory 역할 회귀: 5/5 PASS. 관련 계약 묶음 13/13 PASS,
  compact action cards·offset 선언 묶음 11/11 PASS.
- 설치 Full/Basic 소비자, TS, PNG/PDF/SVG, MCP, tutorial, browser bundle PASS.
  소비자에는 continuous grid 5개 negative와 Area 양방향 band positive 호출을 포함했다.
- 패키지 SHA-256: `f53d4462f7a9e19c4cd7b7ad70627eef071c6102a11fb1824775fb91d59bf5ff`.
  Browser gzip bytes: Full 391525, Basic 189258, SVG 7176.
- 최종 로그: `/tmp/ggaction-hierarchical-full-final.log`,
  `/tmp/ggaction-hierarchical-package-final.log`, `/tmp/ggaction-hierarchical-docs.log`,
  `/tmp/ggaction-hierarchical-contracts.log`, `/tmp/ggaction-continuous-grid-role-final.log`.
- 전체 release inventory fingerprint와 cross-platform renderer/facet 검증은 root의 통합 브랜치에서
  최종 소스·타입으로 재계산한다. 이번 변경은 버전·발행·issue 상태를 바꾸지 않는다.
- 중간 실패는 보존: 초기 sampled-size legend의 gradient 처리, 실제 Area 입력 교체 후
  고정 grid 값의 domain 이탈. 두 경우 모두 fixture를 올바른 소유자·실제 값으로 수정했으며
  production 경계·coverage 기준은 완화하지 않았다.
