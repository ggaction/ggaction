# 새 정책 모듈의 coverage 보호

## 범위

`test/contracts/AGENTS.md`의 새 고위험 정책/renderer 모듈 보호 규칙에 따라
legend grammar와 facet guide scaffolding에 자동 prefix family를 적용했다.
새 결합, 축, 용량/namespace, 부모 범례, graphic translation owner에는
기존 family보다 엄격한 명시적 floor를 적용한다. 기존103개 floor와 global94/89/98은 유지한다.

## 실제 누락 회귀

- Linked categorical order는 domain만 정렬하고 category별 물리 면적 대응을 보존해야 한다.
  잘못된 linked field/domain 및 비어 있거나 음수·비유한 면적을 거부하는 정책을 직접 검증했다.
- 합성된 point graphic에 서로 다른 raw owner가 중복되면 하나를 고르지 않고 진단 정보를
  포함해 거부해야 한다. 단일 child owner의 실제 row count와 Unicode namespace도 검증했다.
- 정책/규칙 unit8개 통과. 결합 정책95.56lines/90branches/100functions,
  graphic capacity100/100/100의 집중 coverage 통과. runtime 구현은 바꾸지 않았다.
- 이전 source28 전체 coverage는95.33/92.52/98.66 및 기존103개 floor를 통과했다.
  확장된 floor를 포함한 최종 전체 coverage는 별도 실행하며 이 기록을 그 성공으로 대체하지 않는다.
