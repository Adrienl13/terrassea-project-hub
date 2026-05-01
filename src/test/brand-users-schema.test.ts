// Tests for src/lib/brandUsers.ts — chantier Modèle B variants ÉTAPE 5.
// Validates the zod draft schema, role enum, and access predicate helpers
// that mirror the SQL helpers public.is_brand_member / public.is_brand_owner.

import { describe, it, expect } from "vitest";
import {
  brandUserDraftSchema,
  defaultBrandUserDraft,
  canWriteAsRole,
  canDeleteAsRole,
  findUserRoleInBrand,
  BRAND_USER_ROLES,
  WRITE_ACCESS_ROLES,
  DELETE_ACCESS_ROLES,
  type DBBrandUser,
} from "@/lib/brandUsers";

const BRAND_UUID = "11111111-1111-4111-8111-111111111111";
const USER_UUID = "22222222-2222-4222-8222-222222222222";
const OTHER_USER_UUID = "33333333-3333-4333-8333-333333333333";

describe("brandUserDraftSchema", () => {
  it("accepts a valid draft with role 'owner'", () => {
    const draft = defaultBrandUserDraft({
      brandId: BRAND_UUID, userId: USER_UUID, role: "owner",
    });
    expect(brandUserDraftSchema.safeParse(draft).success).toBe(true);
  });

  it("accepts every BRAND_USER_ROLES value", () => {
    for (const role of BRAND_USER_ROLES) {
      const result = brandUserDraftSchema.safeParse({
        brand_id: BRAND_UUID, user_id: USER_UUID, role,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an unknown role", () => {
    const result = brandUserDraftSchema.safeParse({
      brand_id: BRAND_UUID, user_id: USER_UUID, role: "superadmin",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid brand_id or user_id", () => {
    expect(
      brandUserDraftSchema.safeParse({
        brand_id: "not-a-uuid", user_id: USER_UUID, role: "owner",
      }).success,
    ).toBe(false);
    expect(
      brandUserDraftSchema.safeParse({
        brand_id: BRAND_UUID, user_id: "not-a-uuid", role: "owner",
      }).success,
    ).toBe(false);
  });

  it("granted_by is optional and accepts null", () => {
    expect(
      brandUserDraftSchema.safeParse({
        brand_id: BRAND_UUID, user_id: USER_UUID, role: "editor", granted_by: null,
      }).success,
    ).toBe(true);
  });
});

describe("defaultBrandUserDraft", () => {
  it("defaults role to 'editor'", () => {
    const d = defaultBrandUserDraft({ brandId: BRAND_UUID, userId: USER_UUID });
    expect(d.role).toBe("editor");
  });

  it("respects explicit role and grantedBy", () => {
    const d = defaultBrandUserDraft({
      brandId: BRAND_UUID, userId: USER_UUID, role: "viewer", grantedBy: OTHER_USER_UUID,
    });
    expect(d.role).toBe("viewer");
    expect(d.granted_by).toBe(OTHER_USER_UUID);
  });
});

describe("canWriteAsRole — mirrors public.is_brand_member SQL helper", () => {
  it("grants write access to owner and editor", () => {
    expect(canWriteAsRole("owner")).toBe(true);
    expect(canWriteAsRole("editor")).toBe(true);
  });

  it("denies write access to viewer", () => {
    expect(canWriteAsRole("viewer")).toBe(false);
  });

  it("denies write access for null/undefined (non-member)", () => {
    expect(canWriteAsRole(null)).toBe(false);
    expect(canWriteAsRole(undefined)).toBe(false);
  });
});

describe("canDeleteAsRole — mirrors public.is_brand_owner SQL helper (strict)", () => {
  it("grants DELETE access to owner only", () => {
    expect(canDeleteAsRole("owner")).toBe(true);
  });

  it("denies DELETE access to editor and viewer", () => {
    expect(canDeleteAsRole("editor")).toBe(false);
    expect(canDeleteAsRole("viewer")).toBe(false);
  });

  it("denies DELETE access for null/undefined", () => {
    expect(canDeleteAsRole(null)).toBe(false);
    expect(canDeleteAsRole(undefined)).toBe(false);
  });
});

describe("findUserRoleInBrand", () => {
  const stubBu = (overrides: Partial<DBBrandUser> = {}): DBBrandUser =>
    ({
      id: "bu1",
      brand_id: BRAND_UUID,
      user_id: USER_UUID,
      role: "owner",
      granted_at: "2026-05-01T00:00:00Z",
      granted_by: null,
      ...overrides,
    }) as DBBrandUser;

  it("returns the role when (brand, user) match", () => {
    const list = [stubBu({ id: "a", role: "owner" })];
    expect(findUserRoleInBrand(list, BRAND_UUID, USER_UUID)).toBe("owner");
  });

  it("returns null when user is not in brand", () => {
    const list = [stubBu({ user_id: OTHER_USER_UUID, role: "owner" })];
    expect(findUserRoleInBrand(list, BRAND_UUID, USER_UUID)).toBe(null);
  });

  it("returns null when brand is wrong", () => {
    const list = [stubBu({ brand_id: OTHER_USER_UUID, role: "owner" })];
    expect(findUserRoleInBrand(list, BRAND_UUID, USER_UUID)).toBe(null);
  });
});

describe("Role sets — invariants", () => {
  it("WRITE_ACCESS_ROLES is exactly {owner, editor}", () => {
    expect(WRITE_ACCESS_ROLES.size).toBe(2);
    expect(WRITE_ACCESS_ROLES.has("owner")).toBe(true);
    expect(WRITE_ACCESS_ROLES.has("editor")).toBe(true);
  });

  it("DELETE_ACCESS_ROLES is exactly {owner}", () => {
    expect(DELETE_ACCESS_ROLES.size).toBe(1);
    expect(DELETE_ACCESS_ROLES.has("owner")).toBe(true);
  });

  it("DELETE_ACCESS_ROLES is a strict subset of WRITE_ACCESS_ROLES", () => {
    for (const role of DELETE_ACCESS_ROLES) {
      expect(WRITE_ACCESS_ROLES.has(role)).toBe(true);
    }
  });

  it("BRAND_USER_ROLES contains exactly the 3 expected roles", () => {
    expect([...BRAND_USER_ROLES].sort()).toEqual(["editor", "owner", "viewer"]);
  });
});
