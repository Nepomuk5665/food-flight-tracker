import { DashboardNav } from "@/components/dashboard/DashboardNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0d1117] font-sans text-[#c9d1d9]">
      <header className="border-b border-[#1e2a3a] bg-[#111111] px-6 py-4 text-white">
        <p className="text-xs font-bold uppercase tracking-wide">
          Project Trace{" "}
          <span className="text-[#9eca45]">&bull;</span>{" "}
          QA Dashboard
        </p>
      </header>

      <div className="flex w-full flex-col md:flex-row">
        <aside className="w-full border-b border-[#1e2a3a] bg-[#0f1923] md:min-h-[calc(100vh-57px)] md:w-56 md:border-b-0 md:border-r">
          <DashboardNav />
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
