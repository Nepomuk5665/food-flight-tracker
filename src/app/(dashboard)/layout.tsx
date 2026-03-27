import Link from "next/link";

const DASHBOARD_LINKS = [
  { href: "/overview", label: "Overview" },
  { href: "/batch/demo-lot", label: "Batches" },
  { href: "/incidents", label: "Incidents" },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f9fa] font-sans text-[#424242]">
      <header className="border-b border-[#111111] bg-[#111111] px-6 py-4 text-white">
        <p className="text-xs font-bold uppercase tracking-wide">Project Trace • QA Dashboard</p>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px] flex-col md:flex-row">
        <aside className="w-full border-b border-[#dddddd] bg-white md:min-h-[calc(100vh-57px)] md:w-64 md:border-b-0 md:border-r">
          <nav className="p-4">
            <ul className="space-y-2">
              {DASHBOARD_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block border border-[#dddddd] px-3 py-2 text-xs font-semibold uppercase text-[#003a5d] hover:bg-[#f7f9fa] rounded-none"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
