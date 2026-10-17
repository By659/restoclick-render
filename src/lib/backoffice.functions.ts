import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { nextRestaurantOrderStatus, type OrderStatus } from "./backoffice-domain";

const restaurantIdSchema = z.string().trim().min(1).max(120);

async function getAdminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function isPlatformAdmin(db: Awaited<ReturnType<typeof getAdminClient>>, userId: string) {
  const { data, error } = await db
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Impossible de vérifier les droits administrateur.");
  return !!data;
}

async function getAccessibleRestaurants(
  db: Awaited<ReturnType<typeof getAdminClient>>,
  userId: string,
) {
  const admin = await isPlatformAdmin(db, userId);
  if (admin) {
    const { data, error } = await db.from("restaurants").select("id, name").order("name");
    if (error) throw new Error("Impossible de charger les restaurants.");
    return { admin, restaurants: data ?? [] };
  }

  const { data: memberships, error: membershipError } = await db
    .from("restaurant_members")
    .select("restaurant_id, role")
    .eq("user_id", userId)
    .in("role", ["responsable_restaurant", "cuisinier"]);
  if (membershipError) throw new Error("Impossible de vérifier vos restaurants.");
  const ids = [...new Set((memberships ?? []).map((membership) => membership.restaurant_id))];
  if (!ids.length) throw new Error("Aucun restaurant ne vous est attribué.");

  const { data, error } = await db
    .from("restaurants")
    .select("id, name")
    .in("id", ids)
    .order("name");
  if (error) throw new Error("Impossible de charger vos restaurants.");
  return { admin, restaurants: data ?? [] };
}

export const getRestaurantBackoffice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ restaurantId: restaurantIdSchema.optional() }))
  .handler(async ({ data, context }) => {
    const db = await getAdminClient();
    const { restaurants } = await getAccessibleRestaurants(db, context.userId);
    const restaurant = data.restaurantId
      ? restaurants.find((item) => item.id === data.restaurantId)
      : restaurants[0];
    if (!restaurant) throw new Error("Accès refusé à ce restaurant.");

    const { data: orders, error: ordersError } = await db
      .from("orders")
      .select(
        "id, code, status, mode, payment_method, customer_name, customer_phone, address, subtotal, delivery_fee, total, created_at",
      )
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: true })
      .limit(100);
    if (ordersError) throw new Error("Impossible de charger les commandes.");

    const orderIds = (orders ?? []).map((order) => order.id);
    let orderItems: {
      id: string;
      order_id: string;
      name: string;
      quantity: number;
      unit_price: number;
      options: string[];
      note: string | null;
    }[] = [];
    if (orderIds.length) {
      const { data, error } = await db
        .from("order_items")
        .select("id, order_id, name, quantity, unit_price, options, note")
        .in("order_id", orderIds);
      if (error) throw new Error("Impossible de charger les articles commandés.");
      orderItems = data ?? [];
    }

    const { data: dishes, error: dishesError } = await db
      .from("dishes")
      .select("id, name, description, price, category, image_key, is_available, sort")
      .eq("restaurant_id", restaurant.id)
      .order("sort");
    if (dishesError) throw new Error("Impossible de charger le menu.");

    return { restaurants, restaurant, orders: orders ?? [], orderItems, dishes: dishes ?? [] };
  });

const orderStatusSchema = z.enum([
  "en_attente",
  "acceptee",
  "en_preparation",
  "prete",
  "en_livraison",
  "livree",
  "annulee",
]);

export const advanceRestaurantOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      restaurantId: restaurantIdSchema,
      orderId: z.string().uuid(),
      status: orderStatusSchema,
    }),
  )
  .handler(async ({ data, context }) => {
    const db = await getAdminClient();
    const { restaurants } = await getAccessibleRestaurants(db, context.userId);
    if (!restaurants.some((restaurant) => restaurant.id === data.restaurantId)) {
      throw new Error("Accès refusé à ce restaurant.");
    }

    const { data: order, error: orderError } = await db
      .from("orders")
      .select("status")
      .eq("id", data.orderId)
      .eq("restaurant_id", data.restaurantId)
      .maybeSingle();
    if (orderError) throw new Error("Impossible de vérifier cette commande.");
    if (!order) throw new Error("Commande introuvable.");

    const nextStatus = nextRestaurantOrderStatus(order.status as OrderStatus);
    if (data.status !== nextStatus) throw new Error("Transition de statut non autorisée.");

    const { error } = await db
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.orderId)
      .eq("restaurant_id", data.restaurantId);
    if (error) throw new Error("Impossible de mettre à jour la commande.");
    return { success: true };
  });

const dishSchema = z.object({
  restaurantId: restaurantIdSchema,
  id: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500),
  category: z.string().trim().min(2).max(60),
  price: z.number().int().min(0).max(10_000_000),
  image_key: z.enum(["hero", "yassa", "dibi", "burger"]),
});

