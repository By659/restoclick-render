import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, ChefHat, MapPin, ShoppingBag, Store } from "lucide-react";
import hero from "@/assets/hero.jpg";
import { AddressSearch } from "@/components/AddressSearch";
import { RestaurantCard } from "@/components/RestaurantCard";
import { useQuery } from "@tanstack/react-query";
import { CATEGORIES } from "@/lib/data";
import { restaurantsQuery } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RestoClik — Vos repas livrés à Ziguinchor" },
      { name: "description", content: "Thiéb, dibi, burgers : commandez auprès des meilleurs restaurants de Ziguinchor et faites-vous livrer." },
      { property: "og:title", content: "RestoClik — Vos repas livrés à Ziguinchor" },
      { property: "og:description", content: "Commandez auprès des restaurants, dibiteries et fast-foods de Ziguinchor." },
    ],
  }),
  component: Index,
});

function Index() {
  const { data = [] } = useQuery(restaurantsQuery);
  const popular = data.filter((r) => r.is_open).slice(0, 3);
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <img src={hero} alt="Thiéboudienne servi sur un grand plat" width={1600} height={1008} className="absolute inset-0 -z-10 size-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-hero" />
        <div className="mx-auto max-w-7xl px-4 py-24 sm:py-32">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-secondary/90 px-3 py-1 text-xs font-semibold text-primary-deep"><MapPin className="size-3" /> Ziguinchor, Sénégal</p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-primary-foreground sm:text-6xl">Le goût de Ziguinchor, livré chez vous.</h1>
          <p className="mt-4 max-w-lg text-lg text-primary-foreground/85">Restaurants, dibiteries et fast-foods de votre quartier, en quelques clics.</p>
          <div className="mt-8"><AddressSearch /></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-14">
        <h2 className="text-2xl font-bold">Catégories</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link key={c.label} to="/restaurants" search={{ cuisine: c.label }} className="card-lift flex items-center gap-3 rounded-2xl border bg-card p-4 font-semibold">
              <span className="grid size-11 place-items-center rounded-xl bg-secondary text-2xl">{c.emoji}</span>{c.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold">Populaires en ce moment</h2>
          <Link to="/restaurants" className="text-sm font-semibold text-primary hover:underline">Tout voir</Link>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{popular.map((r) => <RestaurantCard key={r.id} r={r} />)}</div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: ShoppingBag, t: "Commandez", d: "Choisissez vos plats et personnalisez-les." },
            { icon: ChefHat, t: "On cuisine", d: "Le restaurant prépare votre commande en direct." },
            { icon: Bike, t: "On livre", d: "Un livreur vous l'apporte, suivi en temps réel." },
          ].map(({ icon: I, t, d }) => (
            <div key={t} className="rounded-2xl bg-secondary p-6"><I className="size-7 text-primary" /><h3 className="mt-3 text-lg font-semibold">{t}</h3><p className="text-sm text-muted-foreground">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pt-16 md:grid-cols-2">
        <Link to="/partenaire" className="card-lift rounded-3xl bg-primary-deep p-8 text-primary-foreground"><Store className="size-8 text-accent" /><h3 className="mt-4 text-2xl font-bold">Vous possédez un restaurant ?</h3><p className="mt-2 text-primary-foreground/80">Touchez plus de clients avec seulement 8 % de commission.</p></Link>
        <Link to="/livreur" className="card-lift rounded-3xl bg-gradient-gold p-8 text-primary-deep"><Bike className="size-8" /><h3 className="mt-4 text-2xl font-bold">Devenez livreur</h3><p className="mt-2 opacity-80">Gagnez de l'argent à votre rythme, à moto ou à vélo.</p></Link>
      </section>
    </>
  );
}
