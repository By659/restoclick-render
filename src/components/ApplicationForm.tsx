import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { submitApplication } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(2, "Nom requis").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^(\+221)?\s?7[05678]\d{7}$/, "Numéro sénégalais invalide"),
  detail: z.string().trim().min(2, "Champ requis").max(120),
});

export function ApplicationForm({
  kind,
  detailLabel,
}: {
  kind: "partenaire" | "livreur";
  detailLabel: string;
}) {
  const { user } = useAuth();
  const [f, setF] = useState({ name: "", phone: "", detail: "" });
  const [err, setErr] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  if (sent)
    return (
      <p className="rounded-2xl bg-secondary p-6 font-medium text-primary-deep">
        Merci ! Votre demande est enregistrée. Nous vous recontacterons par téléphone.
      </p>
    );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const r = schema.safeParse(f);
        if (!r.success) {
          setErr(Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message])));
          return;
        }
        setBusy(true);
        try {
          await submitApplication({
            kind,
            name: r.data.name,
            phone: r.data.phone,
            detail: r.data.detail,
            userId: user?.id,
          });
          toast.success("Demande envoyée");
          setSent(true);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Envoi impossible.");
        } finally {
          setBusy(false);
        }
      }}
      className="space-y-4 rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)]"
    >
      {(
        [
          ["name", "Nom complet"],
          ["phone", "Téléphone"],
          ["detail", detailLabel],
        ] as const
      ).map(([k, l]) => (
        <label key={k} className="block text-sm">
          <span className="mb-1 block font-medium">{l}</span>
          <input
            value={f[k]}
            onChange={(e) => setF({ ...f, [k]: e.target.value })}
            className="input"
          />
          {err[k] && <span className="mt-1 block text-destructive">{err[k]}</span>}
        </label>
      ))}
      <button
        disabled={busy}
        className="w-full rounded-full bg-primary-deep py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Envoi…" : "Envoyer ma demande"}
      </button>
    </form>
  );
}
