import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, Clock3, MapPin, PackageCheck, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  claimDeliveryOrder,
  completeDeliveryOrder,
  getDriverDashboard,
} from "@/lib/backoffice.functions";
import { formatFCFA } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/livreur-dashboard")({
  head: () => ({ meta: [{ title: "Mes courses — RestoClik" }] }),
  component: DriverDashboard,
});

function DriverDashboard() {
  const queryClient = useQueryClient();
  const getDashboard = useServerFn(getDriverDashboard);
  const claimOrder = useServerFn(claimDeliveryOrder);
  const completeOrder = useServerFn(completeDeliveryOrder);
  const dashboard = useQuery({
    queryKey: ["driver-dashboard"],
    queryFn: () => getDashboard(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["driver-dashboard"] });
  const claimMutation = useMutation({
    mutationFn: claimOrder,
    onSuccess: () => {
      toast.success("Course attribuée à votre compte.");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const completeMutation = useMutation({
    mutationFn: completeOrder,
    onSuccess: () => {
      toast.success("Livraison confirmée.");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  if (dashboard.isLoading)
    return <p className="mx-auto max-w-5xl px-4 py-12">Chargement de vos courses…</p>;
  if (dashboard.error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Espace livreur</h1>
        <p role="alert" className="mt-4 text-destructive">
          {dashboard.error.message}
        </p>
        <Link to="/profil" className="mt-4 inline-block text-primary underline">
          Retour au profil
        </Link>
      </div>
    );
  if (!dashboard.data) return null;

  const activeDeliveries = dashboard.data.assigned.filter(
    (order) => order.status === "en_livraison",
  );
  const completedDeliveries = dashboard.data.assigned.filter((order) => order.status === "livree");

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Espace professionnel</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold">
            <Bike aria-hidden="true" className="size-8" />
            Mes courses
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Les courses prêtes sont actualisées automatiquement toutes les 5 secondes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refresh()}
          className="rounded-full border px-4 py-2 text-sm font-semibold"
        >
          Actualiser
        </button>
      </header>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-2xl font-bold">Courses disponibles</h2>
          <span className="text-sm text-muted-foreground">{dashboard.data.available.length}</span>
        </div>
        {!dashboard.data.available.length ? (
          <p className="mt-4 rounded-2xl border bg-card p-6 text-muted-foreground">
            Aucune course prête pour le moment. Revenez dans quelques instants.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {dashboard.data.available.map((order) => (
              <li key={order.id}>
                <DeliveryCard
                  order={order}
                  action={
                    <button
                      type="button"
                      disabled={claimMutation.isPending}
                      onClick={() => claimMutation.mutate({ data: { orderId: order.id } })}
                      className="w-full rounded-full bg-primary-deep px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {claimMutation.isPending ? "Attribution…" : "Prendre cette course"}
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-2xl font-bold">Mes livraisons en cours</h2>
          <span className="text-sm text-muted-foreground">{activeDeliveries.length}</span>
        </div>
        {!activeDeliveries.length ? (
          <p className="mt-4 rounded-2xl border bg-card p-6 text-muted-foreground">
            Vous n’avez aucune livraison en cours.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {activeDeliveries.map((order) => (
              <li key={order.id}>
                <DeliveryCard
                  order={order}
                  action={
                    <button
                      type="button"
                      disabled={completeMutation.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Confirmer que la commande ${order.code} a été livrée au client ?`,
                          )
                        ) {
                          completeMutation.mutate({ data: { orderId: order.id } });
                        }
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-primary-deep px-5 py-3 font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      <PackageCheck aria-hidden="true" className="size-5" />
                      Confirmer la livraison
                    </button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {completedDeliveries.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold">Livraisons terminées</h2>
          <ul className="mt-4 space-y-3">
            {completedDeliveries.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4"
              >
                <div>
                  <p className="font-semibold">
                    {order.code} · {order.restaurant_name}
                  </p>
                  <p className="text-sm text-muted-foreground">Client : {order.customer_name}</p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-primary-deep">
                  Livrée
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type Delivery = {
  id: string;
  code: string;
  restaurant_name: string;
  customer_name: string;
  customer_phone: string;
  address: string | null;
  delivery_fee: number;
  total: number;
  created_at: string;
};

function DeliveryCard({ order, action }: { order: Delivery; action: React.ReactNode }) {
  const mapsUrl = order.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.address}, Ziguinchor`)}`
    : null;

  return (
    <article className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold">{order.code}</p>
          <p className="text-sm text-muted-foreground">{order.restaurant_name}</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary-deep">
          <Clock3 aria-hidden="true" className="size-3" />
          {new Date(order.created_at).toLocaleString("fr-FR")}
        </span>
      </div>
      <dl className="my-4 space-y-3 border-y py-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Client</dt>
          <dd className="font-semibold">{order.customer_name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Téléphone</dt>
          <dd>
            <a
              className="inline-flex items-center gap-1 font-semibold text-primary underline"
              href={`tel:${order.customer_phone.replace(/[^\d+]/g, "")}`}
            >
              <Phone aria-hidden="true" className="size-4" />
              {order.customer_phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Adresse de livraison</dt>
          <dd>
            {mapsUrl ? (
              <a
                className="inline-flex items-center gap-1 font-semibold text-primary underline"
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin aria-hidden="true" className="size-4" />
                {order.address}
              </a>
            ) : (
              "Adresse non renseignée"
            )}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Frais de livraison</dt>
          <dd className="font-semibold">{formatFCFA(order.delivery_fee)}</dd>
        </div>
      </dl>
      <div className="mt-auto">{action}</div>
    </article>
  );
}
