import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PHONE_RE, QUARTIERS } from "@/lib/data";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur",
  responsable_restaurant: "Restaurateur",
  cuisinier: "Cuisinier",
  livreur: "Livreur",
  client: "Client",
};

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil — RestoClik" },
      { name: "description", content: "Gérez vos informations personnelles." },
      { property: "og:title", content: "Mon profil — RestoClik" },
      { property: "og:description", content: "Votre profil RestoClik." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user, roles, signOut } = useAuth();
  const [f, setF] = useState({ full_name: "", phone: "", default_address: "" });
  const [restaurantMember, setRestaurantMember] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, default_address")
      .eq("id", user.id)
      .maybeSingle()
      .then(
        ({ data }) =>
          data &&
          setF({
            full_name: data.full_name,
            phone: data.phone ?? "",
            default_address: data.default_address ?? "",
          }),
      );
    supabase
      .from("restaurant_members")
      .select("restaurant_id")
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) toast.error("Impossible de vérifier vos accès restaurateur.");
        else setRestaurantMember((data ?? []).length > 0);
      });
  }, [user]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (f.phone && !PHONE_RE.test(f.phone.trim())) {
      toast.error("Numéro sénégalais invalide.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: f.full_name.trim(),
        phone: f.phone.trim() || null,
        default_address: f.default_address || null,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) toast.error("Enregistrement impossible.");
    else toast.success("Profil enregistré.");
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">Mon profil</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {user?.email} · {roles.map((r) => ROLE_LABEL[r] ?? r).join(", ") || "Client"}
      </p>
      <form onSubmit={save} className="mt-6 space-y-4 rounded-2xl border bg-card p-6">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Nom complet</span>
          <input
            value={f.full_name}
            onChange={(e) => setF({ ...f, full_name: e.target.value })}
            className="input"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Téléphone</span>
          <input
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
            placeholder="77 123 45 67"
            className="input"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Quartier par défaut</span>
          <select
            value={f.default_address}
            onChange={(e) => setF({ ...f, default_address: e.target.value })}
            className="input"
          >
            <option value="">—</option>
            {QUARTIERS.map((q) => (
              <option key={q} value={`${q}, Ziguinchor`}>
                {q}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={busy}
          className="w-full rounded-full bg-primary-deep py-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          Enregistrer
        </button>
      </form>
      <div className="mt-6 flex justify-between text-sm">
        <Link to="/commandes" className="font-semibold text-primary hover:underline">
          Mes commandes
        </Link>
        <button onClick={signOut} className="text-destructive hover:underline">
          Se déconnecter
        </button>
      </div>
      {(roles.includes("admin") || roles.includes("livreur") || restaurantMember) && (
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold">
          {roles.includes("admin") && (
            <Link to="/admin" className="text-primary hover:underline">
              Administration
            </Link>
          )}
          {restaurantMember && (
            <Link to="/restaurateur" className="text-primary hover:underline">
              Espace restaurateur
            </Link>
          )}
          {roles.includes("livreur") && (
            <Link to="/livreur-dashboard" className="text-primary hover:underline">
              Espace livreur
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
