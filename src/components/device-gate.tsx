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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="relative mx-4 max-w-md border border-[#dddddd] bg-white p-8 text-center">
          <button onClick={() => setBlocked(false)} className="absolute right-3 top-3 text-[#777777] hover:text-[#060606]">
            <X className="h-5 w-5" />
          </button>
          <Smartphone className="mx-auto mb-4 h-12 w-12 text-[#003a5d]" />
          <h2 className="text-xl font-bold uppercase text-[#003a5d]">Mobile Only</h2>
          <p className="mt-2 text-sm text-[#777777]">
            The Consumer App requires a phone camera for barcode scanning. Scan this QR code with your phone:
          </p>
          <div className="mx-auto mt-6 inline-block border-4 border-[#003a5d] p-3">
            <QRCodeSVG
              value="https://foodflighttracker.com/scan"
              size={180}
              fgColor="#003a5d"
              bgColor="#ffffff"
            />
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#9eca45]">
            foodflighttracker.com/scan
          </p>
        </div>
      </div>
    );
  }

  if (blocked && type === "desktop-only") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="relative mx-4 max-w-md border border-[#dddddd] bg-white p-8 text-center">
          <button onClick={() => setBlocked(false)} className="absolute right-3 top-3 text-[#777777] hover:text-[#060606]">
            <X className="h-5 w-5" />
          </button>
          <Monitor className="mx-auto mb-4 h-12 w-12 text-[#003a5d]" />
          <h2 className="text-xl font-bold uppercase text-[#003a5d]">Desktop Only</h2>
          <p className="mt-2 text-sm text-[#777777]">
            The QA Dashboard is designed for desktop screens. Open this URL on your computer:
          </p>
          <div className="mx-auto mt-6 border border-[#dddddd] bg-[#f7f9fa] px-5 py-3">
            <p className="text-sm font-bold text-[#003a5d]">foodflighttracker.com/overview</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={handleClick} className="cursor-pointer">
      {children}
    </div>
  );
}
