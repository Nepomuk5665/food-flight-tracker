"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ScanLine, MessageCircle, AlertTriangle, CheckCircle2 } from "lucide-react";

type ProductData = {
  product: {
    id: string;
    barcode: string;
    name: string;
    brand: string | null;
    imageUrl: string | null;
    ingredients: string | null;
    allergens: string | null;
    nutriScore: string | null;
    ecoScore: string | null;
    source: string;
  };
  activeLot: {
    lotCode: string;
    status: string;
    riskScore: number;
  } | null;
};

type ProductPageProps = {
  params: Promise<{ barcode: string }>;
};

export default function ProductPage({ params }: ProductPageProps) {
  const { barcode } = use(params);
  const router = useRouter();
  
  const [data, setData] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [lotInput, setLotInput] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/product/${barcode}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          throw new Error("Failed to fetch product data");
        }
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          if (json.data.activeLot) {
            setLotInput(json.data.activeLot.lotCode);
          }
        } else {
          throw new Error(json.error || "Unknown error");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [barcode]);

  const handleJourneySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lotInput.trim()) {
      router.push(`/journey/${lotInput.trim()}`);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 font-sans">
        <div className="h-64 w-full bg-[#f7f9fa] border border-[#dddddd]"></div>
        <div className="space-y-4">
          <div className="h-8 w-3/4 bg-[#eeeeee]"></div>
          <div className="h-4 w-1/2 bg-[#eeeeee]"></div>
        </div>
        <div className="h-32 w-full bg-[#f7f9fa] border border-[#dddddd]"></div>
        <div className="h-32 w-full bg-[#f7f9fa] border border-[#dddddd]"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center font-sans">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f7f9fa] text-[#777777]">
          <ScanLine className="h-10 w-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold uppercase text-[#003a5d]">Product Not Found</h1>
          <p className="mt-2 text-[#424242]">We couldn&apos;t find a product with barcode {barcode}.</p>
        </div>
        <Link
          href="/scan"
          className="bg-[#9eca45] px-7 py-3.5 text-xs font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all hover:bg-[#333333]"
        >
          Scan Again
        </Link>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-6 text-center font-sans">
        <AlertTriangle className="h-12 w-12 text-[#dc2626]" />
        <div>
          <h1 className="text-2xl font-bold uppercase text-[#003a5d]">Error</h1>
          <p className="mt-2 text-[#424242]">{error || "Something went wrong"}</p>
        </div>
        <Link
          href="/scan"
          className="bg-[#003a5d] px-7 py-3.5 text-xs font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all hover:bg-[#9eca45]"
        >
          Back to Scanner
        </Link>
      </div>
    );
  }

  const { product, activeLot } = data;

  const renderNutriScore = (score: string | null) => {
    const letters = ["A", "B", "C", "D", "E"];
    const colors: Record<string, string> = {
      A: "#038141",
      B: "#85BB2F",
      C: "#FECB02",
      D: "#EE8100",
      E: "#E63E11",
    };
    
    const activeScore = score?.toUpperCase();

    if (!activeScore || !letters.includes(activeScore)) {
      return <span className="text-sm font-bold text-[#777777]">N/A</span>;
    }

    return (
      <div className="flex gap-1">
        {letters.map((letter) => {
          const isActive = letter === activeScore;
          return (
            <div
              key={letter}
              className={`flex h-8 w-6 items-center justify-center text-xs font-bold text-white ${
                isActive ? "scale-110 shadow-sm" : "opacity-40"
              }`}
              style={{ backgroundColor: isActive ? colors[letter] : "#dddddd" }}
            >
              {letter}
            </div>
          );
        })}
      </div>
    );
  };

  const renderEcoScore = (score: string | null) => {
    const letters = ["A", "B", "C", "D", "E"];
    const colors: Record<string, string> = {
      A: "#1E8F4E",
      B: "#60AC0E",
      C: "#FECB02",
      D: "#FF6F1E",
      E: "#DF1F12",
    };
    
    const activeScore = score?.toUpperCase();

    if (!activeScore || !letters.includes(activeScore)) {
      return <span className="text-sm font-bold text-[#777777]">N/A</span>;
    }

    return (
      <div className="flex gap-1">
        {letters.map((letter) => {
          const isActive = letter === activeScore;
          return (
            <div
              key={letter}
              className={`flex h-8 w-6 items-center justify-center text-xs font-bold text-white ${
                isActive ? "scale-110 shadow-sm" : "opacity-40"
              }`}
              style={{ backgroundColor: isActive ? colors[letter] : "#dddddd" }}
            >
              {letter}
            </div>
          );
        })}
      </div>
    );
  };

  const renderIngredients = () => {
    if (!product.ingredients) return <p className="text-sm text-[#777777]">No ingredients information available.</p>;
    
    const allergensList = product.allergens ? product.allergens.toLowerCase().split(',').map(a => a.trim()) : [];
    
    if (allergensList.length === 0) {
      return <p className="text-sm text-[#424242]">{product.ingredients}</p>;
    }

    const words = product.ingredients.split(/([\s,.]+)/);
    
    return (
      <p className="text-sm text-[#424242]">
        {words.map((word, i) => {
          const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
          const isAllergen = allergensList.some(a => cleanWord.includes(a) || a.includes(cleanWord));
          
          if (isAllergen && cleanWord.length > 2) {
            return <strong key={i} className="font-bold text-[#dc2626]">{word}</strong>;
          }
          return <span key={i}>{word}</span>;
        })}
      </p>
    );
  };

  const getRiskColor = (score: number) => {
    if (score <= 25) return "#3fa435";
    if (score <= 50) return "#f59e0b";
    if (score <= 75) return "#ea580c";
    return "#dc2626";
  };

  return (
    <div className="space-y-6 font-sans pb-8">
      <div className="flex items-center gap-4">
        <Link 
          href="/scan" 
          className="flex h-10 w-10 items-center justify-center border border-[#dddddd] bg-white text-[#003a5d] transition-all hover:bg-[#f7f9fa]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold uppercase tracking-wide text-[#003a5d]">Product Details</h1>
      </div>

      <div className="border border-[#dddddd] bg-white p-0">
        {product.imageUrl ? (
          <div className="flex justify-center border-b border-[#dddddd] bg-white p-4">
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="max-h-64 object-contain"
            />
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center border-b border-[#dddddd] bg-[#f7f9fa]">
            <ScanLine className="h-16 w-16 text-[#dddddd]" />
          </div>
        )}
        
        <div className="p-5">
          <div className="mb-2 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#060606]">{product.name}</h2>
              {product.brand && <p className="text-lg text-[#777777]">{product.brand}</p>}
            </div>
            <span 
              className={`inline-block whitespace-nowrap px-2 py-1 text-[10px] font-bold uppercase text-white ${
                product.source === "Internal" ? "bg-[#3fa435]" : "bg-[#009ee3]"
              }`}
            >
              {product.source}
            </span>
          </div>
          <p className="text-xs text-[#777777]">EAN/GTIN: {product.barcode}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-[#dddddd] bg-white p-4">
          <h3 className="mb-3 text-xs font-bold uppercase text-[#003a5d]">Nutri-Score</h3>
          {renderNutriScore(product.nutriScore)}
        </div>
        <div className="border border-[#dddddd] bg-white p-4">
          <h3 className="mb-3 text-xs font-bold uppercase text-[#003a5d]">Eco-Score</h3>
          {renderEcoScore(product.ecoScore)}
        </div>
      </div>

      <div className="border border-[#dddddd] bg-white p-5">
        <h3 className="mb-3 text-xs font-bold uppercase text-[#003a5d]">Ingredients</h3>
        {renderIngredients()}
        
        {product.allergens && (
          <div className="mt-4 border-t border-[#eeeeee] pt-3">
            <h4 className="text-xs font-bold uppercase text-[#dc2626]">Contains Allergens</h4>
            <p className="text-sm text-[#424242]">{product.allergens}</p>
          </div>
        )}
      </div>

      <div className="border border-[#dddddd] bg-[#f7f9fa] p-5">
        <h3 className="mb-4 text-lg font-bold uppercase text-[#003a5d]">Supply Chain Journey</h3>
        
        {activeLot && (
          <div className="mb-6 border border-[#dddddd] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-[#424242]">Active Batch: {activeLot.lotCode}</span>
              <span className="flex items-center gap-1 text-xs font-bold uppercase text-[#3fa435]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {activeLot.status}
              </span>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#777777]">Risk Score</span>
                <span className="font-bold" style={{ color: getRiskColor(activeLot.riskScore) }}>
                  {activeLot.riskScore}/100
                </span>
              </div>
              <div className="h-[8px] w-full bg-[#eeeeee]">
                <div 
                  className="h-full transition-all duration-1000" 
                  style={{ 
                    width: `${activeLot.riskScore}%`,
                    backgroundColor: getRiskColor(activeLot.riskScore)
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleJourneySubmit} className="space-y-3">
          <label htmlFor="lot-code" className="block text-sm font-normal text-[#424242]">
            Enter Chargennummer (Batch Number)
          </label>
          <div className="flex gap-2">
            <input
              id="lot-code"
              type="text"
              value={lotInput}
              onChange={(e) => setLotInput(e.target.value)}
              placeholder="e.g. LOT-2026-03-A42"
              className="flex-1 border border-[#dddddd] bg-white px-3 py-3 text-sm text-[#424242] outline-none transition-all focus:border-[#bbbbbb] rounded-none"
            />
            <button
              type="submit"
              className="bg-[#003a5d] px-6 py-3 text-xs font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all hover:bg-[#333333] rounded-none"
            >
              View Journey
            </button>
          </div>
        </form>
        
        {activeLot && (
          <button
            onClick={() => router.push(`/journey/${activeLot.lotCode}`)}
            className="mt-4 w-full bg-[#9eca45] px-7 py-4 text-sm font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all hover:bg-[#8bb83a] rounded-none"
          >
            View Full Journey
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4">
        <Link
          href="/scan"
          className="flex items-center justify-center gap-2 border border-[#dddddd] bg-white px-4 py-3.5 text-xs font-bold uppercase text-[#424242] transition-all hover:bg-[#f7f9fa] rounded-none"
        >
          <ScanLine className="h-4 w-4" />
          Scan Another
        </Link>
        
        {activeLot ? (
          <Link
            href={`/chat?lot=${activeLot.lotCode}`}
            className="flex items-center justify-center gap-2 bg-[#009ee3] px-4 py-3.5 text-xs font-bold uppercase text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition-all hover:bg-[#007bb5] rounded-none"
          >
            <MessageCircle className="h-4 w-4" />
            Ask AI
          </Link>
        ) : (
          <div className="flex items-center justify-center gap-2 border border-[#eeeeee] bg-[#f7f9fa] px-4 py-3.5 text-xs font-bold uppercase text-[#bbbbbb] rounded-none">
            <MessageCircle className="h-4 w-4" />
            Ask AI
          </div>
        )}
      </div>
    </div>
  );
}
