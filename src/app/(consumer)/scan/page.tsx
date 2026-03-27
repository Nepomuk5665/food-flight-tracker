"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, Keyboard, Upload, X } from "lucide-react";
import { parseGS1 } from "@/lib/scanner/gs1-parser";

type CameraState = "gate" | "loading" | "active" | "denied" | "error";

const GATE_STORAGE_KEY = "camera_gate_dismissed";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detectorRef =
    useRef<InstanceType<typeof import("barcode-detector/ponyfill").BarcodeDetector> | null>(null);
  const rafRef = useRef<number>(0);
  const scanningRef = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>(() => {
    if (typeof window !== "undefined" && localStorage.getItem(GATE_STORAGE_KEY)) {
      return "loading";
    }
    return "gate";
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isMobile, setIsMobile] = useState(true);
  const [scanningImage, setScanningImage] = useState(false);

  /* ── Drawer swipe-to-dismiss ── */
  const drawerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]!.clientY;
    touchDeltaY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0]!.clientY - touchStartY.current;
    touchDeltaY.current = delta;
    if (delta > 0 && drawerRef.current) {
      drawerRef.current.style.transform = `translateY(${delta}px)`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchDeltaY.current > 80) {
      setDrawerOpen(false);
    }
    if (drawerRef.current) {
      drawerRef.current.style.transform = "";
    }
  }, []);

  /* ── Barcode navigation ── */
  const navigateRef = useRef<((raw: string) => void) | null>(null);
  const navigateTo = useCallback(
    (rawValue: string) => {
      if (isNavigating) return;
      scanningRef.current = false;
      setIsNavigating(true);
      navigator.vibrate?.(200);

      if (rawValue.startsWith("(01)") || rawValue.startsWith("01")) {
        const parsed = parseGS1(rawValue);
        if (parsed.gtin) {
          router.push(`/product/${encodeURIComponent(parsed.gtin.trim())}`);
          return;
        }
        if (parsed.batch) {
          router.push(`/journey/${encodeURIComponent(parsed.batch)}`);
          return;
        }
      }

      router.push(`/product/${encodeURIComponent(rawValue)}`);
    },
    [isNavigating, router],
  );
  navigateRef.current = navigateTo;

  /* ── Image upload barcode detection ── */
  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!detectorRef.current) {
        const { BarcodeDetector } = await import("barcode-detector/ponyfill");
        detectorRef.current = new BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "qr_code", "data_matrix", "code_128"],
        });
      }

      setScanningImage(true);
      try {
        const bitmap = await createImageBitmap(file);
        const barcodes = await detectorRef.current.detect(bitmap);
        bitmap.close();

        if (barcodes.length > 0 && barcodes[0]?.rawValue) {
          navigateTo(barcodes[0].rawValue);
        } else {
          setErrorMessage("No barcode found in image. Try a clearer photo or enter the code manually.");
          setScanningImage(false);
        }
      } catch {
        setErrorMessage("Could not process image. Try a different photo.");
        setScanningImage(false);
      }
    },
    [navigateTo],
  );

  /* ── Camera lifecycle ── */
  const startCamera = useCallback(async () => {
    setCameraState("loading");

    try {
      const { BarcodeDetector } = await import("barcode-detector/ponyfill");
      detectorRef.current = new BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "qr_code", "data_matrix", "code_128"],
      });

      const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      setIsMobile(mobile);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: mobile
            ? { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      localStorage.setItem(GATE_STORAGE_KEY, "1");

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraState("active");
      }
    } catch (err) {
      const e = err as Error;
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setCameraState("denied");
        setErrorMessage("Camera access was denied.");
      } else {
        setCameraState("error");
        setErrorMessage(e.message);
      }
    }
  }, []);

  /* ── Scan loop ── */
  useEffect(() => {
    if (cameraState !== "active") return;

    scanningRef.current = true;

    function scan() {
      if (!scanningRef.current || !detectorRef.current || !videoRef.current) return;
      const video = videoRef.current;
      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }

      detectorRef.current
        .detect(video)
        .then((barcodes) => {
          if (barcodes.length > 0 && scanningRef.current) {
            const rawValue = barcodes[0]?.rawValue;
            if (rawValue) {
              navigateRef.current?.(rawValue);
              return;
            }
          }
          rafRef.current = requestAnimationFrame(scan);
        })
        .catch(() => {
          rafRef.current = requestAnimationFrame(scan);
        });
    }

    scan();

    return () => {
      scanningRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [cameraState]);

  /* ── Auto-start camera if gate was previously dismissed ── */
  useEffect(() => {
    if (cameraState === "loading") {
      startCamera();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Cleanup stream on unmount ── */
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleAllowCamera = () => {
    startCamera();
  };

  const handleManualSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const val = barcodeInput.trim();
    if (val) navigateTo(val);
  };

  /* ── Hidden file input (shared across screens) ── */
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleImageUpload(file);
      }}
    />
  );

  /* ── Permission gate screen ── */
  if (cameraState === "gate") {
    return (
      <div className="fixed inset-x-0 top-0 bottom-[52px] z-40 flex flex-col items-center justify-center bg-[#f7f9fa] px-8 text-center">
        {fileInput}
        <div className="flex h-20 w-20 items-center justify-center bg-[#003a5d]">
          <Camera className="h-10 w-10 text-white" />
        </div>
        <h1 className="mt-6 text-xl font-bold text-[#060606]">Scan a Barcode</h1>
        <p className="mt-2 text-sm text-[#777777]">
          Allow camera access to scan product barcodes instantly.
        </p>
        <button
          onClick={handleAllowCamera}
          className="mt-8 w-full max-w-[280px] bg-[#9eca45] px-6 py-3.5 text-sm font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-colors hover:bg-[#8bb83a]"
        >
          Allow Camera
        </button>
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={scanningImage}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#777777] underline underline-offset-2"
          >
            <Upload className="h-3 w-3" />
            {scanningImage ? "Scanning..." : "Upload photo"}
          </button>
          <span className="text-[#dddddd]">|</span>
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-xs font-semibold text-[#777777] underline underline-offset-2"
          >
            Enter manually
          </button>
        </div>

        <ManualInputDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          value={barcodeInput}
          onChange={setBarcodeInput}
          onSubmit={handleManualSubmit}
          isNavigating={isNavigating}
          drawerRef={drawerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>
    );
  }

  /* ── Camera denied / error screen ── */
  if (cameraState === "denied" || cameraState === "error") {
    return (
      <div className="fixed inset-x-0 top-0 bottom-[52px] z-40 flex flex-col items-center justify-center bg-[#f7f9fa] px-8 text-center">
        {fileInput}
        <div className="flex h-20 w-20 items-center justify-center bg-[#dc2626]">
          <CameraOff className="h-10 w-10 text-white" />
        </div>
        <h1 className="mt-6 text-xl font-bold text-[#060606]">
          {cameraState === "denied" ? "Camera Blocked" : "Camera Error"}
        </h1>
        <p className="mt-2 text-sm text-[#777777]">
          {cameraState === "denied"
            ? "Go to your browser settings to allow camera access for this site."
            : errorMessage}
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={scanningImage || isNavigating}
          className="mt-8 flex w-full max-w-[280px] items-center justify-center gap-2 bg-[#9eca45] px-6 py-3.5 text-sm font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-colors hover:bg-[#8bb83a] disabled:bg-[#b8c59a]"
        >
          <Upload className="h-4 w-4" />
          {scanningImage ? "Scanning..." : "Upload Barcode Photo"}
        </button>
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-xs font-semibold text-[#777777] underline underline-offset-2"
          >
            Enter manually
          </button>
          <span className="text-[#dddddd]">|</span>
          <button
            onClick={() => startCamera()}
            className="text-xs font-semibold text-[#777777] underline underline-offset-2"
          >
            Try camera again
          </button>
        </div>

        <ManualInputDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          value={barcodeInput}
          onChange={setBarcodeInput}
          onSubmit={handleManualSubmit}
          isNavigating={isNavigating}
          drawerRef={drawerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>
    );
  }

  /* ── Active camera / loading viewfinder ── */
  return (
    <div className="fixed inset-x-0 top-0 bottom-[52px] z-40 flex flex-col bg-black">
      {fileInput}

      {/* Drawer toggle button — upper right */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-[#9eca45]"
        aria-label="Enter barcode manually"
      >
        <Keyboard className="h-5 w-5" />
      </button>

      {/* Upload button — upper right, next to keyboard */}
      {!isMobile && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={scanningImage}
          className="absolute right-16 top-4 z-20 flex items-center gap-1.5 bg-black/60 px-3 py-2.5 text-[10px] font-bold uppercase text-white backdrop-blur-sm transition-colors hover:bg-[#9eca45]"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload
        </button>
      )}

      {/* Video feed */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className={`h-full w-full ${isMobile ? "object-cover" : "object-contain"}`}
          playsInline
          muted
          autoPlay
        />

        {/* Dashed rectangle reticle */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-52 border-[2.5px] border-dashed border-white/80 sm:h-36 sm:w-60" />
        </div>

        {/* Status text */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <span className="inline-block bg-black/60 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
            {isNavigating
              ? "Opening..."
              : scanningImage
                ? "Scanning image..."
                : cameraState === "active"
                  ? "Point at any barcode"
                  : "Starting camera..."}
          </span>
        </div>
      </div>

      {/* Manual input drawer */}
      <ManualInputDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        value={barcodeInput}
        onChange={setBarcodeInput}
        onSubmit={handleManualSubmit}
        isNavigating={isNavigating}
        drawerRef={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  );
}

/* ── Manual Input Drawer ── */

interface ManualInputDrawerProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isNavigating: boolean;
  drawerRef: React.RefObject<HTMLDivElement | null>;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}

function ManualInputDrawer({
  open,
  onClose,
  value,
  onChange,
  onSubmit,
  isNavigating,
  drawerRef,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: ManualInputDrawerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`fixed inset-x-0 bottom-[52px] z-50 bg-white px-5 pb-6 pt-3 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Swipe handle */}
        <div className="mb-4 flex justify-center">
          <div className="h-1 w-10 bg-[#dddddd]" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-3 flex h-8 w-8 items-center justify-center text-[#777777] transition-colors hover:text-[#060606]"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="mb-3 text-sm font-bold text-[#060606]">Enter barcode manually</p>

        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. 4012345000019 or (01)04012345..."
            className="flex-1 border border-[#dddddd] bg-white px-4 py-3 text-sm text-[#424242] outline-none transition-colors focus:border-[#9eca45]"
          />
          <button
            type="submit"
            disabled={isNavigating || value.trim().length === 0}
            className="bg-[#9eca45] px-5 py-3 text-xs font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-colors hover:bg-[#8bb83a] disabled:cursor-not-allowed disabled:bg-[#b8c59a]"
          >
            {isNavigating ? "..." : "Go"}
          </button>
        </form>
      </div>
    </>
  );
}
