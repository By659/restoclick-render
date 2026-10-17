import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { restaurantsQuery, computeTotals } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatFCFA } from "@/lib/data";

export const Route = createFileRoute("/panier")({
  head: () => ({ meta: [
    { title: "Mon panier — RestoClik" }, { name: "description", content: "Vérifiez votre panier avant de commander." },
    { property: "og:title", content: "Mon panier — RestoClik" }, { property: "og:description", content: "Votre panier RestoClik." },
  ] }),
  component: Page,
});

function Page() {
  const { items, restaurantId, setQty, clear, subtotal } = useCart();
  const { data = [] } = useQuery(restaurantsQuery);
  const r = data.find((x) => x.id === restaurantId);
  if (!items.length || !r) return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-secondary"><ShoppingBag className="size-7 text-primary" /></div>
      <h1 className="mt-4 text-2xl font-bold">Votre panier est vide</h1>
      <p className="mt-1 text-muted-foreground">Découvrez les restaurants de Ziguinchor.</p>
      <Link to="/restaurants" className="mt-6 rounded-full bg-primary-deep px-6 py-3 font-semibold text-primary-foreground">Voir les restaurants</Link>
    </div>
  );
  const t = computeTotals(subtotal, r.delivery_fee, "livraison");
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="text-3xl font-bold">Panier</h1>
        <Link to="/restaurants/$id" params={{ id: r.id }} className="text-sm text-primary hover:underline">{r.name}</Link>
        <ul className="mt-6 divide-y rounded-2xl border bg-card">
          {items.map((i) => (
            <li key={i.key} className="flex items-center gap-4 p-4">
              <div className="flex-1"><p className="font-medium">{i.name}</p>{i.note && <p className="text-xs text-muted-foreground">« {i.note} »</p>}<p className="text-sm text-muted-foreground">{formatFCFA(i.price)}</p></div>
              <div className="flex items-center gap-2 rounded-full bg-secondary p-1">
                <button aria-label="Moins" onClick={() => setQty(i.key, i.qty - 1)} className="grid size-8 place-items-center rounded-full bg-card">{i.qty === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}</button>
                <span className="w-5 text-center text-sm font-semibold">{i.qty}</span>
                <button aria-label="Plus" onClick={() => setQty(i.key, i.qty + 1)} className="grid size-8 place-items-center rounded-full bg-card"><Plus className="size-4" /></button>
              </div>
            </li>
          ))}
        </ul>
        <button onClick={clear} className="mt-4 text-sm text-destructive hover:underline">Vider le panier</button>
      </div>
      <aside className="h-fit rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] lg:sticky lg:top-24">
        <Row l="Sous-total" v={formatFCFA(t.subtotal)} /><Row l="Livraison (estimée)" v={formatFCFA(t.fee)} />
        <div className="my-3 border-t" /><Row l="Total" v={formatFCFA(t.total)} bold />
        <Link to="/commande" className="mt-5 block rounded-full bg-primary-deep py-3 text-center font-semibold text-primary-foreground hover:opacity-90">Valider la commande</Link>
      </aside>
    </div>
  );
}
export function Row({ l, v, bold }: { l: string; v: string; bold?: boolean }) {
  return <div className={`flex justify-between py-1 ${bold ? "text-lg font-bold" : "text-sm text-muted-foreground"}`}><span>{l}</span><span>{v}</span></div>;
}
