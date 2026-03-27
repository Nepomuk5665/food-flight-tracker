import { ConsumerNav } from "@/components/consumer-nav";
import MobileGate from "@/components/mobile-gate";

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileGate>
      <div className="min-h-screen bg-background font-sans text-body">
        <div className="mx-auto w-full max-w-lg px-4 pt-3">
          <p className="text-[10px] font-medium tracking-wide text-muted">Project Trace</p>
        </div>
        <main className="mx-auto w-full max-w-lg px-4 pb-28 pt-2">{children}</main>
        <ConsumerNav />
      </div>
    </MobileGate>
  );
}
