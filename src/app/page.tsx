import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 font-sans text-[#424242]">
      <main className="w-full max-w-[1170px] border border-[#dddddd] bg-[#f7f9fa] p-8 text-center sm:p-12 rounded-none">
        <h1 className="text-5xl font-normal text-[#060606]">Project Trace</h1>
        <p className="mt-4 text-lg font-normal text-[#424242]">Food Supply Chain Tracking</p>

        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/scan"
            className="flex w-full items-center justify-center bg-[#9eca45] px-7 py-3.5 text-xs font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all duration-200 ease-in hover:bg-[#333333] rounded-none"
          >
            Scan Product
          </Link>
          <Link
            href="/overview"
            className="flex w-full items-center justify-center border border-[#003a5d] px-7 py-3.5 text-xs font-bold uppercase text-[#003a5d] shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all duration-200 ease-in hover:bg-[#003a5d] hover:text-white rounded-none"
          >
            QA Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
