// Couche de services centralisée : tous les appels aux données passent par ici.
// Aujourd'hui : Lovable Cloud. Pour une API Spring Boot, remplacer le corps de ces fonctions.
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QUARTIERS, COMMISSION_RATE, type Restaurant, type Dish } from "./data";

export function suggestAddresses(q: string): string[] {
  const t = q.trim().toLowerCase();
  if (!t) return [];
  return QUARTIERS.filter((x) => x.toLowerCase().includes(t)).slice(0, 6).map((x) => `${x}, Ziguinchor`);
}

export type RestaurantWithDishes = Restaurant & { dishes: Dish[] };

async function fetchRestaurants(): Promise<RestaurantWithDishes[]> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*, dishes(*, dish_options(label, price))")
    .order("is_open", { ascending: false })
    .order("rating", { ascending: false });
  if (error) throw new Error("Impossible de charger les restaurants.");
  return (data ?? []).map(({ dishes, ...r }) => ({
    ...r,
    rating: Number(r.rating),
    dishes: (dishes ?? [])
      .map(({ dish_options, ...d }) => ({ ...d, options: dish_options ?? [] }))
      .sort((a, b) => a.sort - b.sort),
  }));
}

export const restaurantsQuery = queryOptions({ queryKey: ["restaurants"], queryFn: fetchRestaurants, staleTime: 60_000 });

export function filterRestaurants(list: RestaurantWithDishes[], opts: { address?: string | undefined; query?: string | undefined; cuisine?: string | undefined } = {}) {
  const quartier = opts.address?.split(",")[0]?.trim();
  const q = opts.query?.toLowerCase() ?? "";
  return list
    .filter((r) => !quartier || r.quartiers.includes(quartier))
    .filter((r) => !opts.cuisine || r.cuisine === opts.cuisine)
    .filter((r) => !q || r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q) || r.dishes.some((d) => d.name.toLowerCase().includes(q)));
}

export function computeTotals(subtotal: number, deliveryFee: number, mode: "livraison" | "emporter") {
  const fee = mode === "livraison" ? deliveryFee : 0;
  return { subtotal, fee, total: subtotal + fee, commission: Math.round(subtotal * COMMISSION_RATE) };
}

export type OrderInput = {
  restaurantId: string; mode: "livraison" | "emporter"; payment: "cash" | "wave";
  name: string; phone: string; address: string;
  items: { dish_id: string; quantity: number; options: string[]; note?: string | undefined }[];
};

/** Le prix est recalculé côté base de données à partir des plats : le navigateur ne fixe jamais le total. */
export async function placeOrder(o: OrderInput) {
  const { data, error } = await supabase.rpc("place_order", {
    _restaurant_id: o.restaurantId, _mode: o.mode, _payment: o.payment,
    _name: o.name, _phone: o.phone, _address: o.address, _items: o.items,
  });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) throw new Error("Commande non enregistrée.");
  return row;
}

export const myOrdersQuery = (userId: string) =>
  queryOptions({
    queryKey: ["orders", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, code, restaurant_name, status, total, mode, created_at, order_items(name, quantity, unit_price)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw new Error("Impossible de charger vos commandes.");
      return data ?? [];
    },
  });

export async function submitApplication(a: { kind: "partenaire" | "livreur"; name: string; email: string; phone: string; detail: string; userId?: string | undefined }) {
  const { error } = await supabase.from("applications").insert({ kind: a.kind, name: a.name, email: a.email.trim().toLowerCase(), phone: a.phone, detail: a.detail, user_id: a.userId ?? null });
  if (error) throw new Error("Envoi impossible, réessayez.");
}
