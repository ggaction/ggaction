# 그래프 계산과 조건부 통합

## 진행 상태

- [x] force·group·sequence 계산을 조건부 통합 `eab0c26b`와 병합
- [x] graph80, architecture/package/navigation24, package7 통과
- [x] Node20/22/24 staging 실측과 최소 package ceiling 고정
- [ ] graph 공개 resource·action·layout·revision 통합 및 STEP-021/029–032 종료

[원본 실행 증거](integrated-evidence/manifest.json)를 보존한다. 757entries, unpacked5,180,779bytes, Node20/24 최대packed1,123,769bytes를 측정해 ceilings757/5,181,000/1,124,000을 적용한다. Module 두 개를 더했으며 public export나 bundle import graph는 바뀌지 않았다. 이전 private checkpoint의 coverage는 동일 runtime bytes의 증거로 유지하며 전체 통합 coverage를 새로 실행했다고 주장하지 않는다.
