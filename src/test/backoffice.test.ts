import { describe, expect, it } from "vitest";
import { nextRestaurantOrderStatus } from "@/lib/backoffice-domain";
import { imageFor } from "@/lib/data";

describe("restaurant order workflow", () => {
  it("advances orders through received, accepted, preparing and ready", () => {
    expect(nextRestaurantOrderStatus("en_attente")).toBe("acceptee");
    expect(nextRestaurantOrderStatus("acceptee")).toBe("en_preparation");
    expect(nextRestaurantOrderStatus("en_preparation")).toBe("prete");
  });

  describe("menu image URLs", () => {
    it("uses uploaded image URLs directly and resolves built-in image keys", () => {
      const uploadedImage =
        "https://example.supabase.co/storage/v1/object/public/dish-images/dish.png";

      expect(imageFor(uploadedImage)).toBe(uploadedImage);
      expect(imageFor("unknown")).toBe(imageFor("hero"));
      expect(imageFor("bissap")).not.toBe(imageFor("yassa"));
    });
  });

  it("does not allow restaurant staff to advance terminal or delivery statuses", () => {
    expect(nextRestaurantOrderStatus("prete")).toBeNull();
    expect(nextRestaurantOrderStatus("en_livraison")).toBeNull();
    expect(nextRestaurantOrderStatus("livree")).toBeNull();
    expect(nextRestaurantOrderStatus("annulee")).toBeNull();
  });
});
