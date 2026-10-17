import { createFileRoute } from "@tanstack/react-router";
import { ApplicationForm } from "@/components/ApplicationForm";

export const Route = createFileRoute("/partenaire")({
  head: () => ({ meta: [
    { title: "Devenir restaurant partenaire — RestoClik" }, { name: "description", content: "Rejoignez RestoClik et vendez vos plats en ligne à Ziguinchor. Commission de 8 %." },
    { property: "og:title", content: "Devenir restaurant partenaire — RestoClik" }, { property: "og:description", content: "Vendez en ligne avec seulement 8 % de commission." },
  ] }),
  component: () => (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 md:grid-cols-2">
      <div>
        <h1 className="text-4xl font-bold">Développez votre restaurant avec RestoClik</h1>
        <ul className="mt-6 space-y-3 text-muted-foreground">
          <li>✓ Seulement <strong className="text-primary-deep">8 % de commission</strong> par commande</li>
          <li>✓ Écran cuisine pour suivre les commandes en direct</li>
          <li>✓ Livreurs disponibles dans toute la ville</li>
          <li>✓ Tableau de bord de vos ventes</li>
        </ul>
      </div>
      <ApplicationForm kind="partenaire" detailLabel="Nom du restaurant et quartier" />
    </div>
  ),
});
