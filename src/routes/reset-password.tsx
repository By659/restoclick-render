import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "Nouveau mot de passe — RestoClik" }, { name: "description", content: "Choisissez un nouveau mot de passe." },
    { property: "og:title", content: "Nouveau mot de passe — RestoClik" }, { property: "og:description", content: "Réinitialisation du mot de passe." },
  ] }),
  component: Page,
});

function Page() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-3xl font-bold">Nouveau mot de passe</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (pw.length < 8) { toast.error("8 caractères minimum."); return; }
          setBusy(true);
          const { error } = await supabase.auth.updateUser({ password: pw });
          setBusy(false);
          if (error) { toast.error("Lien expiré ou invalide. Redemandez un lien."); return; }
          toast.success("Mot de passe mis à jour.");
          navigate({ to: "/profil" });
        }}
        className="mt-6 space-y-4 rounded-2xl border bg-card p-6"
      >
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Nouveau mot de passe" className="input" autoComplete="new-password" />
        <button disabled={busy} className="w-full rounded-full bg-primary-deep py-3 font-semibold text-primary-foreground disabled:opacity-60">Enregistrer</button>
      </form>
    </div>
  );
}
