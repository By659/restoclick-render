import { createFileRoute, Link } from "@tanstack/react-router";

const STEPS = [
  ["Indiquez votre quartier", "Nous affichons les restaurants qui livrent chez vous."],
  ["Choisissez vos plats", "Personnalisez avec suppléments et instructions."],
  ["Validez et payez", "À la livraison ou avec Wave."],
  ["Suivez votre commande", "De la cuisine jusqu'à votre porte."],
];

export const Route = createFileRoute("/comment-ca-marche")({
  head: () => ({ meta: [
    { title: "Comment ça marche — RestoClik" }, { name: "description", content: "Commander sur RestoClik en 4 étapes simples." },
    { property: "og:title", content: "Comment ça marche — RestoClik" }, { property: "og:description", content: "Commander en 4 étapes." },
  ] }),
  component: () => (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-4xl font-bold">Comment ça marche</h1>
      <ol className="mt-10 grid gap-4 sm:grid-cols-2">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="rounded-2xl border bg-card p-6"><span className="grid size-10 place-items-center rounded-full bg-gradient-gold font-bold text-primary-foreground">{i + 1}</span><h2 className="mt-4 text-lg font-semibold">{t}</h2><p className="text-sm text-muted-foreground">{d}</p></li>
        ))}
      </ol>
      <Link to="/restaurants" className="mt-10 inline-block rounded-full bg-primary-deep px-6 py-3 font-semibold text-primary-foreground">Commander maintenant</Link>
    </div>
  ),
});
