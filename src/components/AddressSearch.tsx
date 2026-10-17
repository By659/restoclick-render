import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import { suggestAddresses } from "@/lib/api";
import { useCart } from "@/lib/cart";

export function AddressSearch() {
  const { address, setAddress } = useCart();
  const [value, setValue] = useState(address);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const sugg = suggestAddresses(value);

  const confirm = (a: string) => {
    const match = suggestAddresses(a.split(",")[0] ?? "")[0];
    if (!match) { setError("Choisissez un quartier de Ziguinchor dans la liste."); return; }
    setAddress(match); setValue(match); setOpen(false); setError("");
    navigate({ to: "/restaurants" });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); confirm(sugg[active] ?? value); }} className="relative w-full max-w-xl">
      <div className="flex items-center gap-2 rounded-2xl bg-card p-2 shadow-[var(--shadow-lift)]">
        <MapPin className="ml-2 size-5 shrink-0 text-primary" />
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); setActive(0); setError(""); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, sugg.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Votre quartier (ex. Boucotte, Escale…)"
          aria-label="Adresse de livraison"
          className="min-w-0 flex-1 bg-transparent py-2 text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-primary-deep px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
          <Search className="size-4" /> <span className="hidden sm:inline">Trouver</span>
        </button>
      </div>
      {open && sugg.length > 0 && (
        <ul role="listbox" className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border bg-popover shadow-[var(--shadow-soft)]">
          {sugg.map((s, i) => (
            <li key={s} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={() => confirm(s)} className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm ${i === active ? "bg-secondary" : "hover:bg-muted"}`}>
                <MapPin className="size-4 text-primary" /> {s}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 rounded-lg bg-card px-3 py-2 text-sm text-destructive">{error}</p>}
    </form>
  );
}
