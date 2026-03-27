"use client";

import { useEffect } from "react";
import { addToScanHistory } from "@/lib/scan-history";

type Props = {
  barcode: string;
  name: string;
  brand: string;
  imageUrl: string | null;
  nutriScore: string | null;
  source: string;
};

export default function SaveToHistory(props: Props) {
  useEffect(() => {
    addToScanHistory(props);
  }, [props]);

  return null;
}
