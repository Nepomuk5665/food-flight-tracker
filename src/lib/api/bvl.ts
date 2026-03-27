export interface Recall {
  id: string;
  productName: string;
  reason: string;
  severity: "warning" | "critical";
  affectedBatches: string[];
  createdAt: string;
  source: "bvl";
}

export async function getRecalls(): Promise<Recall[]> {
  // TODO: Integrate with BVL Lebensmittelwarnung API and map source payload.
  return [
    {
      id: "placeholder-recall-1",
      productName: "Demo Product",
      reason: "Placeholder recall record",
      severity: "warning",
      affectedBatches: ["LOT-DEMO-001"],
      createdAt: new Date().toISOString(),
      source: "bvl",
    },
  ];
}
