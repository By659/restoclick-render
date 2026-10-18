import hero from "@/assets/hero.jpg";
import dibi from "@/assets/dibi.jpg";
import burger from "@/assets/burger.jpg";
import yassa from "@/assets/yassa.jpg";
import bissap from "@/assets/bissap.jpg";

const IMAGES: Record<string, string> = { hero, dibi, burger, yassa, bissap, thiakry: burger };
export const imageFor = (key: string) =>
  key.startsWith("https://") || key.startsWith("http://") ? key : IMAGES[key] ?? hero;

export type DishOption = { label: string; price: number };
export type Dish = { id: string; name: string; description: string; price: number; image_key: string; category: string; is_available: boolean; options: DishOption[] };
export type Restaurant = {
  id: string; name: string; type: string; cuisine: string; image_key: string;
  rating: number; reviews: number; delivery_min: number; delivery_max: number; delivery_fee: number;
  quartiers: string[]; promo: string | null; is_open: boolean; is_demo: boolean;
};

export const QUARTIERS = ["Boucotte", "Lyndiane", "Tilène", "Kandé", "Santhiaba", "Escale", "Néma", "Colobane", "Belfort", "Diabir", "Grand Dakar", "Kenya", "Boudody", "Peyrissac"];

export const CATEGORIES = [
  { label: "Sénégalaise", emoji: "🍲" }, { label: "Grillades", emoji: "🔥" }, { label: "Burgers", emoji: "🍔" }, { label: "Casamançaise", emoji: "🐟" },
];

export const ORDER_STATUS: Record<string, string> = {
  en_attente: "En attente", acceptee: "Acceptée", en_preparation: "En préparation", prete: "Prête",
  en_livraison: "En livraison", livree: "Livrée", annulee: "Annulée",
};

export const COMMISSION_RATE = 0.08;
export const PHONE_RE = /^(\+221)?\s?7[05678]\d{7}$/;
export const formatFCFA = (n: number) => `${n.toLocaleString("fr-FR")} F CFA`;
