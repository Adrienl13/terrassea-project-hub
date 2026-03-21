import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── Types ──────────────────────────────────────────────────────────────────────

type EntityType = "product" | "partner" | "architect";

export interface FavouritePartner {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  plan: string | null;
  logoUrl: string | null;
  specialtyTags: string[];
  avgRating: number | null;
  totalRatings: number;
}

export interface FavouriteArchitect {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  email: string;
}

// ── Core favourites hook ───────────────────────────────────────────────────────

function useFavouritesDB(entityType: EntityType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favouriteIds = [] } = useQuery({
    queryKey: ["favourites", entityType, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase
        .from("user_favourites" as any)
        .select("entity_id")
        .eq("user_id", user.id)
        .eq("entity_type", entityType) as any);
      if (error) {
        console.error("Failed to fetch favourites:", error.message);
        return [];
      }
      return (data || []).map((r: any) => r.entity_id as string);
    },
    enabled: !!user,
  });

  const toggleMutation = useMutation({
    mutationFn: async (entityId: string) => {
      if (!user) throw new Error("Not authenticated");
      const isFav = favouriteIds.includes(entityId);
      if (isFav) {
        const { error } = await (supabase
          .from("user_favourites" as any)
          .delete()
          .eq("user_id", user.id)
          .eq("entity_type", entityType)
          .eq("entity_id", entityId) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from("user_favourites" as any)
          .insert({ user_id: user.id, entity_type: entityType, entity_id: entityId }) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favourites", entityType, user?.id] });
    },
  });

  return {
    favouriteIds,
    isFavourite: (id: string) => favouriteIds.includes(id),
    toggle: (id: string) => toggleMutation.mutate(id),
    count: favouriteIds.length,
  };
}

// ── Partner favourites with full data ──────────────────────────────────────────

export function useFavouritePartners() {
  const { user } = useAuth();
  const { favouriteIds, isFavourite, toggle, count } = useFavouritesDB("partner");

  const { data: partners = [] } = useQuery({
    queryKey: ["favourite-partners-data", favouriteIds],
    queryFn: async () => {
      if (favouriteIds.length === 0) return [];
      const { data, error: partnersError } = await (supabase
        .from("partners" as any)
        .select("id, name, slug, country, country_code, city, plan, logo_url, specialty_tags")
        .in("id", favouriteIds) as any);
      if (partnersError) {
        console.error("Failed to fetch favourite partners:", partnersError.message);
        return [];
      }

      // Fetch ratings
      const { data: ratings, error: ratingsError } = await (supabase
        .from("partner_ratings_summary" as any)
        .select("*")
        .in("partner_id", favouriteIds) as any);
      if (ratingsError) console.error("Failed to fetch partner ratings:", ratingsError.message);
      const ratingMap: Record<string, any> = {};
      (ratings || []).forEach((r: any) => { ratingMap[r.partner_id] = r; });

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        country: p.country,
        countryCode: p.country_code,
        city: p.city,
        plan: p.plan,
        logoUrl: p.logo_url,
        specialtyTags: p.specialty_tags || [],
        avgRating: ratingMap[p.id]?.avg_rating ? Number(ratingMap[p.id].avg_rating) : null,
        totalRatings: ratingMap[p.id]?.total_ratings || 0,
      })) as FavouritePartner[];
    },
    enabled: favouriteIds.length > 0,
  });

  return { partners, favouriteIds, isFavourite, toggle, count };
}

// ── Architect favourites with full data ────────────────────────────────────────

export function useFavouriteArchitects() {
  const { user } = useAuth();
  const { favouriteIds, isFavourite, toggle, count } = useFavouritesDB("architect");

  const { data: architects = [] } = useQuery({
    queryKey: ["favourite-architects-data", favouriteIds],
    queryFn: async () => {
      if (favouriteIds.length === 0) return [];
      const { data, error } = await (supabase
        .from("user_profiles" as any)
        .select("id, first_name, last_name, company, email")
        .in("id", favouriteIds)
        .eq("user_type", "architect") as any);
      if (error) {
        console.error("Failed to fetch favourite architects:", error.message);
        return [];
      }
      return (data || []).map((a: any) => ({
        id: a.id,
        firstName: a.first_name,
        lastName: a.last_name,
        company: a.company,
        email: a.email,
      })) as FavouriteArchitect[];
    },
    enabled: favouriteIds.length > 0,
  });

  return { architects, favouriteIds, isFavourite, toggle, count };
}

// ── Partner rating hook ────────────────────────────────────────────────────────

export function usePartnerRating(partnerId: string) {
  const { data: summary } = useQuery({
    queryKey: ["partner-rating", partnerId],
    queryFn: async () => {
      const { data } = await (supabase
        .from("partner_ratings_summary" as any)
        .select("*")
        .eq("partner_id", partnerId)
        .single() as any);
      return data ? { avg: Number(data.avg_rating), count: data.total_ratings } : { avg: null, count: 0 };
    },
  });
  return summary || { avg: null, count: 0 };
}

// ── All partners with ratings (for admin) ──────────────────────────────────────

export function useAllPartnersAdmin() {
  return useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data: partners, error: partnersError } = await (supabase
        .from("partners" as any)
        .select("*")
        .order("priority_order", { ascending: true }) as any);
      if (partnersError) throw partnersError;

      const { data: ratings, error: ratingsError } = await (supabase
        .from("partner_ratings_summary" as any)
        .select("*") as any);
      if (ratingsError) console.error("Failed to fetch partner ratings:", ratingsError.message);
      const ratingMap: Record<string, any> = {};
      (ratings || []).forEach((r: any) => { ratingMap[r.partner_id] = r; });

      return (partners || []).map((p: any) => ({
        ...p,
        avgRating: ratingMap[p.id]?.avg_rating ? Number(ratingMap[p.id].avg_rating) : null,
        totalRatings: ratingMap[p.id]?.total_ratings || 0,
      }));
    },
  });
}
