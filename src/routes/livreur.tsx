import { createFileRoute } from "@tanstack/react-router";
import { ApplicationForm } from "@/components/ApplicationForm";

export const Route = createFileRoute("/livreur")({
  head: () => ({ meta: [
    { title: "Devenir livreur — RestoClik" }, { name: "description", content: "Livrez avec RestoClik à Ziguinchor et gagnez de l'argent à votre rythme." },
    { property: "og:title", content: "Devenir livreur — RestoClik" }, { property: "og:description", content: "Rejoignez les livreurs RestoClik." },
  ] }),
  component: () => (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 md:grid-cols-2">
      <div>
        <h1 className="text-4xl font-bold">Livrez avec RestoClik</h1>
        <ul className="mt-6 space-y-3 text-muted-foreground">
          <li>✓ Horaires libres</li><li>✓ Itinéraires proposés</li><li>✓ Paiement de chaque course</li>
        </ul>
      </div>
      <ApplicationForm kind="livreur" detailLabel="Véhicule (moto, vélo…)" />
    </div>
  ),
});
