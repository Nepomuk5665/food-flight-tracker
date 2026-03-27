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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF8] p-8 font-sans">
        <div className="max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#16A34A]">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Mobile Only</h1>
          <p className="mt-3 text-sm text-[#9CA3AF]">
            The Consumer App is designed for mobile devices with a camera for barcode scanning. Scan this QR code with your phone:
          </p>
          <div className="mx-auto mt-6 inline-block rounded-xl border-4 border-[#16A34A] p-3">
            <QRCodeSVG
              value="https://foodflighttracker.com/scan"
              size={200}
              fgColor="#16A34A"
              bgColor="#ffffff"
            />
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#16A34A]">
            foodflighttracker.com/scan
          </p>
          <p className="mt-6 text-sm text-[#9CA3AF]">
            Looking for the QA Dashboard?
          </p>
          <Link
            href="/overview"
            className="mt-2 inline-block rounded-xl border-2 border-[#16A34A] bg-white px-6 py-3 text-xs font-bold uppercase text-[#16A34A] shadow-sm transition-all hover:bg-[#16A34A] hover:text-white"
          >
            Open QA Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
