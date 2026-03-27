"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { useZxing } from "react-zxing";

export default function ScanPage() {
  const router = useRouter();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  const lookupBarcode = (value: string) => {
    const barcode = value.trim();
    if (!barcode || isNavigating) {
      return;
    }

    setIsNavigating(true);
    router.push(`/product/${encodeURIComponent(barcode)}`);
  };

  const { ref } = useZxing({
    paused: isNavigating,
    onDecodeResult(result) {
      lookupBarcode(result.getText());
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    lookupBarcode(barcodeInput);
  };

  return (
    <section className="space-y-6 font-sans">
      <h1 className="text-3xl font-bold uppercase tracking-wide text-[#003a5d]">Scan Product</h1>

      <div className="border border-[#dddddd] bg-[#f7f9fa] p-6 text-center rounded-none">
        <Camera className="mx-auto h-10 w-10 text-[#9eca45]" aria-hidden="true" />
        <p className="mt-3 text-base text-[#424242]">Point camera at barcode</p>
        <video ref={ref} className="mt-4 w-full border border-[#dddddd] bg-black" muted playsInline />
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <label htmlFor="manual-barcode" className="text-sm font-normal text-[#424242]">
          Enter barcode manually
        </label>
        <input
          id="manual-barcode"
          type="text"
          value={barcodeInput}
          onChange={(event) => setBarcodeInput(event.target.value)}
          placeholder="e.g. 4012345678901"
          className="w-full border border-[#dddddd] bg-white px-3 py-2 text-xs text-[#424242] outline-none focus:border-[#bbbbbb] rounded-none"
        />
        <button
          type="submit"
          disabled={isNavigating || barcodeInput.trim().length === 0}
          className="w-full bg-[#9eca45] px-7 py-3.5 text-xs font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all duration-200 ease-in hover:bg-[#333333] disabled:cursor-not-allowed disabled:bg-[#b8c59a] rounded-none"
        >
          {isNavigating ? "Opening..." : "Lookup"}
        </button>
      </form>
    </section>
  );
}
