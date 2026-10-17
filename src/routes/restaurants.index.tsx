import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Search, UtensilsCrossed } from "lucide-react";
import { AddressSearch } from "@/components/AddressSearch";
import { RestaurantCard } from "@/components/RestaurantCard";
import { useQuery } from "@tanstack/react-query";
import { filterRestaurants, restaurantsQuery } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { CATEGORIES } from "@/lib/data";

export const Route = createFileRoute("/restaurants/")({
  validateSearch: z.object({ q: z.string().optional(), cuisine: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Restaurants à Ziguinchor — RestoClik" },
      { name: "description", content: "Trouvez les restaurants qui livrent dans votre quartier à Ziguinchor." },
      { property: "og:title", content: "Restaurants à Ziguinchor — RestoClik" },
      { property: "og:description", content: "Restaurants, dibiteries et fast-foods qui livrent chez vous." },
    ],
  }),
  component: Page,
});

function Page() {
  const { q, cuisine } = Route.useSearch();
  const navigate = useNavigate({ from: "/restaurants/" });
  const { address, setAddress } = useCart();
  const { data = [], isLoading } = useQuery(restaurantsQuery);
  const results = filterRestaurants(data, { address, query: q, cuisine });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">{address ? `Restaurants livrant à ${address}` : "Tous les restaurants"}</h1>
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center">
        <AddressSearch />
        {address && <button onClick={() => setAddress("")} className="text-sm font-medium text-primary hover:underline">Voir toute la ville</button>}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-full border bg-card px-4 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input value={q ?? ""} onChange={(e) => navigate({ search: (s) => ({ ...s, q: e.target.value || undefined }), replace: true })} placeholder="Plat ou restaurant" className="bg-transparent text-sm outline-none" />
        </label>
        <button onClick={() => navigate({ search: (s) => ({ ...s, cuisine: undefined }) })} className={`rounded-full px-4 py-2 text-sm font-medium ${!cuisine ? "bg-primary-deep text-primary-foreground" : "bg-secondary"}`}>Tout</button>
        {CATEGORIES.map((c) => (
          <button key={c.label} onClick={() => navigate({ search: (s) => ({ ...s, cuisine: c.label }) })} className={`rounded-full px-4 py-2 text-sm font-medium ${cuisine === c.label ? "bg-primary-deep text-primary-foreground" : "bg-secondary"}`}>{c.emoji} {c.label}</button>
        ))}
      </div>
      {isLoading ? <p className="mt-10 text-muted-foreground">Chargement…</p> : results.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{results.map((r) => <RestaurantCard key={r.id} r={r} />)}</div>
      ) : (
        <div className="mt-16 flex flex-col items-center text-center">
          <UtensilsCrossed className="size-10 text-primary" />
          <p className="mt-3 font-semibold">Aucun restaurant ne correspond.</p>
          <p className="text-sm text-muted-foreground">Essayez un autre quartier ou une autre catégorie.</p>
          <Link to="/restaurants" search={{}} onClick={() => setAddress("")} className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">Réinitialiser</Link>
        </div>
      )}
    </div>
  );
}
