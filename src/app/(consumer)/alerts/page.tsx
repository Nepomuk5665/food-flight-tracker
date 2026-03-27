import { AlertsList, type Alert } from "@/components/alerts-list";

const ALERTS: Alert[] = [
  {
    id: "1",
    severity: "Critical",
    title: "Listeria Contamination Risk",
    description: "Routine testing detected potential Listeria monocytogenes in the production facility. Do not consume.",
    timestamp: "2h ago",
    lotCode: "C-CHOC-001",
    status: "Active",
  },
  {
    id: "2",
    severity: "Warning",
    title: "Packaging Seal Defect",
    description: "Reports of compromised seals on yogurt cups which may lead to premature spoilage.",
    timestamp: "5h ago",
    lotCode: "Y-CUP-001",
    status: "Under Review",
  },
  {
    id: "3",
    severity: "Info",
    title: "Ingredient Sourcing Update",
    description: "Temporary switch to alternative vanilla extract supplier due to supply chain constraints. No allergen impact.",
    timestamp: "1d ago",
    lotCode: "V-EXT-042",
    status: "Resolved",
  },
  {
    id: "4",
    severity: "Critical",
    title: "Undeclared Peanut Allergen",
    description: "Cross-contamination during manufacturing resulted in trace amounts of peanut not listed on the label.",
    timestamp: "2d ago",
    lotCode: "B-BAR-099",
    status: "Active",
  },
  {
    id: "5",
    severity: "Warning",
    title: "Temperature Excursion",
    description: "Cold chain monitoring indicated a brief temperature spike during transit. Product safety is being evaluated.",
    timestamp: "3d ago",
    lotCode: "M-MILK-204",
    status: "Under Review",
  },
  {
    id: "6",
    severity: "Info",
    title: "New Packaging Design",
    description: "Rolling out updated packaging with improved recyclability. Product formulation remains unchanged.",
    timestamp: "1w ago",
    lotCode: "ALL-B-001",
    status: "Resolved",
  },
];

export default function AlertsPage() {
  return (
    <section className="space-y-4 font-sans">
      <h1 className="text-3xl font-bold uppercase tracking-wide text-primary">Active Recalls</h1>
      <AlertsList alerts={ALERTS} />
    </section>
  );
}
