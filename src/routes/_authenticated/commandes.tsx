import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { myOrdersQuery } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatFCFA, ORDER_STATUS } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/commandes")({
  head: () => ({ meta: [
    { title: "Mes commandes — RestoClik" }, { name: "description", content: "Historique et suivi de vos commandes." },
    { property: "og:title", content: "Mes commandes — RestoClik" }, { property: "og:description", content: "Vos commandes RestoClik." },
  ] }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({ ...myOrdersQuery(user?.id ?? ""), enabled: !!user });
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Mes commandes</h1>
      {isLoading || !user ? <p className="mt-8 text-muted-foreground">Chargement…</p>
        : error ? <p className="mt-8 text-destructive">{error.message}</p>
        : !data?.length ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <Receipt className="size-10 text-primary" />
            <p className="mt-3 font-semibold">Aucune commande pour l'instant.</p>
            <Link to="/restaurants" className="mt-4 rounded-full bg-primary-deep px-5 py-2 text-sm font-semibold text-primary-foreground">Commander</Link>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {data.map((o) => (
              <li key={o.id} className="rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{o.restaurant_name} <span className="text-sm font-normal text-muted-foreground">· {o.code}</span></p>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary-deep">{ORDER_STATUS[o.status] ?? o.status}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("fr-FR")} · {o.mode === "livraison" ? "Livraison" : "À emporter"}</p>
                <ul className="mt-3 text-sm text-muted-foreground">{o.order_items.map((i, k) => <li key={k}>{i.quantity}× {i.name}</li>)}</ul>
                <p className="mt-2 text-right font-bold">{formatFCFA(o.total)}</p>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}
