import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpcMock, fromMock, selectMock, eqMock, orderMock, insertMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  orderMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: rpcMock, from: fromMock },
}));

import { computeTotals, myOrdersQuery, placeOrder, submitApplication } from "@/lib/api";

describe("API contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReturnValue({ select: selectMock, insert: insertMock });
    selectMock.mockReturnValue({ eq: eqMock });
    eqMock.mockReturnValue({ order: orderMock });
  });

  it("computes delivery fees for delivery and pickup", () => {
    expect(computeTotals(5000, 700, "livraison")).toMatchObject({
      subtotal: 5000,
      fee: 700,
      total: 5700,
    });
    expect(computeTotals(5000, 700, "emporter")).toMatchObject({
      subtotal: 5000,
      fee: 0,
      total: 5000,
    });
  });

  it("sends the order fields expected by the place_order RPC and returns its result", async () => {
    const result = { id: "order-id", code: "RC-123ABC", total: 5700 };
    rpcMock.mockResolvedValue({ data: [result], error: null });
    const order = {
      restaurantId: "chez-awa",
      mode: "livraison" as const,
      payment: "cash" as const,
      name: "Awa Diop",
      phone: "77 123 45 67",
      address: "Escale, Ziguinchor",
      items: [{ dish_id: "thieb", quantity: 1, options: ["Sauce piment"], note: "Sans oignon" }],
    };

    await expect(placeOrder(order)).resolves.toEqual(result);
    expect(rpcMock).toHaveBeenCalledWith("place_order", {
      _restaurant_id: "chez-awa",
      _mode: "livraison",
      _payment: "cash",
      _name: "Awa Diop",
      _phone: "77 123 45 67",
      _address: "Escale, Ziguinchor",
      _items: [{ dish_id: "thieb", quantity: 1, options: ["Sauce piment"], note: "Sans oignon" }],
    });
  });

  it("does not treat an RPC error or empty response as a successful order", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "Connexion requise" } });
    await expect(
      placeOrder({
        restaurantId: "chez-awa",
        mode: "emporter",
        payment: "cash",
        name: "Awa Diop",
        phone: "77 123 45 67",
        address: "À emporter",
        items: [{ dish_id: "thieb", quantity: 1, options: [] }],
      }),
    ).rejects.toThrow("Connexion requise");

    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await expect(
      placeOrder({
        restaurantId: "chez-awa",
        mode: "emporter",
        payment: "cash",
        name: "Awa Diop",
        phone: "77 123 45 67",
        address: "À emporter",
        items: [{ dish_id: "thieb", quantity: 1, options: [] }],
      }),
    ).rejects.toThrow("Commande non enregistrée.");
  });

  it("filters order history by the supplied authenticated user id", async () => {
    const rows = [{ id: "order-id" }];
    orderMock.mockResolvedValue({ data: rows, error: null });
    const query = myOrdersQuery("user-id");
    const queryFn = query.queryFn;
    if (!queryFn) throw new Error("The order history query is missing its query function.");
    const result = await queryFn({
      client: new QueryClient(),
      queryKey: query.queryKey,
      signal: new AbortController().signal,
      meta: undefined,
    });

    expect(result).toEqual(rows);
    expect(fromMock).toHaveBeenCalledWith("orders");
    expect(selectMock).toHaveBeenCalledWith(
      "id, code, restaurant_name, status, total, mode, created_at, order_items(name, quantity, unit_price)",
    );
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-id");
    expect(orderMock).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("persists validated applications through Supabase", async () => {
    insertMock.mockResolvedValue({ error: null });

    await submitApplication({
      kind: "livreur",
      name: "Moussa Fall",
      phone: "77 123 45 67",
      detail: "Moto",
      userId: "user-id",
    });

    expect(fromMock).toHaveBeenCalledWith("applications");
    expect(insertMock).toHaveBeenCalledWith({
      kind: "livreur",
      name: "Moussa Fall",
      phone: "77 123 45 67",
      detail: "Moto",
      user_id: "user-id",
    });
  });
});
