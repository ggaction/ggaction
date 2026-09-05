# W2 C2 — categorical side option parity

[전체 승인](../APPROVAL.md) 아래 #108을 수정한다. 기준e8c88162의 categorical normalizer는 right에서 horizontal/columns>1과 양쪽 side의 titlePosition left를 무시하면서 허용한다. Left에서는 유효한 columns1도 거부하여 horizontal grid에서 side로 전환할 수 없다.

모든 categorical side는 기본 direction vertical, align center, columns omission 또는1, titlePosition top이다. 명시적 horizontal/columns>1/left title은 오류다. Columns1을 양쪽에서 허용하여 기존 top columns2에서 columns1을 명시하고 left로 옮길 수 있다. Omitted edit field 보존 정책은 유지하며 compatible 값을 caller가 명시한다. Categorical grid/legacy-bottom과 다른 family는 변경하지 않는다. Runtime layout/renderer의 시각 출력은 같으므로 새 primitive geometry는 필요 없다.

Full/Basic 생성, nested guide와 Full editing, four-edge transition, immutable rejection, type/docs/default 기록과 installed package로 검증한다. 통합 감사의 별도 #109(size 기본 title색)은 이 변경에서 해결하지 않는다.
