import { Link } from "@tanstack/react-router";
import { Clock, Star } from "lucide-react";
import { formatFCFA, imageFor, type Restaurant } from "@/lib/data";

export function RestaurantCard({ r }: { r: Restaurant }) {
  return (
    <Link to="/restaurants/$id" params={{ id: r.id }} className="card-lift group block overflow-hidden rounded-2xl border bg-card">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img src={imageFor(r.image_key)} alt={r.name} loading="lazy" width={1024} height={640} className={`size-full object-cover transition duration-500 group-hover:scale-105 ${r.is_open ? "" : "grayscale"}`} />
        {r.promo && <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">{r.promo}</span>}
        {!r.is_open && <span className="absolute inset-0 grid place-items-center bg-foreground/50 font-semibold text-primary-foreground">Fermé</span>}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold">{r.name}</h3>
          <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-primary-deep"><Star className="size-3 fill-current" />{r.rating}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{r.type} · {r.cuisine}{r.is_demo && " · Démo"}</p>
        <p className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="size-3" />{r.delivery_min}–{r.delivery_max} min</span>
          <span>Livraison {formatFCFA(r.delivery_fee)}</span>
        </p>
      </div>
    </Link>
  );
}
