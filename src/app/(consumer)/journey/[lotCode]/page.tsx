import { redirect } from "next/navigation";

type JourneyRedirectProps = {
  params: Promise<{ lotCode: string }>;
};

export default async function JourneyRedirect({ params }: JourneyRedirectProps) {
  const { lotCode } = await params;

  const { getBarcodeForLotCode } = await import("@/lib/db/queries");
  const barcode = getBarcodeForLotCode(lotCode);

  if (barcode) {
    redirect(`/product/${encodeURIComponent(barcode)}?tab=map`);
  }

  redirect("/scan");
}
