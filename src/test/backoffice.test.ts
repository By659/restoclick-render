import { describe, expect, it } from "vitest";
import { nextRestaurantOrderStatus } from "@/lib/backoffice-domain";

describe("restaurant order workflow", () => {
  it("advances orders through received, accepted, preparing and ready", () => {
    expect(nextRestaurantOrderStatus("en_attente")).toBe("acceptee");
    expect(nextRestaurantOrderStatus("acceptee")).toBe("en_preparation");
    expect(nextRestaurantOrderStatus("en_preparation")).toBe("prete");
  });

  it("does not allow restaurant staff to advance terminal or delivery statuses", () => {
    expect(nextRestaurantOrderStatus("prete")).toBeNull();
    expect(nextRestaurantOrderStatus("en_livraison")).toBeNull();
    expect(nextRestaurantOrderStatus("livree")).toBeNull();
    expect(nextRestaurantOrderStatus("annulee")).toBeNull();
  });
});
