import { CollapsibleSidebar } from "@/components/dashboard/CollapsibleSidebar";
import DesktopGate from "@/components/desktop-gate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DesktopGate>
      <div className="min-h-screen bg-black font-sans text-white">
        <CollapsibleSidebar />
        <main className="md:pl-12">{children}</main>
      </div>
    </DesktopGate>
  );
}