export const saveRestaurantDish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(dishSchema)
  .handler(async ({ data, context }) => {
    const db = await getAdminClient();
    const { restaurants } = await getAccessibleRestaurants(db, context.userId);
    if (!restaurants.some((restaurant) => restaurant.id === data.restaurantId)) {
      throw new Error("Accès refusé à ce restaurant.");
    }

    const values = {
      name: data.name,
      description: data.description,
      category: data.category,
      price: data.price,
      image_key: data.image_key,
    };

    if (data.id) {
      const { data: updated, error } = await db
        .from("dishes")
        .update(values)
        .eq("id", data.id)
        .eq("restaurant_id", data.restaurantId)
        .select("id")
        .maybeSingle();
      if (error) throw new Error("Impossible de modifier ce plat.");
      if (!updated) throw new Error("Plat introuvable pour ce restaurant.");
      return { id: updated.id };
    }

    const { data: created, error } = await db
      .from("dishes")
      .insert({
        id: `dish-${crypto.randomUUID()}`,
        restaurant_id: data.restaurantId,
        ...values,
      })
      .select("id")
      .single();
    if (error) throw new Error("Impossible d’ajouter ce plat.");
    return { id: created.id };
  });

export const setRestaurantDishAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      restaurantId: restaurantIdSchema,
      dishId: z.string().trim().min(1).max(120),
      available: z.boolean(),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = await getAdminClient();
    const { restaurants } = await getAccessibleRestaurants(db, context.userId);
    if (!restaurants.some((restaurant) => restaurant.id === data.restaurantId)) {
      throw new Error("Accès refusé à ce restaurant.");
    }

    const { data: updated, error } = await db
      .from("dishes")
      .update({ is_available: data.available })
      .eq("id", data.dishId)
      .eq("restaurant_id", data.restaurantId)
      .select("id")
      .maybeSingle();
    if (error) throw new Error("Impossible de modifier la disponibilité du plat.");
    if (!updated) throw new Error("Plat introuvable pour ce restaurant.");
    return { success: true };
  });

export const getAdminBackoffice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await getAdminClient();
    if (!(await isPlatformAdmin(db, context.userId)))
      throw new Error("Accès réservé à l’administration.");

    const [applicationsResult, restaurantsResult, ordersResult, rolesResult] = await Promise.all([
      db
        .from("applications")
        .select("id, kind, user_id, name, phone, detail, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      db.from("restaurants").select("id, name").order("name"),
      db.from("orders").select("id, status, total, created_at"),
      db.from("user_roles").select("user_id, role").order("role"),
    ]);
    if (applicationsResult.error) throw new Error("Impossible de charger les candidatures.");
    if (restaurantsResult.error) throw new Error("Impossible de charger les restaurants.");
    if (ordersResult.error) throw new Error("Impossible de calculer les indicateurs.");
    if (rolesResult.error) throw new Error("Impossible de charger les rôles.");

    return {
      applications: applicationsResult.data ?? [],
      restaurants: restaurantsResult.data ?? [],
      orders: ordersResult.data ?? [],
      roles: rolesResult.data ?? [],
    };
  });

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      applicationId: z.string().uuid(),
      status: z.enum(["acceptee", "refusee"]),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = await getAdminClient();
    if (!(await isPlatformAdmin(db, context.userId)))
      throw new Error("Accès réservé à l’administration.");

    const { data: updated, error } = await db
      .from("applications")
      .update({ status: data.status })
      .eq("id", data.applicationId)
      .select("id")
      .maybeSingle();
    if (error) throw new Error("Impossible de traiter cette candidature.");
    if (!updated) throw new Error("Candidature introuvable.");
    return { success: true };
  });

async function findUserIdByEmail(db: Awaited<ReturnType<typeof getAdminClient>>, email: string) {
  const { data, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error("Impossible de rechercher ce compte.");
  const user = data.users.find(
    (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!user) throw new Error("Aucun compte trouvé pour cette adresse.");
  return user.id;
}

export const assignGlobalRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      email: z.string().trim().email().max(254),
      role: z.enum(["admin", "client", "livreur"]),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = await getAdminClient();
    if (!(await isPlatformAdmin(db, context.userId)))
      throw new Error("Accès réservé à l’administration.");
    const userId = await findUserIdByEmail(db, data.email);
    const { error } = await db
      .from("user_roles")
      .upsert({ user_id: userId, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error("Impossible d’attribuer ce rôle.");
    return { success: true };
  });

export const assignRestaurantMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      email: z.string().trim().email().max(254),
      restaurantId: restaurantIdSchema,
      role: z.enum(["responsable_restaurant", "cuisinier"]),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = await getAdminClient();
    if (!(await isPlatformAdmin(db, context.userId)))
      throw new Error("Accès réservé à l’administration.");

    const { data: restaurant, error: restaurantError } = await db
      .from("restaurants")
      .select("id")
      .eq("id", data.restaurantId)
      .maybeSingle();
    if (restaurantError) throw new Error("Impossible de vérifier le restaurant.");
    if (!restaurant) throw new Error("Restaurant introuvable.");

    const userId = await findUserIdByEmail(db, data.email);
    const { error } = await db
      .from("restaurant_members")
      .upsert(
        { restaurant_id: data.restaurantId, user_id: userId, role: data.role },
        { onConflict: "restaurant_id,user_id" },
      );
    if (error) throw new Error("Impossible d’associer ce compte au restaurant.");
    return { success: true };
  });
