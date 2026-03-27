"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, Monitor, X } from "lucide-react";

type Props = {
  type: "mobile-only" | "desktop-only";
  href: string;
  children: React.ReactNode;
};

export default function DeviceGate({ type, href, children }: Props) {
  const router = useRouter();
  const [blocked, setBlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setChecked(true);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (!checked) return;

    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (type === "mobile-only" && !mobile) {
      e.preventDefault();
      setBlocked(true);
      return;
    }

    if (type === "desktop-only" && mobile) {
      e.preventDefault();
      setBlocked(true);
      return;
    }

    router.push(href);
  };

  if (blocked && type === "mobile-only") {
    return (
      <>
        <div className="cursor-pointer">{children}</div>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setBlocked(false)}>
          <div className="relative mx-4 max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setBlocked(false)} className="absolute right-3 top-3 rounded-xl p-2 text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#1A1A1A]">
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#16A34A]">
              <Smartphone className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-[#1A1A1A]">Mobile Only</h2>
            <p className="mt-2 text-sm text-[#9CA3AF]">
              The Consumer App requires a phone camera for barcode scanning. Scan this QR code with your phone:
            </p>
            <div className="mx-auto mt-6 inline-block rounded-xl border-4 border-[#16A34A] p-3">
              <QRCodeSVG
                value="https://foodflighttracker.com/scan"
                size={180}
                fgColor="#16A34A"
                bgColor="#ffffff"
              />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#16A34A]">
              foodflighttracker.com/scan
            </p>
            <button onClick={() => setBlocked(false)} className="mt-6 rounded-xl bg-[#16A34A] px-6 py-3 text-xs font-bold uppercase text-white shadow-sm transition-all hover:bg-[#15803D]">
              Close
            </button>
          </div>
        </div>
      </>
    );
  }

  if (blocked && type === "desktop-only") {
    return (
      <>
        <div className="cursor-pointer">{children}</div>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setBlocked(false)}>
          <div className="relative mx-4 max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setBlocked(false)} className="absolute right-3 top-3 rounded-xl p-2 text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#1A1A1A]">
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#16A34A]">
              <Monitor className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-[#1A1A1A]">Desktop Only</h2>
            <p className="mt-2 text-sm text-[#9CA3AF]">
              The QA Dashboard is designed for desktop screens. Open this URL on your computer:
            </p>
            <div className="mx-auto mt-6 rounded-xl border border-[#E5E7EB] bg-[#F3F4F6] px-5 py-3">
              <p className="text-sm font-bold text-[#1A1A1A]">foodflighttracker.com/overview</p>
            </div>
            <button onClick={() => setBlocked(false)} className="mt-6 rounded-xl bg-[#16A34A] px-6 py-3 text-xs font-bold uppercase text-white shadow-sm transition-all hover:bg-[#15803D]">
              Close
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div onClick={handleClick} className="cursor-pointer">
      {children}
    </div>
  );
}
