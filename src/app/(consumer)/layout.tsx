import Link from "next/link";
import { Camera, Bell, MessageCircle, PackageSearch } from "lucide-react";

const NAV_ITEMS = [
  { href: "/scan", label: "Scan", icon: Camera },
  { href: "/product/4012345678901", label: "Product", icon: PackageSearch },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/alerts", label: "Alerts", icon: Bell },
] as const;

export default function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white font-sans text-[#424242]">
      <main className="mx-auto w-full max-w-[480px] px-4 pb-24 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#dddddd] bg-white">
        <ul className="mx-auto grid w-full max-w-[480px] grid-cols-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex flex-col items-center justify-center gap-1 border-r border-[#eeeeee] px-2 py-2 text-xs font-semibold uppercase text-[#003a5d] last:border-r-0"
              >
                <Icon className="h-4 w-4 text-[#9eca45]" aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
