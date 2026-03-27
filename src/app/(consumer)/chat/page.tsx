"use client";

export default function ChatPage() {
  return (
    <section className="flex min-h-[70vh] flex-col font-sans">
      <h1 className="mb-4 text-3xl font-bold uppercase tracking-wide text-[#003a5d]">AI Food Assistant</h1>

      <div className="flex-1 border border-[#dddddd] bg-[#f7f9fa] p-4 rounded-none">
        <ul className="space-y-3 text-sm text-[#424242]">
          <li className="border border-[#dddddd] bg-white p-3 rounded-none">Assistant message placeholder</li>
          <li className="border border-[#dddddd] bg-white p-3 rounded-none">User message placeholder</li>
        </ul>
      </div>

      <form className="mt-3 flex gap-2 border border-[#dddddd] bg-white p-2 rounded-none">
        <input
          type="text"
          placeholder="Ask about this product..."
          className="w-full border border-[#dddddd] bg-white px-3 py-2 text-xs text-[#424242] outline-none focus:border-[#bbbbbb] rounded-none"
        />
        <button
          type="submit"
          className="bg-[#9eca45] px-5 py-2 text-xs font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all duration-200 ease-in hover:bg-[#333333] rounded-none"
        >
          Send
        </button>
      </form>
    </section>
  );
}
