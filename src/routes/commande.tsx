import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { computeTotals, placeOrder, restaurantsQuery, suggestAddresses } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { formatFCFA } from "@/lib/data";

export const Route = createFileRoute("/commande")({
  head: () => ({
    meta: [
      { title: "Valider ma commande — RestoClik" },
      { name: "description", content: "Adresse, mode de réception et paiement." },
      { property: "og:title", content: "Valider ma commande — RestoClik" },
      { property: "og:description", content: "Finalisez votre commande RestoClik." },
    ],
  }),
  component: Page,
});

const schema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^(\+221)?\s?7[05678]\d{7}$/, "Numéro sénégalais invalide (ex. 77 123 45 67)"),
  address: z.string().trim().min(3, "Adresse requise"),
});

function Page() {
  const { items, restaurantId, subtotal, address, clear } = useCart();
  const { data = [], isLoading, error } = useQuery(restaurantsQuery);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const r = restaurantId ? data.find((x) => x.id === restaurantId) : undefined;
  const [mode, setMode] = useState<"livraison" | "emporter">("livraison");
  const [pay, setPay] = useState<"wave" | "cash">("cash");
  const [form, setForm] = useState({ name: "", phone: "", address });
  const [errors, setErrors] = useState<{ name?: string; phone?: string; address?: string }>({});
  const [done, setDone] = useState<Awaited<ReturnType<typeof placeOrder>> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (done)
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <CheckCircle2 className="mx-auto size-14 text-success" />
        <h1 className="mt-4 text-2xl font-bold">Commande {done.code} envoyée !</h1>
        <p className="mt-2 text-muted-foreground">
          {r?.name ?? "Restaurant"} a reçu votre commande de {formatFCFA(done.total)}.
        </p>
        <Link
          to="/restaurants"
          className="mt-6 inline-block rounded-full bg-primary-deep px-6 py-3 font-semibold text-primary-foreground"
        >
          Continuer
        </Link>
      </div>
    );
  if (!items.length)
    return (
      <div className="py-24 text-center">
        <p>Panier vide.</p>
        <Link to="/restaurants" className="text-primary underline">
          Voir les restaurants
        </Link>
      </div>
    );
  if (isLoading)
    return <p className="py-24 text-center text-muted-foreground">Chargement du restaurant…</p>;
  if (error)
    return (
      <p role="alert" className="py-24 text-center text-destructive">
        {error.message}
      </p>
    );
  if (!r)
    return (
      <p role="alert" className="py-24 text-center text-destructive">
        Restaurant introuvable. Videz le panier et réessayez.
      </p>
    );

  const t = computeTotals(subtotal, r.delivery_fee, mode);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authLoading || submitting) return;
    if (!user) {
      await navigate({ to: "/auth", search: { mode: "connexion", redirect: "/commande" } });
      return;
    }
    const res = schema.safeParse(mode === "livraison" ? form : { ...form, address: "À emporter" });
    if (!res.success) {
      setErrors(Object.fromEntries(res.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    if (mode === "livraison" && !r.quartiers.includes((form.address.split(",")[0] ?? "").trim())) {
      setErrors({ address: `${r.name} ne livre pas ce quartier.` });
      return;
    }
    setSubmitting(true);
    try {
      if (pay === "wave") toast.info("Paiement Wave en mode démonstration : aucun débit réel.");
      const result = await placeOrder({
        restaurantId: r.id,
        mode,
        payment: pay,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: mode === "livraison" ? form.address.trim() : "À emporter",
        items: items.map((item) => ({
          dish_id: item.dishId,
          quantity: item.qty,
          options: item.options,
          note: item.note,
        })),
      });
      clear();
      setDone(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer la commande.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1fr_340px]"
    >
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Validation</h1>
        <Section title="Mode de réception">
          <Choice
            value={mode}
            set={setMode}
            opts={[
              ["livraison", "Livraison"],
              ["emporter", "À emporter"],
            ]}
          />
        </Section>
        <Section title="Coordonnées">
          <Field label="Nom complet" err={errors.name}>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Téléphone" err={errors.phone}>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="77 123 45 67"
              className="input"
            />
          </Field>
          {mode === "livraison" && (
            <Field label="Quartier de livraison" err={errors.address}>
              <input
                list="quartiers"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="input"
              />
              <datalist id="quartiers">
                {suggestAddresses(form.address.split(",")[0] || "a").map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
          )}
        </Section>
        <Section title="Paiement">
          <Choice
            value={pay}
            set={setPay}
            opts={[
              ["cash", "À la livraison"],
              ["wave", "Wave (démo)"],
            ]}
          />
        </Section>
      </div>
      <aside className="h-fit rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
        <p className="font-semibold">{r.name}</p>
        {items.map((i) => (
          <p key={i.key} className="mt-1 flex justify-between text-sm text-muted-foreground">
            <span>
              {i.qty}× {i.name}
            </span>
            <span>{formatFCFA(i.qty * i.price)}</span>
          </p>
        ))}
        <div className="my-3 border-t" />
        <p className="flex justify-between text-sm">
          <span>Sous-total</span>
          <span>{formatFCFA(t.subtotal)}</span>
        </p>
        <p className="flex justify-between text-sm">
          <span>Livraison</span>
          <span>{formatFCFA(t.fee)}</span>
        </p>
        <p className="mt-2 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatFCFA(t.total)}</span>
        </p>
        <button
          type="submit"
          disabled={submitting || authLoading}
          className="mt-5 w-full rounded-full bg-primary-deep py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Enregistrement…" : "Confirmer la commande"}
        </button>
      </aside>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Field({
  label,
  err,
  children,
}: {
  label: string;
  err?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {err && <span className="mt-1 block text-destructive">{err}</span>}
    </label>
  );
}
function Choice<T extends string>({
  value,
  set,
  opts,
}: {
  value: T;
  set: (v: T) => void;
  opts: [T, string][];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {opts.map(([v, l]) => (
        <button
          type="button"
          key={v}
          onClick={() => set(v)}
          className={`rounded-xl border p-3 text-sm font-medium ${value === v ? "border-primary bg-secondary text-primary-deep" : ""}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
