"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useZxing } from "react-zxing";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { parseGS1 } from "@/lib/scanner/gs1-parser";

export default function ScanPage() {
  const router = useRouter();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { ref } = useZxing({
    onDecodeResult(result) {
      if (!scanning) return;
      setScanning(false);
      
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      const text = result.getText();
      
      if (text.startsWith("(01)") || text.startsWith("01")) {
        const parsed = parseGS1(text);
        if (parsed.batch) {
          router.push(`/journey/${parsed.batch}`);
          return;
        }
        if (parsed.gtin) {
          router.push(`/product/${parsed.gtin}`);
          return;
        }
      }
      
      router.push(`/product/${text}`);
    },
    onError(err) {
      const error = err as Error;
      if (error.name === "NotFoundException") return;
      
      if (error.name === "NotAllowedError") {
        setError("Camera access denied. Please use manual entry.");
        setScanning(false);
      }
    },
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = barcodeInput.trim();
    if (/^\d{8,14}$/.test(cleanInput)) {
      router.push(`/product/${cleanInput}`);
    } else {
      alert("Please enter a valid numeric barcode (8-14 digits).");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white font-sans">
      <div className="absolute left-0 top-0 z-10 p-4">
        <Link 
          href="/" 
          className="flex h-10 w-10 items-center justify-center bg-white/90 text-[#003a5d] shadow-[0_1px_3px_rgba(0,0,0,0.118)] transition-all hover:bg-[#9eca45] hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      <div className="relative flex-1 bg-black">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center bg-[#f7f9fa] p-6 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-[#dc2626]" />
            <p className="text-lg font-bold text-[#424242]">{error}</p>
          </div>
        ) : (
          <>
            <video 
              ref={ref} 
              className="h-full w-full object-cover" 
              playsInline 
              muted 
            />
            
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-64 w-64">
                <div className="absolute left-0 top-0 h-8 w-8 border-l-4 border-t-4 border-[#9eca45]"></div>
                <div className="absolute right-0 top-0 h-8 w-8 border-r-4 border-t-4 border-[#9eca45]"></div>
                <div className="absolute bottom-0 left-0 h-8 w-8 border-b-4 border-l-4 border-[#9eca45]"></div>
                <div className="absolute bottom-0 right-0 h-8 w-8 border-b-4 border-r-4 border-[#9eca45]"></div>
                
                <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-[#9eca45] shadow-[0_0_8px_#9eca45] animate-pulse"></div>
              </div>
            </div>

            <div className="absolute bottom-8 left-0 right-0 text-center">
              <span className="inline-block bg-black/50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white">
                {scanning ? "Scanning..." : "Processing..."}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="bg-white p-6 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <form onSubmit={handleManualSubmit} className="mx-auto max-w-[480px] space-y-3">
          <label htmlFor="manual-barcode" className="block text-sm font-normal text-[#424242]">
            Enter barcode manually
          </label>
          <div className="flex gap-2">
            <input
              id="manual-barcode"
              type="text"
              inputMode="numeric"
              pattern="\d*"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="e.g. 4012345678901"
              className="flex-1 border border-[#dddddd] bg-white px-3 py-3 text-sm text-[#424242] outline-none transition-all focus:border-[#bbbbbb] rounded-none"
            />
            <button
              type="submit"
              className="bg-[#9eca45] px-7 py-3 text-xs font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all duration-200 ease-in hover:bg-[#333333] rounded-none"
            >
              Lookup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
