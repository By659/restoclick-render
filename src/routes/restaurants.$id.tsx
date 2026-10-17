import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Clock, Minus, Plus, Star, X } from "lucide-react";
import { toast } from "sonner";
import { useSuspenseQuery } from "@tanstack/react-query";
import { restaurantsQuery } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatFCFA, imageFor, type Dish } from "@/lib/data";

export const Route = createFileRoute("/restaurants/$id")({
  loader: async ({ params, context }) => {
    const list = await context.queryClient.ensureQueryData(restaurantsQuery);
    const r = list.find((x) => x.id === params.id);
    if (!r) throw notFound();
    return { r };
  },
  notFoundComponent: () => (
    <div className="py-24 text-center">
      <p className="font-semibold">Restaurant introuvable.</p>
      <Link to="/restaurants" className="text-primary underline">
        Voir les restaurants
      </Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <p className="py-24 text-center text-destructive">
      {error instanceof Error ? error.message : "Une erreur est survenue."}
    </p>
  ),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.r.name} — RestoClik` },
          {
            name: "description",
            content: `Commandez chez ${loaderData.r.name} (${loaderData.r.cuisine}) à Ziguinchor.`,
          },
          { property: "og:title", content: `${loaderData.r.name} — RestoClik` },
          { property: "og:description", content: `Menu et livraison de ${loaderData.r.name}.` },
        ]
      : [{ title: "Restaurant introuvable — RestoClik" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(restaurantsQuery);
  const r = data.find((x) => x.id === id)!;
  const [dish, setDish] = useState<Dish | null>(null);
  const cats = [...new Set(r.dishes.map((d) => d.category))];
  return (
    <div>
      <div className="relative h-56 sm:h-72">
        <img src={imageFor(r.image_key)} alt={r.name} className="size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-hero" />
      </div>
      <div className="mx-auto -mt-16 max-w-5xl px-4">
        <div className="relative rounded-3xl border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h1 className="text-3xl font-bold">{r.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {r.type} · {r.cuisine}
          </p>
          {r.is_demo && (
            <p className="mt-2 text-xs text-muted-foreground">
              Établissement fictif — données de démonstration.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <span className="flex items-center gap-1">
              <Star className="size-4 fill-primary text-primary" />
              {r.rating} ({r.reviews} avis)
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-4" />
              {r.delivery_min}–{r.delivery_max} min
            </span>
            <span>Livraison {formatFCFA(r.delivery_fee)}</span>
            <span className={r.is_open ? "text-success" : "text-destructive"}>
              {r.is_open ? "Ouvert" : "Fermé"}
            </span>
          </div>
          {r.promo && (
            <p className="mt-3 inline-block rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-primary-deep">
              {r.promo}
            </p>
          )}
        </div>
        {cats.map((c) => (
          <section key={c} className="mt-10">
            <h2 className="text-xl font-bold">{c}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {r.dishes
                .filter((d) => d.category === c)
                .map((d) => (
                  <button
                    key={d.id}
                    disabled={!r.is_open || !d.is_available}
                    onClick={() => setDish(d)}
                    className="card-lift flex gap-4 rounded-2xl border bg-card p-3 text-left disabled:opacity-60"
                  >
                    <div className="flex-1 p-1">
                      <h3 className="font-semibold">{d.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {d.description}
                      </p>
                      <p className="mt-2 font-semibold text-primary-deep">{formatFCFA(d.price)}</p>
                    </div>
                    <img
                      src={imageFor(d.image_key)}
                      alt={d.name}
                      loading="lazy"
                      className="size-24 rounded-xl object-cover"
                    />
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
      {dish && <DishDialog dish={dish} restaurantId={r.id} onClose={() => setDish(null)} />}
    </div>
  );
}

function DishDialog({
  dish,
  restaurantId,
  onClose,
}: {
  dish: Dish;
  restaurantId: string;
  onClose: () => void;
}) {
  const { add, clear } = useCart();
  const [qty, setQty] = useState(1);
  const [opts, setOpts] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const unit =
    dish.price +
    dish.options.filter((o) => opts.includes(o.label)).reduce((s, o) => s + o.price, 0);
  const label = opts.length ? `${dish.name} (${opts.join(", ")})` : dish.name;

  const submit = () => {
    const item = {
      dishId: dish.id,
      name: label,
      price: unit,
      options: opts,
      note: note || undefined,
    };
    if (!add(restaurantId, item, qty)) {
      if (confirm("Votre panier contient des plats d'un autre restaurant. Le vider ?")) {
        clear();
        add(restaurantId, item, qty);
      } else return;
    }
    toast.success(`${dish.name} ajouté au panier`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={dish.name}
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-t-3xl bg-card sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <img
            src={imageFor(dish.image_key)}
            alt={dish.name}
            className="h-52 w-full object-cover"
          />
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-card"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="p-6">
          <h3 className="text-2xl font-bold">{dish.name}</h3>
          <p className="mt-1 text-muted-foreground">{dish.description}</p>
          {dish.options.length > 0 && (
            <div className="mt-5 space-y-2">
              <p className="text-sm font-semibold">Suppléments</p>
              {dish.options.map((o) => (
                <label
                  key={o.label}
                  className="flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="accent-[var(--primary)]"
                      checked={opts.includes(o.label)}
                      onChange={(e) =>
                        setOpts(
                          e.target.checked ? [...opts, o.label] : opts.filter((x) => x !== o.label),
                        )
                      }
                    />
                    {o.label}
                  </span>
                  <span className="text-muted-foreground">+{formatFCFA(o.price)}</span>
                </label>
              ))}
            </div>
          )}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Instructions (ex. sans piment)"
            className="mt-4 w-full rounded-xl border bg-background p-3 text-sm outline-none focus:border-primary"
          />
          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center gap-3 rounded-full bg-secondary p-1">
              <button
                aria-label="Moins"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="grid size-9 place-items-center rounded-full bg-card"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button
                aria-label="Plus"
                onClick={() => setQty(qty + 1)}
                className="grid size-9 place-items-center rounded-full bg-card"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <button
              onClick={submit}
              className="flex-1 rounded-full bg-primary-deep py-3 font-semibold text-primary-foreground hover:opacity-90"
            >
              Ajouter · {formatFCFA(unit * qty)}
            </button>
          </div>
          <Link
            to="/panier"
            className="mt-3 block text-center text-sm text-primary hover:underline"
          >
            Voir le panier
          </Link>
        </div>
      </div>
    </div>
  );
}
