# Theme와 최신 resource 통합 기준

## 진행 상태

- [x] `f4d6c1c7d`와 stable main `f1800607d` 병합
- [x] Native typography/guide defaults와 Partition/Flow/font/effect 소유자 보존
- [x] 집중·설치본·option inventory·문서·package 한도 검증
- [ ] Flow theme role 연결과 STEP-033의 나머지 token/provenance
- [ ] STEP-034/035 responsive guide와 nested composition

병합 source는 `cad229d88`다. Runtime 충돌은 없었으며 Partition의 resource theme/typography 추가,
Flow label font binder와 shared effects를 그대로 유지했다. 문서 생성물은 canonical generator로
재생성했고 coverage family는 양쪽 집합을 보존했다. Public action은 328개이고 global theme
fontSize/fontWeight 두 option을 포함한 actual inventory는 30,017 paths다. Canonical realistic
inventory owner의 7개 검사가 통과했으며 기존 test의 직접 무제한 실행은 중단하고 근거로 사용하지 않았다.

Theme 94개, font/Flow/boundaries 59개, resource effects 33개, package 7개, 추가 theme/package 12개가
통과했다. 문서 source link 한 건은 병합 전 branch ref에 새 예제 파일이 없어 실패했으며 merge source
commit 뒤 같은 링크 검사를 통과했다. 최종 docs 결과와 로그는 아래 evidence에 보존한다.

Node20 고정 tar의 source-free consumer는 public import만으로 가이드·identity·resource plot·typography
47개를 실행했다. 정확 font fixture bytes도 복사했으며 구현 소스 경로는 사용하지 않았다. 실측은
865 entries / 1,264,038 packed / 5,815,002 unpacked bytes이고 bundle gzip은 Full636,849 / Basic361,295 /
SVG20,196 bytes다. 해당 최종 tar는 `105036ee4382709bf46f754834e14934315cae28cadd3f6d863b22b5fdba6216`이다.

`main-integration-evidence/summary.json`이 입력·로그·설치 결과를 소유한다. Parent의 stable main full
qualification을 기반으로 이 branch의 변경 교차 범위만 추가 검증했다. Whole source coverage·전체
realistic corpus·3개 Node 전체 설치를 새로 반복했다고 주장하지 않는다.
