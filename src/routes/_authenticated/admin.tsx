import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  assignGlobalRole,
  assignRestaurantMember,
  getAdminBackoffice,
  updateApplicationStatus,
} from "@/lib/backoffice.functions";
import { formatFCFA } from "@/lib/data";

function acceptedApplicationMailto(application: {
  name: string;
  email: string | null;
  kind: string;
}) {
  if (!application.email) return "mailto:";
  const email = application.email;
  const kind = application.kind === "partenaire" ? "comme restaurant partenaire" : "comme livreur";
  const body = [
    `Bonjour ${application.name},`,
    "",
    `Nous avons le plaisir de vous informer que votre candidature ${kind} chez RestoClik a été acceptée.`,
    "",
    `Vous pouvez créer votre compte sur ${window.location.origin}/auth?mode=inscription en utilisant exactement cette adresse e-mail : ${email}.`,
    "",
    "Nous finaliserons l’activation de votre accès après la création du compte.",
    "",
    "À bientôt sur RestoClik.",
  ].join("\r\n");
  const query = new URLSearchParams({
    subject: "Votre candidature RestoClik est acceptée",
    body,
  });
  return `mailto:${email}?${query.toString()}`;
}

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administration — RestoClik" }] }),
  component: AdminBackoffice,
});

function AdminBackoffice() {
  const [globalRoleForm, setGlobalRoleForm] = useState({
    email: "",
    role: "livreur" as "admin" | "client" | "livreur",
  });
  const [memberForm, setMemberForm] = useState({
    email: "",
    restaurantId: "",
    role: "responsable_restaurant" as "responsable_restaurant" | "cuisinier",
  });
  const queryClient = useQueryClient();
  const getDashboard = useServerFn(getAdminBackoffice);
  const setApplicationStatus = useServerFn(updateApplicationStatus);
  const setGlobalRole = useServerFn(assignGlobalRole);
  const setRestaurantMember = useServerFn(assignRestaurantMember);
  const dashboard = useQuery({
    queryKey: ["admin-backoffice"],
    queryFn: () => getDashboard(),
    refetchInterval: 15000,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-backoffice"] });
  const applicationMutation = useMutation({
    mutationFn: setApplicationStatus,
    onSuccess: () => {
      toast.success("Candidature traitée.");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const globalRoleMutation = useMutation({
    mutationFn: setGlobalRole,
    onSuccess: () => {
      toast.success("Rôle attribué.");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const memberMutation = useMutation({
    mutationFn: setRestaurantMember,
    onSuccess: () => {
      toast.success("Compte associé au restaurant.");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  if (dashboard.isLoading)
    return <p className="mx-auto max-w-6xl px-4 py-12">Chargement de l’administration…</p>;
  if (dashboard.error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Administration</h1>
        <p role="alert" className="mt-4 text-destructive">
          {dashboard.error.message}
        </p>
      </div>
    );
  if (!dashboard.data) return null;

  const { applications, restaurants, orders, roles } = dashboard.data;
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const pending = applications.filter((application) => application.status === "en_attente");

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
      <div>
        <p className="text-sm font-semibold text-primary">Espace plateforme</p>
        <h1 className="mt-1 text-3xl font-bold">Administration RestoClik</h1>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Restaurants" value={restaurants.length} />
        <Metric label="Commandes enregistrées" value={orders.length} />
        <Metric label="Volume total des commandes" value={formatFCFA(revenue)} />
        <Metric label="Candidatures en attente" value={pending.length} />
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Candidatures</h2>
            <p className="text-sm text-muted-foreground">
              Le statut est modifié uniquement par l’administration.
            </p>
          </div>
          <button
            onClick={() => refresh()}
            className="rounded-full border px-4 py-2 text-sm font-semibold"
          >
            Actualiser
          </button>
        </div>
        {!applications.length ? (
          <p className="mt-4 rounded-2xl border bg-card p-5 text-muted-foreground">
            Aucune candidature.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border bg-card">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-secondary/60">
                <tr>
                  {["Type", "Nom", "E-mail", "Téléphone", "Détails", "Statut", "Actions"].map(
                    (title) => (
                      <th key={title} className="px-4 py-3 font-semibold">
                        {title}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td className="px-4 py-3">
                      {application.kind === "partenaire" ? "Restaurant" : "Livreur"}
                    </td>
                    <td className="px-4 py-3">{application.name}</td>
                    <td className="px-4 py-3">
                      {application.email ? (
                        <a className="text-primary underline" href={`mailto:${application.email}`}>
                          {application.email}
                        </a>
                      ) : (
                        "Non renseigné"
                      )}
                    </td>
                    <td className="px-4 py-3">{application.phone}</td>
                    <td className="px-4 py-3">{application.detail}</td>
                    <td className="px-4 py-3">{application.status}</td>
                    <td className="px-4 py-3">
                      {application.status === "en_attente" ? (
                        <div className="flex gap-2">
                          <button
                            disabled={applicationMutation.isPending}
                            onClick={() =>
                              applicationMutation.mutate({
                                data: { applicationId: application.id, status: "acceptee" },
                              })
                            }
                            className="rounded-full bg-primary-deep px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                          >
                            Accepter
                          </button>
                          <button
                            disabled={applicationMutation.isPending}
                            onClick={() =>
                              applicationMutation.mutate({
                                data: { applicationId: application.id, status: "refusee" },
                              })
                            }
                            className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                          >
                            Refuser
                          </button>
                        </div>
                      ) : application.status === "acceptee" ? (
                        <div className="flex flex-wrap gap-2">
                          {application.email && (
                            <a
                              className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary-deep"
                              href={`mailto:${application.email}`}
                              onClick={(event) => {
                                event.preventDefault();
                                window.location.href = acceptedApplicationMailto(application);
                              }}
                            >
                              Préparer l’e-mail
                            </a>
                          )}
                          <a
                            className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                            href={`tel:${application.phone.replace(/[^\d+]/g, "")}`}
                          >
                            Appeler
                          </a>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form
          className="space-y-4 rounded-2xl border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            globalRoleMutation.mutate({ data: globalRoleForm });
          }}
        >
          <div>
            <h2 className="text-xl font-bold">Attribuer un rôle global</h2>
            <p className="text-sm text-muted-foreground">
              Recherche exacte d’un compte existant par e-mail.
            </p>
          </div>
          <input
            className="input"
            type="email"
            required
            maxLength={254}
            placeholder="E-mail du compte"
            value={globalRoleForm.email}
            onChange={(e) => setGlobalRoleForm({ ...globalRoleForm, email: e.target.value })}
          />
          <select
            className="input"
            value={globalRoleForm.role}
            onChange={(e) =>
              setGlobalRoleForm({
                ...globalRoleForm,
                role: e.target.value as typeof globalRoleForm.role,
              })
            }
          >
            <option value="livreur">Livreur</option>
            <option value="admin">Administrateur</option>
            <option value="client">Client</option>
          </select>
          <button
            disabled={globalRoleMutation.isPending}
            className="w-full rounded-full bg-primary-deep py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
          >
            Attribuer le rôle
          </button>
        </form>

        <form
          className="space-y-4 rounded-2xl border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            memberMutation.mutate({ data: memberForm });
          }}
        >
          <div>
            <h2 className="text-xl font-bold">Associer un membre à un restaurant</h2>
            <p className="text-sm text-muted-foreground">
              L’association est vérifiée côté serveur avant chaque accès restaurateur.
            </p>
          </div>
          <input
            className="input"
            type="email"
            required
            maxLength={254}
            placeholder="E-mail du compte existant"
            value={memberForm.email}
            onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
          />
          <select
            className="input"
            required
            value={memberForm.restaurantId}
            onChange={(e) => setMemberForm({ ...memberForm, restaurantId: e.target.value })}
          >
            <option value="">Choisir un restaurant</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={memberForm.role}
            onChange={(e) =>
              setMemberForm({ ...memberForm, role: e.target.value as typeof memberForm.role })
            }
          >
            <option value="responsable_restaurant">Responsable restaurant</option>
            <option value="cuisinier">Cuisinier</option>
          </select>
          <button
            disabled={memberMutation.isPending}
            className="w-full rounded-full bg-primary-deep py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
          >
            Associer le compte
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Rôles globaux existants</h2>
        {!roles.length ? (
          <p className="mt-4 rounded-2xl border bg-card p-5 text-muted-foreground">
            Aucun rôle explicite enregistré.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((item, index) => (
              <li
                key={`${item.user_id}-${item.role}-${index}`}
                className="rounded-xl border bg-card p-4 text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground">{item.user_id}</span>
                <p className="mt-1 font-semibold">{item.role}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
