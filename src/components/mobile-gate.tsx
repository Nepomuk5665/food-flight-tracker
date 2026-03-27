"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone } from "lucide-react";
import Link from "next/link";

export default function MobileGate({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!isMobile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f7f9fa] p-8 font-sans">
        <div className="max-w-md border border-[#dddddd] bg-white p-10 text-center">
          <Smartphone className="mx-auto mb-5 h-14 w-14 text-[#003a5d]" />
          <h1 className="text-2xl font-bold uppercase text-[#003a5d]">Mobile Only</h1>
          <p className="mt-3 text-sm text-[#777777]">
            The Consumer App is designed for mobile devices with a camera for barcode scanning. Scan this QR code with your phone to open it:
          </p>
          <div className="mx-auto mt-6 inline-block border-4 border-[#003a5d] p-3">
            <QRCodeSVG
              value="https://foodflighttracker.com/scan"
              size={200}
              fgColor="#003a5d"
              bgColor="#ffffff"
            />
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#9eca45]">
            foodflighttracker.com/scan
          </p>
          <p className="mt-6 text-sm text-[#777777]">
            Looking for the QA Dashboard?
          </p>
          <Link
            href="/overview"
            className="mt-2 inline-block bg-[#003a5d] px-6 py-3 text-xs font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all hover:bg-[#9eca45]"
          >
            Open QA Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
