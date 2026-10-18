import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { formatFCFA, imageFor } from "@/lib/data";
import {
  advanceRestaurantOrder,
  getRestaurantBackoffice,
  saveRestaurantDish,
  setRestaurantDishAvailability,
} from "@/lib/backoffice.functions";
import { nextRestaurantOrderStatus, ORDER_STATUS_LABEL } from "@/lib/backoffice-domain";

export const Route = createFileRoute("/_authenticated/restaurateur")({
  head: () => ({ meta: [{ title: "Espace restaurateur — RestoClik" }] }),
  component: RestaurantBackoffice,
});

function RestaurantBackoffice() {
  const [restaurantId, setRestaurantId] = useState("");
  const [dishForm, setDishForm] = useState({
    id: "",
    name: "",
    description: "",
    category: "Plats",
    price: "",
    image_key: "hero",
  });
  const [dishImage, setDishImage] = useState<File | null>(null);
  const [dishImagePreview, setDishImagePreview] = useState("");
  const queryClient = useQueryClient();
  const getDashboard = useServerFn(getRestaurantBackoffice);
  const advanceOrder = useServerFn(advanceRestaurantOrder);
  const saveDish = useServerFn(saveRestaurantDish);
  const setAvailability = useServerFn(setRestaurantDishAvailability);
  const dashboard = useQuery({
    queryKey: ["restaurant-backoffice", restaurantId],
    queryFn: () => getDashboard({ data: { restaurantId: restaurantId || undefined } }),
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!restaurantId && dashboard.data?.restaurant.id)
      setRestaurantId(dashboard.data.restaurant.id);
  }, [restaurantId, dashboard.data?.restaurant.id]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["restaurant-backoffice"] });
  const statusMutation = useMutation({
    mutationFn: advanceOrder,
    onSuccess: () => {
      toast.success("Statut de commande mis à jour.");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const availabilityMutation = useMutation({
    mutationFn: setAvailability,
    onSuccess: () => {
      toast.success("Disponibilité du plat mise à jour.");
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const dishMutation = useMutation({
    mutationFn: saveDish,
    onSuccess: () => {
      toast.success(dishForm.id ? "Plat modifié." : "Plat ajouté.");
      setDishForm({
        id: "",
        name: "",
        description: "",
        category: "Plats",
        price: "",
        image_key: "hero",
      });
      setDishImage(null);
      refresh();
    },
    onError: (error) => toast.error(error.message),
  });

  useEffect(() => {
    if (!dishImage) {
      setDishImagePreview("");
      return;
    }
    const preview = URL.createObjectURL(dishImage);
    setDishImagePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [dishImage]);

  if (dashboard.isLoading)
    return <p className="mx-auto max-w-6xl px-4 py-12">Chargement de votre espace…</p>;
  if (dashboard.error)
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Espace restaurateur</h1>
        <p role="alert" className="mt-4 text-destructive">
          {dashboard.error.message}
        </p>
      </div>
    );
  if (!dashboard.data) return null;

  const { restaurants, restaurant, orders, orderItems, dishes } = dashboard.data;
  const editDish = (dish: (typeof dishes)[number]) => {
    setDishForm({
      id: dish.id,
      name: dish.name,
      description: dish.description,
      category: dish.category,
      price: String(dish.price),
      image_key: dish.image_key,
    });
    setDishImage(null);
  };

  const submitDish = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let image:
      { contentType: "image/jpeg" | "image/png" | "image/webp"; base64: string } | undefined;
    if (dishImage) {
      try {
        if (!["image/jpeg", "image/png", "image/webp"].includes(dishImage.type)) {
          toast.error("Choisissez une image JPEG, PNG ou WebP.");
          return;
        }
        const bytes = new Uint8Array(await dishImage.arrayBuffer());
        let binary = "";
        for (let offset = 0; offset < bytes.length; offset += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        }
        image = {
          contentType: dishImage.type as "image/jpeg" | "image/png" | "image/webp",
          base64: btoa(binary),
        };
      } catch {
        toast.error("Impossible de lire l’image sélectionnée.");
        return;
      }
    }
    dishMutation.mutate({
      data: {
        restaurantId: restaurant.id,
        id: dishForm.id || undefined,
        name: dishForm.name,
        description: dishForm.description,
        category: dishForm.category,
        price: Number(dishForm.price),
        image,
      },
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Espace professionnel</p>
          <h1 className="mt-1 text-3xl font-bold">Cuisine et menu</h1>
        </div>
        {restaurants.length > 1 && (
          <label className="block min-w-56 text-sm">
            <span className="mb-1 block font-medium">Restaurant</span>
            <select
              className="input"
              value={restaurantId}
              onChange={(event) => setRestaurantId(event.target.value)}
            >
              {restaurants.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Commandes — {restaurant.name}</h2>
            <p className="text-sm text-muted-foreground">
              Actualisation automatique toutes les 2 secondes.
            </p>
          </div>
          <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-primary-deep">
            {orders.length} commande{orders.length === 1 ? "" : "s"}
          </span>
        </div>
        {!orders.length ? (
          <p className="mt-5 rounded-2xl border bg-card p-6 text-muted-foreground">
            Aucune commande pour le moment.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orders.map((order) => {
              const items = orderItems.filter((item) => item.order_id === order.id);
              const next = nextRestaurantOrderStatus(order.status);
              return (
                <article
                  key={order.id}
                  className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{order.code}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString("fr-FR")} ·{" "}
                        {order.mode === "livraison" ? "Livraison" : "À emporter"}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary-deep">
                      {ORDER_STATUS_LABEL[order.status]}
                    </span>
                  </div>
                  <p className="mt-4 font-semibold">{order.customer_name}</p>
                  <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                  {order.address && (
                    <p className="text-sm text-muted-foreground">{order.address}</p>
                  )}
                  <ul className="mt-4 space-y-2 border-t pt-3 text-sm">
                    {items.map((item) => (
                      <li key={item.id}>
                        <span className="font-semibold">
                          {item.quantity}× {item.name}
                        </span>
                        {item.options.length > 0 && (
                          <span className="block text-xs text-muted-foreground">
                            {item.options.join(", ")}
                          </span>
                        )}
                        {item.note && (
                          <span className="block text-xs text-muted-foreground">
                            Note : {item.note}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-right font-bold">{formatFCFA(order.total)}</p>
                  {next && (
                    <button
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          data: { restaurantId: restaurant.id, orderId: order.id, status: next },
                        })
                      }
                      className="mt-4 w-full rounded-full bg-primary-deep py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      Passer à « {ORDER_STATUS_LABEL[next]} »
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold">Gestion du menu</h2>
        <form
          className="mt-4 grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={submitDish}
        >
          <h3 className="text-lg font-semibold sm:col-span-2 lg:col-span-3">
            {dishForm.id ? "Modifier un plat" : "Ajouter un plat"}
          </h3>
          <input
            className="input"
            aria-label="Nom du plat"
            placeholder="Nom du plat"
            required
            minLength={2}
            maxLength={100}
            value={dishForm.name}
            onChange={(e) => setDishForm({ ...dishForm, name: e.target.value })}
          />
          <input
            className="input"
            aria-label="Catégorie"
            placeholder="Catégorie"
            required
            minLength={2}
            maxLength={60}
            value={dishForm.category}
            onChange={(e) => setDishForm({ ...dishForm, category: e.target.value })}
          />
          <input
            className="input"
            aria-label="Prix en FCFA"
            type="number"
            min={0}
            step={1}
            required
            placeholder="Prix en FCFA"
            value={dishForm.price}
            onChange={(e) => setDishForm({ ...dishForm, price: e.target.value })}
          />
          <input
            className="input sm:col-span-2 lg:col-span-3"
            aria-label="Description"
            placeholder="Description"
            maxLength={500}
            value={dishForm.description}
            onChange={(e) => setDishForm({ ...dishForm, description: e.target.value })}
          />
          <label className="block text-sm sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block font-medium">
              Photo du plat ou de la boisson (JPEG, PNG ou WebP, 3 Mo maximum)
            </span>
            <input
              key={dishImage ? `${dishImage.name}-${dishImage.lastModified}` : "empty"}
              className="input"
              aria-label="Photo du plat ou de la boisson"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file && file.size > 3 * 1024 * 1024) {
                  toast.error("L’image doit peser 3 Mo maximum.");
                  event.target.value = "";
                  setDishImage(null);
                  return;
                }
                if (file && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                  toast.error("Choisissez une image JPEG, PNG ou WebP.");
                  event.target.value = "";
                  setDishImage(null);
                  return;
                }
                setDishImage(file);
              }}
            />
          </label>
          <img
            className="h-40 w-40 rounded-xl border object-cover"
            src={dishImagePreview || imageFor(dishForm.image_key)}
            alt="Aperçu de la photo du menu"
          />
          <button
            disabled={dishMutation.isPending}
            className="rounded-full bg-primary-deep px-5 py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
          >
            {dishMutation.isPending
              ? "Enregistrement…"
              : dishForm.id
                ? "Enregistrer les modifications"
                : "Ajouter au menu"}
          </button>
          {dishForm.id && (
            <button
              type="button"
              onClick={() => {
                setDishForm({
                  id: "",
                  name: "",
                  description: "",
                  category: "Plats",
                  price: "",
                  image_key: "hero",
                });
                setDishImage(null);
              }}
              className="rounded-full border px-5 py-2.5 font-semibold"
            >
              Annuler
            </button>
          )}
        </form>
        <ul className="mt-4 divide-y rounded-2xl border bg-card">
          {dishes.map((dish) => (
            <li key={dish.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <img
                  className="h-14 w-14 rounded-lg border object-cover"
                  src={imageFor(dish.image_key)}
                  alt=""
                />
                <div>
                  <p className="font-semibold">
                    {dish.name}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {formatFCFA(dish.price)}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {dish.category} · {dish.is_available ? "Disponible" : "Indisponible"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => editDish(dish)}
                  className="rounded-full border px-4 py-2 text-sm font-semibold"
                >
                  Modifier
                </button>
                <button
                  disabled={availabilityMutation.isPending}
                  onClick={() =>
                    availabilityMutation.mutate({
                      data: {
                        restaurantId: restaurant.id,
                        dishId: dish.id,
                        available: !dish.is_available,
                      },
                    })
                  }
                  className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-primary-deep disabled:opacity-60"
                >
                  {dish.is_available ? "Désactiver" : "Activer"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
