import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PHONE_RE } from "@/lib/data";

const searchSchema = z.object({
  mode: z.enum(["connexion", "inscription", "oubli"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [
    { title: "Connexion ou inscription — RestoClik" }, { name: "description", content: "Accédez à votre compte RestoClik pour commander et suivre vos commandes." },
    { property: "og:title", content: "Connexion — RestoClik" }, { property: "og:description", content: "Votre compte RestoClik." },
  ] }),
  component: AuthPage,
});

const safePath = (p?: string) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/");

function AuthPage() {
  const { mode = "connexion", redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [f, setF] = useState({ name: "", phone: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState("");

  useEffect(() => { if (user) navigate({ to: safePath(redirect) }); }, [user, redirect, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "inscription") {
        if (f.name.trim().length < 2) throw new Error("Indiquez votre nom.");
        if (f.phone && !PHONE_RE.test(f.phone.trim())) throw new Error("Numéro sénégalais invalide.");
        if (f.password.length < 8) throw new Error("Mot de passe : 8 caractères minimum.");
        const { error } = await supabase.auth.signUp({
          email: f.email.trim(), password: f.password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: f.name.trim(), phone: f.phone.trim() || null } },
        });
        if (error) throw error;
        setSent("Vérifiez votre boîte mail pour confirmer votre compte.");
      } else if (mode === "oubli") {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setSent("Si ce compte existe, un lien de réinitialisation vient d'être envoyé.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw new Error("Email ou mot de passe incorrect.");
        toast.success("Bon retour !");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally { setBusy(false); }
  };

  const title = { connexion: "Connexion", inscription: "Créer un compte", oubli: "Mot de passe oublié" }[mode];

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-3xl font-bold">{title}</h1>
      {sent ? (
        <p className="mt-6 rounded-2xl bg-secondary p-5 font-medium text-primary-deep">{sent}</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]">
          {mode === "inscription" && (
            <>
              <Field label="Nom complet"><input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="input" autoComplete="name" /></Field>
              <Field label="Téléphone (facultatif)"><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="77 123 45 67" className="input" autoComplete="tel" /></Field>
            </>
          )}
          <Field label="Email"><input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className="input" autoComplete="email" /></Field>
          {mode !== "oubli" && (
            <Field label="Mot de passe"><input required type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className="input" autoComplete={mode === "inscription" ? "new-password" : "current-password"} /></Field>
          )}
          <button disabled={busy} className="w-full rounded-full bg-primary-deep py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {busy ? "Patientez…" : mode === "inscription" ? "Créer mon compte" : mode === "oubli" ? "Envoyer le lien" : "Se connecter"}
          </button>
        </form>
      )}
      <div className="mt-5 flex flex-col items-center gap-2 text-sm">
        {mode !== "connexion" && <Link to="/auth" search={{ mode: "connexion", redirect }} className="text-primary hover:underline">J'ai déjà un compte</Link>}
        {mode !== "inscription" && <Link to="/auth" search={{ mode: "inscription", redirect }} className="text-primary hover:underline">Créer un compte</Link>}
        {mode === "connexion" && <Link to="/auth" search={{ mode: "oubli" }} className="text-muted-foreground hover:underline">Mot de passe oublié ?</Link>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block font-medium">{label}</span>{children}</label>;
}
