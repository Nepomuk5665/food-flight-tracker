type ProductPageProps = {
  params: Promise<{ barcode: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { barcode } = await params;

  return (
    <section className="space-y-4 font-sans">
      <header className="border border-[#dddddd] bg-white p-4 rounded-none">
        <h1 className="text-3xl font-bold uppercase tracking-wide text-[#003a5d]">Product Details</h1>
        <p className="mt-2 text-sm text-[#777777]">Barcode: {barcode}</p>
      </header>

      <div className="space-y-3 border border-[#dddddd] bg-[#f7f9fa] p-4 rounded-none">
        <h2 className="text-xs font-bold uppercase text-[#003a5d]">Product Info</h2>
        <p className="text-sm">Name, brand, image, and category placeholder.</p>
      </div>

      <div className="space-y-3 border border-[#dddddd] bg-[#f7f9fa] p-4 rounded-none">
        <h2 className="text-xs font-bold uppercase text-[#003a5d]">Nutri-Score</h2>
        <p className="text-sm">Nutri-score badge placeholder.</p>
      </div>

      <div className="space-y-3 border border-[#dddddd] bg-[#f7f9fa] p-4 rounded-none">
        <h2 className="text-xs font-bold uppercase text-[#003a5d]">Ingredients</h2>
        <p className="text-sm">Ingredient list and allergens placeholder.</p>
      </div>

      <div className="space-y-3 border border-[#dddddd] bg-white p-4 rounded-none">
        <label htmlFor="lot-code" className="text-sm font-normal text-[#424242]">
          Enter Chargennummer
        </label>
        <input
          id="lot-code"
          type="text"
          placeholder="e.g. LOT-2026-03-A42"
          className="w-full border border-[#dddddd] bg-white px-3 py-2 text-xs text-[#424242] outline-none focus:border-[#bbbbbb] rounded-none"
        />
      </div>
    </section>
  );
}
