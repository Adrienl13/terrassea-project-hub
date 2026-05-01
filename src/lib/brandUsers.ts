// ============================================================================
// Brand users — domain types, zod schemas, defaults, helpers
// Created during chantier Modèle B variants — ÉTAPE 5 (2026-05-01).
//
// Companion DB table: public.brand_users (migration
// 20260501131806_create_brand_users_and_helpers).
//
// brand_users is the M:N table between auth.users and partners (sémantiquement
// "brand owner"). Each row carries a role (owner/editor/viewer) which gates
// RLS access on products / product_variants / product_media via the
// SECURITY DEFINER helpers public.is_brand_member / public.is_brand_owner.
// ============================================================================

import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// ── Re-exports of supabase types under semantic names ───────────────────────

export type DBBrandUser = Database["public"]["Tables"]["brand_users"]["Row"];
export type DBBrandUserInsert = Database["public"]["Tables"]["brand_users"]["Insert"];
export type DBBrandUserUpdate = Database["public"]["Tables"]["brand_users"]["Update"];

// ── Role enum (mirrors DB CHECK constraint) ─────────────────────────────────

export const BRAND_USER_ROLES = ["owner", "editor", "viewer"] as const;
export type BrandUserRole = (typeof BRAND_USER_ROLES)[number];

/**
 * Roles that allow write access on owned brand resources (products / variants
 * / media). Matches the SQL helper public.is_brand_member().
 */
export const WRITE_ACCESS_ROLES: ReadonlySet<BrandUserRole> = new Set(["owner", "editor"]);

/**
 * Roles allowed to DELETE on owned brand resources. Matches the SQL helper
 * public.is_brand_owner(). Strict: only owner.
 */
export const DELETE_ACCESS_ROLES: ReadonlySet<BrandUserRole> = new Set(["owner"]);

// ── Draft schema (client-side validation) ────────────────────────────────────

export const brandUserDraftSchema = z.object({
  brand_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: z.enum(BRAND_USER_ROLES),
  granted_by: z.string().uuid().nullable().optional(),
});

export type BrandUserDraft = z.infer<typeof brandUserDraftSchema>;

// ── Defaults ─────────────────────────────────────────────────────────────────

export function defaultBrandUserDraft(args: {
  brandId: string;
  userId: string;
  role?: BrandUserRole;
  grantedBy?: string;
}): BrandUserDraft {
  return {
    brand_id: args.brandId,
    user_id: args.userId,
    role: args.role ?? "editor",
    granted_by: args.grantedBy ?? null,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the role grants write access (INSERT/UPDATE) on owned
 * resources. Mirrors the SQL is_brand_member predicate.
 */
export function canWriteAsRole(role: BrandUserRole | null | undefined): boolean {
  return role != null && WRITE_ACCESS_ROLES.has(role);
}

/**
 * Returns true if the role grants DELETE access on owned resources. Mirrors
 * the SQL is_brand_owner predicate (strict).
 */
export function canDeleteAsRole(role: BrandUserRole | null | undefined): boolean {
  return role != null && DELETE_ACCESS_ROLES.has(role);
}

/** Best-effort role lookup for a (brand, user) pair from a list. */
export function findUserRoleInBrand<T extends Pick<DBBrandUser, "brand_id" | "user_id" | "role">>(
  brandUsers: readonly T[],
  brandId: string,
  userId: string,
): BrandUserRole | null {
  const match = brandUsers.find((bu) => bu.brand_id === brandId && bu.user_id === userId);
  return (match?.role as BrandUserRole | undefined) ?? null;
}
