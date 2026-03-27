import {
  Candy,
  Milk,
  Coffee,
  Wheat,
  Apple,
  Beef,
  Fish,
  Cookie,
  Carrot,
  Egg,
  Wine,
  IceCream,
  Leaf,
  Ham,
  Soup,
  Package,
  type LucideIcon,
} from "lucide-react";

type PlaceholderProps = {
  name: string;
  category?: string | null;
  className?: string;
  iconSize?: number;
};

type CategoryRule = {
  keywords: string[];
  icon: LucideIcon;
  bg: string;
  fg: string;
};

const CATEGORY_RULES: CategoryRule[] = [
  { keywords: ["chocolate", "cocoa", "cacao", "candy", "sweet", "confection", "praline"], icon: Candy, bg: "#4e342e", fg: "#d7ccc8" },
  { keywords: ["milk", "dairy", "cheese", "yogurt", "yoghurt", "butter", "cream", "quark"], icon: Milk, bg: "#1565c0", fg: "#bbdefb" },
  { keywords: ["beverage", "drink", "juice", "water", "soda", "coffee", "tea", "energy"], icon: Coffee, bg: "#4e342e", fg: "#d7ccc8" },
  { keywords: ["cereal", "grain", "bread", "wheat", "flour", "pasta", "rice", "muesli", "oat"], icon: Wheat, bg: "#f9a825", fg: "#fff8e1" },
  { keywords: ["fruit", "apple", "banana", "berry", "citrus", "orange", "grape", "jam"], icon: Apple, bg: "#2e7d32", fg: "#c8e6c9" },
  { keywords: ["meat", "beef", "pork", "chicken", "poultry", "sausage", "salami"], icon: Beef, bg: "#c62828", fg: "#ffcdd2" },
  { keywords: ["fish", "seafood", "salmon", "tuna", "shrimp", "prawn"], icon: Fish, bg: "#0277bd", fg: "#b3e5fc" },
  { keywords: ["snack", "chip", "crisp", "biscuit", "cookie", "cracker", "pretzel"], icon: Cookie, bg: "#ef6c00", fg: "#ffe0b2" },
  { keywords: ["vegetable", "carrot", "potato", "tomato", "onion", "salad", "legume"], icon: Carrot, bg: "#e65100", fg: "#ffe0b2" },
  { keywords: ["frozen", "ice cream", "gelato", "sorbet", "ice"], icon: IceCream, bg: "#6a1b9a", fg: "#e1bee7" },
  { keywords: ["egg"], icon: Egg, bg: "#f9a825", fg: "#fff8e1" },
  { keywords: ["wine", "beer", "alcohol", "spirit", "liquor", "liqueur"], icon: Wine, bg: "#4a148c", fg: "#ce93d8" },
  { keywords: ["ham", "deli", "charcuterie", "bacon"], icon: Ham, bg: "#d84315", fg: "#ffccbc" },
  { keywords: ["soup", "broth", "stock", "stew"], icon: Soup, bg: "#558b2f", fg: "#dcedc8" },
  { keywords: ["organic", "bio", "plant", "vegan", "vegetarian"], icon: Leaf, bg: "#33691e", fg: "#dcedc8" },
];

function matchCategory(name: string, category?: string | null): CategoryRule {
  const haystack = `${name} ${category ?? ""}`.toLowerCase();
  const match = CATEGORY_RULES.find((rule) =>
    rule.keywords.some((kw) => haystack.includes(kw)),
  );
  return match ?? { keywords: [], icon: Package, bg: "#546e7a", fg: "#cfd8dc" };
}

export function ProductPlaceholder({ name, category, className = "", iconSize = 40 }: PlaceholderProps) {
  const { icon: Icon, bg, fg } = matchCategory(name, category);

  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{ backgroundColor: bg }}
    >
      <Icon size={iconSize} color={fg} strokeWidth={1.5} />
    </div>
  );
}
