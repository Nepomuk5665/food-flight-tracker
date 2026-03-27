import { ConsumerNav } from "@/components/consumer-nav";
import MobileGate from "@/components/mobile-gate";

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileGate>
      <div className="min-h-screen bg-white font-sans text-body">
        <main className="mx-auto w-full max-w-[480px] px-4 pb-24 pt-4">{children}</main>
        <ConsumerNav />
      </div>
    </MobileGate>
  );
}
