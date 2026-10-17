import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CartItem = { key: string; dishId: string; name: string; price: number; qty: number; options: string[]; note?: string | undefined };
type Cart = { restaurantId: string | null; items: CartItem[] };
type Ctx = Cart & {
  address: string; setAddress: (a: string) => void;
  add: (restaurantId: string, item: Omit<CartItem, "key" | "qty">, qty?: number) => boolean;
  setQty: (key: string, qty: number) => void; clear: () => void; count: number; subtotal: number;
};

const CartCtx = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>({ restaurantId: null, items: [] });
  const [address, setAddressState] = useState("");
  useEffect(() => {
    try {
      const c = localStorage.getItem("rc-cart"); if (c) setCart(JSON.parse(c));
      setAddressState(localStorage.getItem("rc-address") || "");
    } catch { /* ignore */ }
  }, []);
  const save = (c: Cart) => { setCart(c); localStorage.setItem("rc-cart", JSON.stringify(c)); };
  const setAddress = (a: string) => { setAddressState(a); localStorage.setItem("rc-address", a); };

  const add: Ctx["add"] = (restaurantId, item, qty = 1) => {
    if (cart.restaurantId && cart.restaurantId !== restaurantId && cart.items.length) return false;
    const key = `${item.dishId}|${item.options.join(",")}|${item.note ?? ""}`;
    const exists = cart.items.find((i) => i.key === key);
    const items = exists ? cart.items.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i)) : [...cart.items, { ...item, key, qty }];
    save({ restaurantId, items });
    return true;
  };
  const setQty = (key: string, qty: number) => {
    const items = qty <= 0 ? cart.items.filter((i) => i.key !== key) : cart.items.map((i) => (i.key === key ? { ...i, qty } : i));
    save({ restaurantId: items.length ? cart.restaurantId : null, items });
  };
  const clear = () => save({ restaurantId: null, items: [] });
  const count = cart.items.reduce((s, i) => s + i.qty, 0);
  const subtotal = cart.items.reduce((s, i) => s + i.qty * i.price, 0);
  return <CartCtx.Provider value={{ ...cart, address, setAddress, add, setQty, clear, count, subtotal }}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
