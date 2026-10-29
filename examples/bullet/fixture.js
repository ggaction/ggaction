export const canvas = { width: 360, height: 160, margin: { left: 30, right: 30, top: 45, bottom: 45 } };
export const ranges = [
  { id: "low", lower: 0, upper: 50, level: "Low" },
  { id: "middle", lower: 50, upper: 75, level: "Middle" },
  { id: "high", lower: 75, upper: 100, level: "High" }
];
export const observations = [{ id: "revenue", metric: "Revenue", actual: 65, target: 80 }];
export const amountScale = { id: "amount", domain: [0, 100], nice: false, zero: true };
