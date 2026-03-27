"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generatedJourneyStorageKey } from "@/lib/journey/storage";

type GenerateJourneyButtonProps = {
  barcode: string;
  disabled?: boolean;
};

type JourneyResponse = {
  success: boolean;
  data?: {
    generated: boolean;
    batch: {
      lotCode: string;
      status: string;
      riskScore: number;
      productName: string;
    };
    journey: unknown[];
  };
  error?: {
    message: string;
  };
};

export default function GenerateJourneyButton({
  barcode,
  disabled = false,
}: GenerateJourneyButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (disabled || pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/journey/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ barcode }),
      });

      const payload = (await response.json()) as JourneyResponse;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message ?? "Unable to generate journey");
      }

      if (payload.data.generated) {
        window.sessionStorage.setItem(
          generatedJourneyStorageKey(payload.data.batch.lotCode),
          JSON.stringify(payload.data),
        );
      }

      router.push(`/journey/${encodeURIComponent(payload.data.batch.lotCode)}`);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to generate journey");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || pending}
        className="w-full bg-[#9eca45] px-4 py-3 text-xs font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all duration-200 ease-in hover:bg-[#333333] disabled:cursor-not-allowed disabled:bg-[#b8c59a] rounded-none"
      >
        {pending ? "Generating..." : "Generate Journey"}
      </button>
      {disabled ? <p className="text-sm text-[#777777]">Journey data is unavailable for this product.</p> : null}
      {error ? <p className="text-sm text-[#8c1d18]">{error}</p> : null}
    </div>
  );
}
