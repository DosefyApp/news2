import { describe, expect, it } from "vitest";
import { news2Engine } from "@/features/clinical-calculators/engines/engine";

describe("news2Engine", () => {
  it("retorna score zero em cenário estável", () => {
    const parsed = news2Engine.parse({
      respiratoryRate: 18,
      oxygenScale: "1",
      oxygenSaturation: 97,
      supplementalOxygen: "no",
      systolicBloodPressure: 120,
      heartRate: 80,
      temperature: 36.8,
      consciousness: "alert",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(news2Engine.compute(parsed.data).headline.value).toBe("0");
  });

  it("retorna risco médio com soma de 6 pontos", () => {
    const parsed = news2Engine.parse({
      respiratoryRate: 24,
      oxygenScale: "1",
      oxygenSaturation: 93,
      supplementalOxygen: "yes",
      systolicBloodPressure: 120,
      heartRate: 80,
      temperature: 36.8,
      consciousness: "alert",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(news2Engine.compute(parsed.data).headline.value).toBe("6");
  });

  it("retorna alto risco em cenário grave", () => {
    const parsed = news2Engine.parse({
      respiratoryRate: 28,
      oxygenScale: "1",
      oxygenSaturation: 88,
      supplementalOxygen: "yes",
      systolicBloodPressure: 85,
      heartRate: 135,
      temperature: 35,
      consciousness: "new-confusion",
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(Number(news2Engine.compute(parsed.data).headline.value)).toBeGreaterThanOrEqual(7);
  });
});
