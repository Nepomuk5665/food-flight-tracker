import Link from "next/link";
import { Camera, LayoutDashboard } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-dim font-sans text-body">
      <header className="bg-primary px-6 py-16 text-center text-white">
        <h1 className="text-4xl font-bold uppercase tracking-wider md:text-5xl">Project Trace</h1>
        <p className="mt-4 text-lg font-medium text-accent md:text-xl">Food Supply Chain Tracking</p>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <div className="grid gap-6 md:grid-cols-2">
          <article className="flex flex-col border border-border bg-white p-8 shadow-sm">
            <div className="mb-6 flex h-12 w-12 items-center justify-center bg-surface-dim">
              <Camera className="h-6 w-6 text-accent" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-primary">Consumer App</h2>
            <p className="mb-8 flex-1 text-muted">
              Scan any barcode to trace your food&apos;s journey from farm to shelf. View safety alerts, ingredients, and origin data.
            </p>
            <Link
              href="/scan"
              className="inline-flex w-full items-center justify-center bg-accent px-6 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-button transition-colors hover:bg-accent-hover"
            >
              Scan Product
            </Link>
          </article>

          <article className="flex flex-col border border-border bg-white p-8 shadow-sm">
            <div className="mb-6 flex h-12 w-12 items-center justify-center bg-surface-dim">
              <LayoutDashboard className="h-6 w-6 text-primary" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-primary">QA Dashboard</h2>
            <p className="mb-8 flex-1 text-muted">
              Monitor supply chain health, incidents, and batch analytics. Manage recalls and track product distribution.
            </p>
            <Link
              href="/overview"
              className="inline-flex w-full items-center justify-center border-2 border-[#003a5d] bg-transparent px-6 py-4 text-sm font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-white"
            >
              QA Dashboard
            </Link>
          </article>
        </div>
      </main>

      <footer className="border-t border-border bg-white py-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">
          Powered by Autexis
        </p>
      </footer>
    </div>
  );
}
