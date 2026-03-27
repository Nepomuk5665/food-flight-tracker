import { ConsumerNav } from "@/components/consumer-nav";

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white font-sans text-body">
      <main className="mx-auto w-full max-w-[480px] px-4 pb-24 pt-4">{children}</main>

      <ConsumerNav />
    </div>
  );
}
