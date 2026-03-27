"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle, Zap } from "lucide-react";
import Link from "next/link";
import { parseGS1 } from "@/lib/scanner/gs1-parser";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<InstanceType<typeof import("barcode-detector/ponyfill").BarcodeDetector> | null>(null);
  const rafRef = useRef<number>(0);
  const scanningRef = useRef(true);

  const [error, setError] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [fps, setFps] = useState(0);
  const [ready, setReady] = useState(false);

  const handleDetection = useCallback(
    (rawValue: string) => {
      if (!scanningRef.current) return;
      scanningRef.current = false;

      navigator.vibrate?.(200);

      if (rawValue.startsWith("(01)") || rawValue.startsWith("01")) {
        const parsed = parseGS1(rawValue);
        if (parsed.batch) {
          router.push(`/journey/${parsed.batch}`);
          return;
        }
        if (parsed.gtin) {
          router.push(`/product/${parsed.gtin}`);
          return;
        }
      }

      router.push(`/product/${rawValue}`);
    },
    [router],
  );

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frameCount = 0;
    let lastFpsTime = performance.now();

    async function init() {
      try {
        const { BarcodeDetector } = await import("barcode-detector/ponyfill");

        detectorRef.current = new BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "qr_code", "data_matrix", "code_128"],
        });

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
          scan();
        }
      } catch (err) {
        const e = err as Error;
        if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
          setError("Camera access denied. Please use manual entry below.");
        } else {
          setError(`Camera error: ${e.message}`);
        }
      }
    }

    async function scan() {
      if (!scanningRef.current || !detectorRef.current || !videoRef.current) return;

      const video = videoRef.current;
      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }

      try {
        const barcodes = await detectorRef.current.detect(video);

        frameCount++;
        const now = performance.now();
        if (now - lastFpsTime >= 1000) {
          setFps(frameCount);
          frameCount = 0;
          lastFpsTime = now;
        }

        if (barcodes.length > 0 && scanningRef.current) {
          handleDetection(barcodes[0].rawValue);
          return;
        }
      } catch {
        // detection error on frame — skip, try next
      }

      rafRef.current = requestAnimationFrame(scan);
    }

    init();

    return () => {
      scanningRef.current = false;
      cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [handleDetection]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = barcodeInput.trim();
    if (/^\d{8,14}$/.test(clean)) {
      router.push(`/product/${clean}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black font-sans">
      <div className="absolute left-4 top-4 z-20">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-[#9eca45]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      {ready && (
        <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5 bg-black/60 px-3 py-1.5 text-[10px] font-bold uppercase text-[#9eca45] backdrop-blur-sm">
          <Zap className="h-3 w-3" />
          {fps} FPS
        </div>
      )}

      <div className="relative flex-1">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center bg-[#f7f9fa] p-8 text-center">
            <AlertCircle className="mb-4 h-14 w-14 text-[#dc2626]" />
            <p className="text-lg font-bold text-[#060606]">{error}</p>
            <p className="mt-2 text-sm text-[#777777]">Use the manual entry below to look up a product.</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-56 w-72 sm:h-64 sm:w-80">
                <div className="absolute left-0 top-0 h-10 w-10 border-l-[3px] border-t-[3px] border-[#9eca45]" />
                <div className="absolute right-0 top-0 h-10 w-10 border-r-[3px] border-t-[3px] border-[#9eca45]" />
                <div className="absolute bottom-0 left-0 h-10 w-10 border-b-[3px] border-l-[3px] border-[#9eca45]" />
                <div className="absolute bottom-0 right-0 h-10 w-10 border-b-[3px] border-r-[3px] border-[#9eca45]" />

                <div className="absolute left-2 right-2 top-1/2 h-[2px] -translate-y-1/2 bg-[#9eca45] opacity-80 shadow-[0_0_12px_#9eca45,0_0_24px_#9eca45] animate-pulse" />
              </div>
            </div>

            <div className="absolute bottom-6 left-0 right-0 text-center">
              <span className="inline-block bg-black/60 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
                {ready ? "Point at any barcode" : "Starting camera..."}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 bg-white p-5 shadow-[0_-2px_12px_rgba(0,0,0,0.08)]">
        <form onSubmit={handleManualSubmit} className="mx-auto flex max-w-[480px] gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            placeholder="Enter barcode manually"
            className="flex-1 border border-[#dddddd] bg-white px-4 py-3 text-sm text-[#424242] outline-none transition-all focus:border-[#9eca45]"
          />
          <button
            type="submit"
            className="bg-[#9eca45] px-6 py-3 text-xs font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all hover:bg-[#333333]"
          >
            Lookup
          </button>
        </form>
      </div>
    </div>
  );
}
