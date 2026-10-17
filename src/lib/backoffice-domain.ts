import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  en_attente: "Reçue",
  acceptee: "Acceptée",
  en_preparation: "En préparation",
  prete: "Prête",
  en_livraison: "En livraison",
  livree: "Livrée",
  annulee: "Annulée",
};

const RESTAURANT_ORDER_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus>> = {
  en_attente: "acceptee",
  acceptee: "en_preparation",
  en_preparation: "prete",
};

export function nextRestaurantOrderStatus(status: OrderStatus): OrderStatus | null {
  return RESTAURANT_ORDER_TRANSITIONS[status] ?? null;
}
